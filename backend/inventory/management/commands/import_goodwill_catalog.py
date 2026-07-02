import json
import sys
from pathlib import Path

from django.core.management.base import BaseCommand

from inventory.models import Tile


def infer_brand(code: str) -> str:
    prefix = ''.join(c for c in code if c.isalpha())[:2].upper()
    if prefix in ('GG', 'GS', 'RS', 'CG', 'CX', 'GF', 'GW', 'GK', 'GP'):
        return 'goodwill'
    return 'other'


def map_category(raw: str) -> str:
    raw = raw.lower()
    if 'wall' in raw:
        return 'Wall'
    if 'floor' in raw:
        return 'Floor'
    if 'skirting' in raw:
        return 'Skirting'
    return raw.title()


def format_dimensions(size: str) -> str:
    import re
    m = re.match(r'(\d+)\s*[xX×]\s*(\d+)', size)
    if m:
        return f"{m.group(1)}x{m.group(2)}cm"
    return size


class Command(BaseCommand):
    help = "Import Goodwill catalog products from flat JSON array or nested seed format"

    def add_arguments(self, parser):
        parser.add_argument('json_file', nargs='?', type=str, help='Path to JSON file (reads stdin if omitted)')

    def handle(self, *args, **options):
        if options['json_file']:
            data = json.loads(Path(options['json_file']).read_text())
        else:
            data = json.loads(sys.stdin.read())

        # Support nested format: {"catalog_items": [...], "image_to_sku_mappings": [...], ...}
        if isinstance(data, dict) and 'catalog_items' in data:
            items = data['catalog_items']
        elif isinstance(data, dict) and 'image_to_sku_mappings' in data:
            # The user's data has just the image mappings object — no tiles to import
            self.stdout.write(self.style.WARNING("No catalog_items array found, skipping tile import"))
            self._report_mappings(data)
            return
        elif isinstance(data, list):
            items = data
        else:
            self.stdout.write(self.style.ERROR("Unrecognized JSON format"))
            return

        created = 0
        skipped = 0

        for item in items:
            code = item.get('code', '').strip()
            if not code:
                continue

            raw_category = item.get('category', '')
            category = map_category(raw_category)
            collection = item.get('collection', '')
            size = item.get('size', '')
            dimensions = format_dimensions(size)

            name = f"{code}"
            if collection:
                name = f"{code} ({collection})"

            _, was_created = Tile.objects.get_or_create(
                sku=code,
                defaults={
                    'name': name,
                    'dimensions': dimensions,
                    'pieces_per_carton': 10,
                    'category': category,
                    'brand': infer_brand(code),
                    'series': collection or '',
                    'tile_type': f"{category} Tile" if category else '',
                    'use_case': collection or '',
                },
            )
            if was_created:
                created += 1
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} tiles, skipped {skipped} existing"))

        # Also report image mappings if present
        if isinstance(data, dict):
            self._report_mappings(data)

    def _report_mappings(self, data: dict):
        mappings = data.get('image_to_sku_mappings', [])
        unmapped = data.get('unmapped_image_files', [])
        if mappings:
            total_items = sum(m.get('total_mapped_items', 0) for m in mappings)
            self.stdout.write(self.style.SUCCESS(
                f"Image-to-SKU mappings: {len(mappings)} source files ({total_items} total items)"
            ))
            for m in mappings:
                self.stdout.write(f"  - {m.get('source_file', '?')}: {m.get('specification', '?')} ({m.get('total_mapped_items', 0)} items)")
        if unmapped:
            self.stdout.write(self.style.WARNING(f"Unmapped image files: {len(unmapped)}"))
            for u in unmapped:
                self.stdout.write(f"  - {u.get('source_file', '?')}: {u.get('reason', '?')}")
