#!/usr/bin/env python3
"""
Tile Catalog PDF Extractor

Extracts product data from multi-product grid PDF catalogs:
  - Renders each page
  - Detects grid cells (product entries)
  - Crops product images
  - OCRs SKUs and metadata from text regions
  - Outputs a ZIP with normalized product database + images + AI prompts

Usage:
  python scripts/extract_catalog.py catalog.pdf -o output.zip
  python scripts/extract_catalog.py catalog.pdf -o output.zip --dpi 300 --lang eng
"""

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
import zipfile
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import pytesseract
from PIL import Image

pytesseract.pytesseract.tesseract_cmd = "tesseract"

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

SKU_PATTERN = re.compile(
    r"([A-Z]{2,8}(?:[-_][A-Z0-9]{1,6})?[-_]\d{2,6})|(\d{3,6}[A-Z]{2,6})|((?<!\d)[A-Z]{1,3}\d{3,6}[A-Z]?)",
    re.IGNORECASE,
)


@dataclass
class ReferenceData:
    """Known product patterns from existing tiles to guide extraction."""
    brand_keywords: dict[str, list[str]] = field(default_factory=lambda: {
        'goodwill': ['goodwill', 'good will', 'gw'],
        'crown_crane': ['crown crane', 'crown', 'crane'],
    })
    series_names: list[str] = field(default_factory=list)
    known_skus: set[str] = field(default_factory=set)
    sku_prefixes: set[str] = field(default_factory=set)
    dimension_patterns: set[str] = field(default_factory=set)
    known_dimensions: list[str] = field(default_factory=list)
    known_categories: set[str] = field(default_factory=lambda: {
        'wall', 'floor', 'bathroom', 'kitchen', 'outdoor', 'mosaic', 'wood', 'stone', 'marble'
    })
    tile_keywords: list[str] = field(default_factory=list)


@dataclass
class ExtractedProduct:
    sku: str = ""
    name: str = ""
    dimensions: str = ""
    pieces_per_carton: int = 0
    category: str = ""
    brand: str = ""
    series: str = ""
    tier: str = ""
    tile_type: str = ""
    finish: str = ""
    thickness: str = ""
    coverage_per_box: str = ""
    use_case: str = ""
    description: str = ""
    page_number: int = 0
    image_filename: str = ""
    image_url: str = ""

    def __post_init__(self):
        self._cached_image = None


@dataclass
class ExtractionResult:
    products: list[ExtractedProduct] = field(default_factory=list)
    total_pages: int = 0
    processed_pages: int = 0
    cells_per_page: list[int] = field(default_factory=list)
    page_errors: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# PDF rendering
# ---------------------------------------------------------------------------

def render_page(pdf_path: str | Path, page_num: int, dpi: int = 300) -> np.ndarray:
    import fitz
    doc = fitz.open(pdf_path)
    page = doc[page_num]
    zoom = dpi / 72
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    doc.close()
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


# ---------------------------------------------------------------------------
# Grid detection (line-projection based)
# ---------------------------------------------------------------------------

def _find_line_peaks(
    projections: np.ndarray, min_gap: int = 30, threshold_ratio: float = 0.15
) -> list[int]:
    """Find indices where projection values exceed a threshold, clustering nearby peaks."""
    threshold = np.max(projections) * threshold_ratio
    above = projections > threshold

    peaks = []
    i = 0
    while i < len(above):
        if above[i]:
            start = i
            while i < len(above) and above[i]:
                i += 1
            peak = (start + i - 1) // 2
            peaks.append(peak)
        else:
            i += 1

    # Merge peaks that are too close
    if not peaks:
        return []
    merged = [peaks[0]]
    for p in peaks[1:]:
        if p - merged[-1] < min_gap:
            merged[-1] = (merged[-1] + p) // 2
        else:
            merged.append(p)
    return merged


