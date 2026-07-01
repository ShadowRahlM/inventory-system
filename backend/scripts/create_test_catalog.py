"""Generate a realistic test tile catalog PDF in a 4x3 grid layout.

Usage:
    python scripts/create_test_catalog.py [output.pdf]

Default output: /tmp/test_catalog.pdf
"""

import sys
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


PRODUCTS = [
    {"sku": "SKU-WL-001", "name": "White Wall Tile", "dims": "30x60cm", "pcs": 8, "cat": "Wall", "color": "#dddddd"},
    {"sku": "SKU-WL-002", "name": "Beige Wall Tile", "dims": "25x40cm", "pcs": 10, "cat": "Wall", "color": "#ebe0cc"},
    {"sku": "SKU-FL-001", "name": "Grey Floor Tile", "dims": "60x60cm", "pcs": 4, "cat": "Floor", "color": "#c8c8c8"},
    {"sku": "SKU-FL-002", "name": "Dark Floor Tile", "dims": "45x90cm", "pcs": 3, "cat": "Floor", "color": "#808080"},
    {"sku": "SKU-MO-001", "name": "Blue Glass Mosaic", "dims": "30x30cm", "pcs": 10, "cat": "Mosaic", "color": "#6aafe6"},
    {"sku": "SKU-MO-002", "name": "Green Glass Mosaic", "dims": "20x30cm", "pcs": 10, "cat": "Mosaic", "color": "#66bb88"},
    {"sku": "SKU-WD-001", "name": "Oak Wood Plank", "dims": "15x90cm", "pcs": 6, "cat": "Wood", "color": "#cba077"},
    {"sku": "SKU-WD-002", "name": "Walnut Wood Plank", "dims": "15x90cm", "pcs": 6, "cat": "Wood", "color": "#8b6914"},
    {"sku": "SKU-ST-001", "name": "Slate Stone Tile", "dims": "30x60cm", "pcs": 5, "cat": "Stone", "color": "#9a9a9a"},
    {"sku": "SKU-ST-002", "name": "Marble Stone Tile", "dims": "60x60cm", "pcs": 4, "cat": "Stone", "color": "#d9d4c9"},
    {"sku": "SKU-KT-001", "name": "Bathroom Wave Tile", "dims": "25x40cm", "pcs": 10, "cat": "Bathroom", "color": "#abd4ee"},
    {"sku": "SKU-KT-002", "name": "Kitchen Hex Tile", "dims": "20x20cm", "pcs": 12, "cat": "Kitchen", "color": "#e0b090"},
]


def generate_pdf(output_path: str = "/tmp/test_catalog.pdf") -> str:
    margin_x = 8 * mm
    margin_y = 22 * mm
    cols, rows = 4, 3
    cell_w = 46 * mm
    cell_h = 66 * mm
    gap = 3 * mm
    page_w, page_h = A4

    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle("Tile Product Catalog")

    # Header
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(colors.Color(0, 0, 0, 0.85))
    c.drawString(margin_x, page_h - 14 * mm, "Tile Product Catalog")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.Color(0, 0, 0, 0.5))
    c.drawString(margin_x, page_h - 18 * mm, "Spring Collection 2026 | 12 products")

    for idx, prod in enumerate(PRODUCTS):
        col = idx % cols
        row = idx // cols
        x = margin_x + col * (cell_w + gap)
        y = page_h - margin_y - row * (cell_h + gap) - cell_h

        # Grid line
        c.setStrokeColor(colors.Color(0, 0, 0, 0.5))
        c.setLineWidth(1.0)
        c.rect(x, y, cell_w, cell_h)

        # Color swatch — fills entire cell except text band at bottom
        swatch_h = cell_h * 0.72
        hex_color = prod["color"]
        r, g, b = int(hex_color[1:3], 16) / 255, int(hex_color[3:5], 16) / 255, int(hex_color[5:7], 16) / 255
        c.setFillColor(colors.Color(r, g, b))
        c.roundRect(x + 2, y + 2 + (cell_h - swatch_h), cell_w - 4, swatch_h - 4, 2, fill=1, stroke=0)

        # Text band — bottom 28%
        text_y = y + 2
        text_h = cell_h - swatch_h - 4

        c.setFillColor(colors.Color(0, 0, 0, 0.85))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x + 3, text_y + text_h - 13, prod["sku"])

        c.setFont("Helvetica", 7)
        c.setFillColor(colors.Color(0, 0, 0, 0.55))
        c.drawString(x + 3, text_y + text_h - 24, f"{prod['dims']} | {prod['pcs']}pcs | {prod['cat']}")

        c.setFont("Helvetica", 7)
        c.setFillColor(colors.Color(0, 0, 0, 0.7))
        c.drawString(x + 3, text_y + text_h - 34, prod["name"])

    c.save()
    return output_path


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/test_catalog.pdf"
    path = generate_pdf(out)
    print(f"Created: {path} ({Path(path).stat().st_size / 1020:.0f} KB)")
    print(f"Products: {len(PRODUCTS)} ({PRODUCTS[0]['sku']} ... {PRODUCTS[-1]['sku']})")
