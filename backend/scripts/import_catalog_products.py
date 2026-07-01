#!/usr/bin/env python3
"""Import catalog products JSON and link extracted images to tiles."""

import json
import sys
import re
from pathlib import Path

import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_system.settings')
django.setup()

from django.core.files.base import ContentFile
from inventory.models import Tile

EXTRACTIONS_ROOT = Path('/run/media/shadowm/Doomsdsay/inventory/backend/media/extractions/263924bb-36eb-4970-b806-84ebe4417b14')

BRAND_MAP = {
    'GG': 'goodwill', 'GS': 'goodwill', 'RS': 'goodwill',
    'GF': 'goodwill', 'GW': 'goodwill', 'GP': 'goodwill',
    'GK': 'goodwill', 'CX': 'crown_crane', 'CG': 'crown_crane',
    'CS': 'crown_crane',
}

def infer_brand(sku):
    m = re.match(r'^([A-Z]{2})', sku.upper())
    return BRAND_MAP.get(m.group(1), 'other') if m else 'other'

def to_dim(size_str):
    m = re.search(r'(\d+)\s*[xX×]\s*(\d+)', size_str)
    if m:
        return f"{m.group(1)}x{m.group(2)}cm"
    return size_str

def main():
    raw = sys.stdin.read()
    data = json.loads(raw)

    created = 0
    updated = 0
    skipped = 0
    images_linked = 0

    for entry in data:
        sku = entry['code'].strip()
        if not sku:
            continue

        dim = to_dim(entry.get('size', ''))
        category = entry.get('category', '')
        collection = entry.get('collection', '')
        use_case = ''
        tile_type = ''

        coll_lower = collection.lower()
        if 'interior' in coll_lower:
            use_case = 'Living rooms, bedrooms'
        elif 'exterior' in coll_lower:
            use_case = 'Outdoor'

        cat_lower = category.lower()
        if 'wall' in cat_lower:
            tile_type = 'Ceramic Wall Tile'
        elif 'floor' in cat_lower:
            tile_type = 'Ceramic Floor Tile'
        elif 'skirting' in cat_lower:
            tile_type = 'Skirting'

        tile, was_created = Tile.objects.get_or_create(
            sku=sku,
            defaults={
                'name': sku,
                'dimensions': dim,
                'pieces_per_carton': 10,
                'category': category,
                'brand': infer_brand(sku),
                'series': collection,
                'tile_type': tile_type,
                'use_case': use_case,
            },
        )

        if was_created:
            created += 1
        elif not tile.image:  # existing without image
            updated += 1

        # Link extracted image if available
        if not tile.image:
            # Try direct SKU match
            img_name = f"{sku}.png"
            img_path = EXTRACTIONS_ROOT / img_name
            if img_path.exists():
                with open(img_path, 'rb') as f:
                    tile.image.save(img_name, ContentFile(f.read()), save=True)
                    images_linked += 1
                    print(f"  IMG {sku} ← {img_name}")
            else:
                # Try with underscores (spaces in SKU)
                alt = sku.replace(' ', '_')
                for candidate in [f"{alt}.png", f"{sku.replace(' ', '')}.png"]:
                    cp = EXTRACTIONS_ROOT / candidate
                    if cp.exists():
                        with open(cp, 'rb') as f:
                            tile.image.save(candidate, ContentFile(f.read()), save=True)
                            images_linked += 1
                            print(f"  IMG {sku} ← {candidate}")
                        break

    print(f"\nDone. Created: {created}, Existed without image: {updated}, Skipped: {skipped}, Images linked: {images_linked}")

if __name__ == '__main__':
    main()