def detect_grid_cells(
    page_img: np.ndarray,
    min_cell_area: int = 10000,
    max_cell_area: int | None = None,
    strategy: str = "auto",
) -> list[tuple[int, int, int, int]]:
    """Detect grid cells using multiple strategies.

    Strategies:
      - "line"    : line-projection based on Canny edges
      - "contour" : contour-based on binary threshold
      - "auto"    : try line first, fall back to contour, then retry with lower thresholds
    """
    height, width = page_img.shape[:2]
    if max_cell_area is None:
        max_cell_area = (width * height) // 2

    gray = cv2.cvtColor(page_img, cv2.COLOR_BGR2GRAY)

    strategies = []

    if strategy == "line" or strategy == "auto":
        # Strategy 1: line-projection with standard Canny
        strategies.append(("line_standard", lambda: _grid_by_lines(gray, 50, 150, width, height, min_cell_area, max_cell_area)))
        # Strategy 2: line-projection with lower Canny threshold
        strategies.append(("line_low", lambda: _grid_by_lines(gray, 20, 80, width, height, min_cell_area, max_cell_area)))

    if strategy == "contour" or strategy == "auto":
        # Strategy 3: contour detection
        strategies.append(("contour", lambda: _grid_by_contour(gray, min_cell_area, max_cell_area)))
        # Strategy 4: contour with inverted threshold
        strategies.append(("contour_inv", lambda: _grid_by_contour(gray, min_cell_area, max_cell_area, invert=False)))

    # If auto and still no cells, retry with smaller min_cell_area
    if strategy == "auto":
        reduced = max(2000, min_cell_area // 4)
        strategies.append(("line_small", lambda: _grid_by_lines(gray, 20, 80, width, height, reduced, max_cell_area)))
        strategies.append(("contour_small", lambda: _grid_by_contour(gray, reduced, max_cell_area)))

    for name, fn in strategies:
        cells = fn()
        if cells:
            cells.sort(key=lambda r: (r[1], r[0]))
            return cells

    return []


def _grid_by_lines(
    gray: np.ndarray, low: int, high: int, width: int, height: int,
    min_cell_area: int, max_cell_area: int,
) -> list[tuple[int, int, int, int]]:
    edges = cv2.Canny(gray, low, high, apertureSize=3)

    # Horizontal
    h_proj = np.sum(edges, axis=1)
    h_lines = _find_line_peaks(h_proj, min_gap=max(30, height // 20))
    min_span = int(width * 0.5)
    h_lines = [y for y in h_lines if 0 <= y < height and np.sum(edges[y, :] > 0) > min_span]

    if len(h_lines) < 2:
        return []

    # Vertical
    v_proj = np.sum(edges, axis=0)
    v_lines = _find_line_peaks(v_proj, min_gap=max(30, width // 15))
    min_vspan = int(height * 0.25)
    v_lines = [x for x in v_lines if 0 <= x < width and np.sum(edges[:, x] > 0) > min_vspan]

    if len(v_lines) < 2:
        return []

    cells = []
    for i in range(len(h_lines) - 1):
        for j in range(len(v_lines) - 1):
            y1 = h_lines[i]
            y2 = h_lines[i + 1]
            x1 = v_lines[j]
            x2 = v_lines[j + 1]
            area = (x2 - x1) * (y2 - y1)
            if area < min_cell_area or area > max_cell_area:
                continue
            cells.append((x1, y1, x2, y2))
    return cells


def _grid_by_contour(
    gray: np.ndarray, min_cell_area: int, max_cell_area: int, invert: bool = True,
) -> list[tuple[int, int, int, int]]:
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if invert:
        thresh = cv2.bitwise_not(thresh)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    cells = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        area = w * h
        aspect = w / h if h > 0 else 0
        if area < min_cell_area or area > max_cell_area:
            continue
        if aspect < 0.3 or aspect > 3.0:
            continue
        cells.append((x, y, x + w, y + h))
    return cells


# ---------------------------------------------------------------------------
# Image / text region splitting within a cell
# ---------------------------------------------------------------------------

def split_cell_region(
    page_img: np.ndarray, x1: int, y1: int, x2: int, y2: int
) -> tuple[np.ndarray, np.ndarray]:
    """Split a cell into an image region and a text region.
    Uses edge detection to find where the image ends and text begins."""
    cell = page_img[y1:y2, x1:x2]
    if cell.size == 0:
        return None, None

    ch, cw = cell.shape[:2]

    # Find the text region using edge density in the bottom half
    gray = cv2.cvtColor(cell, cv2.COLOR_BGR2GRAY)
    lower_half = cell[ch // 2:, :]
    lh_gray = cv2.cvtColor(lower_half, cv2.COLOR_BGR2GRAY)
    _, lh_bin = cv2.threshold(lh_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Score each row by ink density
    row_scores = np.sum(lh_bin < 128, axis=1) / max(cw, 1)
    mid = ch // 2

    # Find the highest row in the bottom-half with significant ink
    threshold = max(row_scores) * 0.15 if np.max(row_scores) > 0 else 0.05
    text_start = mid
    for y in range(len(row_scores) - 1, -1, -1):
        if row_scores[y] > threshold:
            text_start = mid + y
            break

    # Expand the text region upward to include nearby text
    for y in range(text_start - mid, -1, -1):
        if row_scores[y] > threshold * 0.5:
            text_start = mid + y
        else:
            break

    # Ensure minimum text region size (at least 8% of cell height)
    min_text_h = max(30, int(ch * 0.08))
    text_end = ch
    if text_end - text_start < min_text_h:
        text_start = ch - min_text_h

    # Image region is everything above the text
    split_y = max(0, text_start - 5)  # small buffer

    image_crop = cell[:split_y, :]
    text_crop = cell[split_y:, :]

    return image_crop, text_crop


# ---------------------------------------------------------------------------
# Text extraction (PDF native text → OCR fallback)
# ---------------------------------------------------------------------------

def extract_pdf_text(
    pdf_path: str | Path,
    page_num: int,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    dpi: int = 300,
) -> str:
    """Extract text from a PDF page region using the native text layer.
    Falls back to OCR if no text is found.

    Coordinates are in pixels at the given DPI; they are converted to
    PDF points (1 pt = 1/72 inch) for the text-extraction call.
    """
    import fitz
    doc = fitz.open(str(pdf_path))
    page = doc[page_num]
    page_rect = page.rect

    # Convert pixel coords to PDF points
    scale = dpi / 72
    pts_x1 = x1 / scale
    pts_y1 = y1 / scale
    pts_x2 = x2 / scale
    pts_y2 = y2 / scale

    clip = fitz.Rect(pts_x1, pts_y1, pts_x2, pts_y2)
    text = page.get_text("text", clip=clip).strip()
    doc.close()

    if text:
        return text
    return ""


def ocr_text(region: np.ndarray) -> str:
    if region is None or region.size == 0:
        return ""
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)

    h, w = gray.shape
    # Cap dimensions to avoid tesseract errors
    max_dim = 8000
    if w > max_dim or h > max_dim:
        scale = max_dim / max(w, h)
        gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        h, w = gray.shape

    # Aggressively upscale small text regions
    target_min_h = 120
    if h < target_min_h:
        scale = max(3, target_min_h // h)
        gray = cv2.resize(gray, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)

    # Denoise
    gray = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

    # Sharpen
    blur = cv2.GaussianBlur(gray, (0, 0), 0.8)
    gray = cv2.addWeighted(gray, 1.6, blur, -0.6, 0)

    # Contrast stretching
    p2, p98 = np.percentile(gray, (2, 98))
    gray = np.clip((gray.astype(float) - p2) * 255.0 / max(p98 - p2, 1), 0, 255).astype(np.uint8)

    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    text = pytesseract.image_to_string(
        thresh, lang="eng", config="--psm 6 --oem 3",
    )
    return text.strip()


DIMENSION_RE = re.compile(r"\d+\s*[xX×]\s*\d+", re.IGNORECASE)

def find_sku(text: str) -> str:
    lines = text.strip().split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue
        match = SKU_PATTERN.search(line)
        if match:
            return match.group(0).upper()
    # Fallback: find a line with digits that isn't just a dimension
    for line in lines:
        if not re.search(r"\d{3,}", line):
            continue
        # Skip lines that are exclusively dimension-like
        if DIMENSION_RE.search(line) and not SKU_PATTERN.search(line):
            continue
        # Also skip very short pure-digit tokens
        token = line.strip().split()[0].upper()
        if re.fullmatch(r"\d+", token) and len(token) < 5:
            continue
        return token
    return ""


def build_reference(existing_tiles: list[dict] | None = None) -> ReferenceData:
    """Build reference data from existing tiles to guide extraction."""
    ref = ReferenceData()

    if not existing_tiles:
        return ref

    seen_series = set()
    for tile in existing_tiles:
        sku = (tile.get('sku') or '').upper().strip()
        if sku:
            ref.known_skus.add(sku)
            # Extract SKU prefix (letters before digits)
            prefix_match = re.match(r'^([A-Z]+)', sku)
            if prefix_match:
                ref.sku_prefixes.add(prefix_match.group(1))
            # Add full SKU as keyword for brand matching
            lower_sku = sku.lower()
            for brand_key in ref.brand_keywords:
                if any(kw in lower_sku for kw in ref.brand_keywords[brand_key]):
                    continue
            # Add first 3+ letter run as potential brand keyword
            brand_part = re.match(r'^([A-Z]{2,})', sku)
            if brand_part:
                bp = brand_part.group(1).lower()
                if bp not in ('gw',):  # GW already covered under goodwill
                    pass

        series = (tile.get('series') or '').strip().lower()
        if series and series not in seen_series:
            seen_series.add(series)
            ref.series_names.append(series)
            words = series.split()
            ref.tile_keywords.extend(w for w in words if len(w) > 2)

        dim = (tile.get('dimensions') or '').strip().lower()
        if dim:
            ref.known_dimensions.append(dim)
            # Extract the numeric pattern
            dim_digits = re.sub(r'[^0-9x]', '', dim)
            if dim_digits:
                ref.dimension_patterns.add(dim_digits)

        name = (tile.get('name') or '').strip().lower()
        if name:
            words = re.findall(r'[a-zA-Z]{3,}', name)
            ref.tile_keywords.extend(w.lower() for w in words)

    ref.tile_keywords = list(set(ref.tile_keywords))
    ref.series_names = list(set(ref.series_names))
    return ref


def parse_product_metadata(
    text: str, page_num: int, idx: int,
    ref: ReferenceData | None = None,
) -> ExtractedProduct:
    prod = ExtractedProduct(page_number=page_num + 1)
    prod.description = text[:500]
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    combined_lower = text.lower()

    sku = find_sku(text)
    if sku:
        prod.sku = sku

    # Match brand from OCR text using reference
    if ref:
        for brand_key, keywords in ref.brand_keywords.items():
            if any(kw in combined_lower for kw in keywords):
                # Verify it's not a false positive — check surrounding context
                for kw in keywords:
                    if kw in combined_lower:
                        prod.brand = brand_key
                        break
                if prod.brand:
                    break

        # Match series from OCR text
        if ref.series_names:
            for series in sorted(ref.series_names, key=len, reverse=True):
                if series in combined_lower:
                    prod.series = series.title()
                    break

    # Scan lines for dimensions, pieces, category
    details_lines = set()
    for i, line in enumerate(lines):
        has_dim = bool(re.search(r"(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)", line))
        has_pcs = bool(re.search(r"(\d+)\s*(?:pcs?|pieces?|/carton|per.*box)", line, re.IGNORECASE))
        if has_dim:
            dim_match = re.search(r"(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)", line)
            dim_val = f"{dim_match.group(1)}x{dim_match.group(2)}cm"
            # Prefer the most common dimension from reference if exact match exists
            if ref and ref.known_dimensions:
                for known in ref.known_dimensions:
                    if known.replace('cm', '') in dim_val.replace('cm', ''):
                        dim_val = known
                        break
            prod.dimensions = dim_val
            details_lines.add(i)
        if has_pcs and not prod.pieces_per_carton:
            prod.pieces_per_carton = int(re.search(r"(\d+)\s*(?:pcs?|pieces?|/carton|per.*box)", line, re.IGNORECASE).group(1))
            details_lines.add(i)
        lower = line.lower()
        cats = ref.known_categories if ref else {"wall", "floor", "bathroom", "kitchen", "outdoor", "mosaic", "wood", "stone", "marble"}
        for cat in cats:
            if cat in lower and (has_dim or has_pcs):
                prod.category = cat.capitalize()
                break
        if not prod.category:
            for cat in cats:
                if cat in lower:
                    prod.category = cat.capitalize()
                    break

    # Infer tier from text
    if 'premium' in combined_lower or 'prem' in combined_lower:
        prod.tier = 'premium'
    elif 'standard' in combined_lower or 'std' in combined_lower:
        prod.tier = 'standard'

    # Parse spec fields from lines
    for line in lines:
        lower = line.lower()
        # Tile type
        for t in ['ceramic', 'porcelain', 'wall tile', 'floor tile', 'mosaic']:
            if t in lower:
                prod.tile_type = line.strip()
                break
        # Finish
        if 'matt' in lower or 'gloss' in lower or 'matte' in lower:
            if 'matt' in lower and 'gloss' in lower:
                prod.finish = 'Matt or Gloss available'
            elif 'matt' in lower or 'matte' in lower:
                prod.finish = 'Matt'
            elif 'gloss' in lower:
                prod.finish = 'Gloss'
        # Thickness
        thick_match = re.search(r'(\d+[\s-]*\d*\s*mm)', lower)
        if thick_match:
            val = thick_match.group(1).replace(' ', '')
            if 'typical' not in lower.split(thick_match.group(0))[0:1]:
                prod.thickness = val
        # Coverage per box
        cov_match = re.search(r'(\d+\.?\d*)\s*sq[.\s]*[m㎡]', lower)
        if cov_match:
            prod.coverage_per_box = f'{cov_match.group(1)} sqm per box'
        # Use case
        for uc in ['living room', 'bedroom', 'kitchen', 'bathroom', 'outdoor', 'commercial', 'lobby', 'hallway']:
            if uc in lower:
                prod.use_case = line.strip()
                break
        # Pieces per carton
        pcs_match = re.search(r'(\d+)\s*(?:pcs?|pieces?)\s*(?:per|/)?\s*(?:box|carton)', lower)
        if pcs_match and not prod.pieces_per_carton:
            prod.pieces_per_carton = int(pcs_match.group(1))

    # Name: first non-SKU, non-details line that's long enough
    for i, line in enumerate(lines):
        if i in details_lines:
            continue
        if sku and (sku in line.upper() or sku in line):
            continue
        if prod.brand and prod.brand in line.lower():
            continue
        if len(line) > 2:
            prod.name = line
            break

    if not prod.name:
        prod.name = f"Product_{page_num + 1}_{idx + 1}"

    return prod


# ---------------------------------------------------------------------------
# Image saving
# ---------------------------------------------------------------------------

def save_product_image(image: np.ndarray, output_dir: str | Path | None, sku: str, idx: int) -> str:
    safe_sku = re.sub(r"[^a-zA-Z0-9_-]", "_", sku) if sku else f"product_{idx}"
    filename = f"{safe_sku}.png"

    if output_dir is None:
        return filename

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    filepath = output_dir / filename

    # Resize for consistency
    h, w = image.shape[:2]
    max_dim = 800
    if h > max_dim or w > max_dim:
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

    cv2.imwrite(str(filepath), image, [cv2.IMWRITE_PNG_COMPRESSION, 3])
    return filename


# ---------------------------------------------------------------------------
# AI prompt generation
# ---------------------------------------------------------------------------

def generate_ai_prompts(products: list[ExtractedProduct], output_dir: str | Path) -> None:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    sample = products[:5] if products else []

    prompts = f"""# Tile Catalog - AI Code Generation Prompts

## Extracted Product Data

Total products extracted: {len(products)}

### Sample Products (first {len(sample)})

```json
{json.dumps([asdict(p) for p in sample], indent=2)}
```

## Backend Prompt

Create a Django model `TileProduct` with these fields:
- `sku` (CharField, unique)
- `name` (CharField)
- `dimensions` (CharField, e.g. "30x30cm")
- `pieces_per_carton` (PositiveIntegerField, default 1)
- `category` (CharField, choices: Wall, Floor, Bathroom, Kitchen, Outdoor, Mosaic, Wood, Stone, Marble)
- `description` (TextField, blank)
- `image` (ImageField, upload_to='products/')
- `created_at`, `updated_at` (auto timestamps)

Create a DRF ModelSerializer and ModelViewSet for TileProduct.
Register at `/api/products/` with JWT auth, pagination, search/filter.
Use the existing `IsInventoryViewer` permission class.

## Frontend Prompt

Create a `Products` page component (`src/components/Products.tsx`) that:
- Fetches products from `/api/inventory/products/`
- Displays in a grid with product images, SKU, name, dimensions
- Uses React Query with the existing `inventoryApi` pattern
- Add a route at `/products` and a sidebar link

## Admin Dashboard Prompt

Create a Django admin configuration for `TileProduct` with:
- List display: sku, name, category, dimensions, pieces_per_carton
- Search fields: sku, name
- List filter: category
- Image thumbnail preview in list view
- Inline image preview in detail view

---

*Generated by extract_catalog.py on {__import__('datetime').datetime.now().isoformat()}*
"""
    (output_dir / "ai_prompt.md").write_text(prompts)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def process_pdf(
    pdf_path: str | Path,
    output_zip: str | Path | None = None,
    dpi: int = 300,
    lang: str = "eng",
    min_cell_area: int = 10000,
    max_cell_area: int | None = None,
    images_output_dir: str | Path | None = None,
    reference: ReferenceData | None = None,
) -> ExtractionResult:
    import fitz
    pdf_path = Path(pdf_path)
    result = ExtractionResult()

    doc = fitz.open(str(pdf_path))
    result.total_pages = len(doc)
    doc.close()

    products: list[ExtractedProduct] = []

    for page_num in range(result.total_pages):
        page_img = render_page(pdf_path, page_num, dpi=dpi)
        cells = detect_grid_cells(page_img, min_cell_area=min_cell_area, max_cell_area=max_cell_area)

        if not cells:
            result.page_errors.append(f"Page {page_num + 1}: no grid cells detected")
            continue

        result.cells_per_page.append(len(cells))

        for idx, (x1, y1, x2, y2) in enumerate(cells):
            img_crop, text_crop = split_cell_region(page_img, x1, y1, x2, y2)
            if img_crop is None or img_crop.size == 0:
                continue

            # Try PDF native text extraction first, fall back to OCR
            text = extract_pdf_text(pdf_path, page_num, x1, y1, x2, y2, dpi=dpi)
            if not text and text_crop is not None and text_crop.size > 0:
                text = ocr_text(text_crop)
            # If still no text, try OCR on the full cell (less ideal but may catch more)
            if not text:
                full_cell = page_img[y1:y2, x1:x2]
                if full_cell.size > 0:
                    text = ocr_text(full_cell)

            prod = parse_product_metadata(text, page_num, idx, ref=reference)
            prod.image_filename = save_product_image(
                img_crop, images_output_dir, prod.sku, len(products)
            ) if images_output_dir else ""
            products.append(prod)

        result.processed_pages += 1

    result.products = products

    # Write products.json and generate prompts if output_zip is given
    if output_zip:
        output_zip = Path(output_zip)
        with tempfile.TemporaryDirectory(prefix="catalog_extract_") as tmpdir:
            tmp_path = Path(tmpdir)
            output_images_dir = tmp_path / "images"
            prompts_dir = tmp_path / "prompts"

            # Re-save images to the ZIP temp dir if they were saved elsewhere
            if images_output_dir:
                import shutil
                src_images = Path(images_output_dir)
                if src_images.exists():
                    for f in src_images.iterdir():
                        shutil.copy2(f, output_images_dir / f.name)
            else:
                for prod in products:
                    img = prod._cached_image
                    if img is not None:
                        cv2.imwrite(str(output_images_dir / prod.image_filename), img)

            (tmp_path / "products.json").write_text(
                json.dumps([asdict(p) for p in products], indent=2, default=str)
            )
            generate_ai_prompts(products, prompts_dir)

            with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
                for filepath in tmp_path.rglob("*"):
                    if filepath.is_file():
                        arcname = str(filepath.relative_to(tmp_path))
                        zf.write(filepath, arcname)

    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Extract products from a tile catalog PDF"
    )
    parser.add_argument("pdf", type=str, help="Path to the PDF catalog")
    parser.add_argument("-o", "--output", type=str, default="catalog_export.zip",
                        help="Output ZIP path (default: catalog_export.zip)")
    parser.add_argument("--dpi", type=int, default=400,
                        help="Rendering DPI (default: 400)")
    parser.add_argument("--lang", type=str, default="eng",
                        help="Tesseract language (default: eng)")
    parser.add_argument("--min-cell-area", type=int, default=10000,
                        help="Minimum cell area in pixels (default: 10000)")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"Error: PDF not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Processing: {pdf_path}")
    result = process_pdf(
        pdf_path=str(pdf_path),
        output_zip=args.output,
        dpi=args.dpi,
        lang=args.lang,
        min_cell_area=args.min_cell_area,
    )

    print(f"\nDone! Extracted {len(result.products)} products from {result.total_pages} pages.")
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()
