import json
import sys
from pathlib import Path

from django.core.management.base import BaseCommand

from inventory.models import Tile


def infer_brand(sku: str) -> str:
    prefix = ''.join(c for c in sku if c.isalpha())[:2].upper()
    if prefix in ('GG', 'GS', 'RS', 'CG', 'CX'):
        return 'goodwill'
    if prefix in ('CS',):
        return 'crown_crane'
    return 'other'


def infer_category(spec: str, section: str) -> str:
    lower = (spec + ' ' + section).lower()
    if 'bathroom' in lower:
        return 'Bathroom'
    if 'floor' in lower:
        return 'Floor'
    if 'wall' in lower:
        return 'Wall'
    if 'staircase' in lower or 'border' in lower or 'decorative' in lower:
        return 'Wall'
    return 'Floor'


def infer_use_case(spec: str, section: str) -> str:
    parts = [p.strip() for p in (spec + ' ' + section).split(',')]
    keywords = {
        'bathroom': 'Bathroom',
        'ground floor': 'Living rooms, hallways',
        'staircase': 'Staircase',
        'living': 'Living rooms',
        'bedroom': 'Bedrooms',
        'kitchen': 'Kitchen',
        'outdoor': 'Outdoor',
        'commercial': 'Commercial',
    }
    lower = (spec + ' ' + section).lower()
    for kw, val in keywords.items():
        if kw in lower:
            return val
    return ''


def infer_tile_type(spec: str) -> str:
    lower = spec.lower()
    if 'bathroom' in lower or 'wall' in lower:
        return 'Ceramic Wall Tile'
    if 'floor' in lower:
        return 'Ceramic Floor Tile'
    if 'staircase' in lower:
        return 'Staircase Tile'
    return ''


def extract_dimensions(spec: str) -> str:
    import re
    m = re.search(r'(\d+)\s*[xX×]\s*(\d+)\s*mm', spec)
    if m:
        return f"{m.group(1)}x{m.group(2)}cm"
    m = re.search(r'(\d+)\s*[xX×]\s*(\d+)', spec)
    if m:
        return f"{m.group(1)}x{m.group(2)}cm"
    return ''


class Command(BaseCommand):
    help = "Import tile products from structured JSON"

    def add_arguments(self, parser):
        parser.add_argument('json_file', nargs='?', type=str, help='Path to JSON file (reads stdin if omitted)')

    def handle(self, *args, **options):
        if options['json_file']:
            data = json.loads(Path(options['json_file']).read_text())
        else:
            data = json.loads(sys.stdin.read())

        created = 0
        skipped = 0

        for group_key, group in data.items():
            spec = group.get('specifications', '')
            section_label = group_key.replace('_', ' ').title()

            items = group.get('items', [])
            sections = group.get('sections', [])

            # Handle sections (staircase_wall_and_cs_floor structure)
            for section in sections:
                sec_spec = section.get('specifications', spec)
                sec_items = section.get('items', [])
                for sku in sec_items:
                    sku = sku.strip()
                    if not sku:
                        continue
                    _, was_created = Tile.objects.get_or_create(
                        sku=sku,
                        defaults={
                            'name': sku,
                            'dimensions': extract_dimensions(sec_spec),
                            'pieces_per_carton': 10,
                            'category': infer_category(sec_spec, section_label),
                            'brand': infer_brand(sku),
                            'tile_type': infer_tile_type(sec_spec),
                            'use_case': infer_use_case(sec_spec, section_label),
                        },
                    )
                    if was_created:
                        created += 1
                    else:
                        skipped += 1

            # Handle direct items
            for sku in items:
                sku = sku.strip()
                if not sku:
                    continue
                _, was_created = Tile.objects.get_or_create(
                    sku=sku,
                    defaults={
                        'name': sku,
                        'dimensions': extract_dimensions(spec),
                        'pieces_per_carton': 10,
                        'category': infer_category(spec, section_label),
                        'brand': infer_brand(sku),
                        'tile_type': infer_tile_type(spec),
                        'use_case': infer_use_case(spec, section_label),
                    },
                )
                if was_created:
                    created += 1
                else:
                    skipped += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} tiles, skipped {skipped} existing"))
