import json
import tempfile
import zipfile
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.core.files.base import ContentFile
from django.conf import settings

from inventory.models import Tile, TileCatalog


def _run_extraction(pdf_path: str, output_zip: str, dpi: int = 300):
    """Thin wrapper: delegate to the standalone script's process_pdf."""
    from scripts.extract_catalog import process_pdf
    return process_pdf(pdf_path, output_zip, dpi=dpi)


class Command(BaseCommand):
    help = "Extract tile products from an uploaded TileCatalog PDF"

    def add_arguments(self, parser):
        parser.add_argument("catalog_id", type=str, help="UUID of the TileCatalog to process")
        parser.add_argument("--dpi", type=int, default=300, help="Rendering DPI")
        parser.add_argument("--dry-run", action="store_true", help="Extract without saving to DB")

    def handle(self, *args, **options):
        try:
            catalog = TileCatalog.objects.get(id=options["catalog_id"])
        except TileCatalog.DoesNotExist:
            raise CommandError(f"TileCatalog with id '{options['catalog_id']}' not found")

        pdf_path = catalog.file.path
        self.stdout.write(f"Processing: {catalog.name} ({pdf_path})")

        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
            zip_path = tmp.name

        try:
            result = _run_extraction(pdf_path, zip_path, dpi=options["dpi"])
        except Exception as e:
            Path(zip_path).unlink(missing_ok=True)
            raise CommandError(f"Extraction failed: {e}")

        self.stdout.write(f"Extracted {len(result.products)} products from {result.total_pages} pages.")

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("Dry-run mode — products NOT saved to DB"))
            for p in result.products:
                self.stdout.write(f"  {p.sku or '(no SKU)'}: {p.name}")
            Path(zip_path).unlink(missing_ok=True)
            return

        # Save products to database
        created = 0
        skipped = 0
        for prod in result.products:
            if not prod.sku:
                skipped += 1
                continue

            try:
                tile, was_created = Tile.objects.get_or_create(
                    sku=prod.sku,
                    defaults={
                        "name": prod.name or prod.sku,
                        "dimensions": prod.dimensions or "30x30cm",
                        "pieces_per_carton": prod.pieces_per_carton or 10,
                        "category": prod.category or "Wall",
                        "description": prod.description or prod.name or "",
                    },
                )
                if was_created:
                    created += 1
            except Exception:
                skipped += 1

        # Save extraction report
        report_dir = Path(settings.MEDIA_ROOT) / "extractions"
        report_dir.mkdir(parents=True, exist_ok=True)
        report_path = report_dir / f"{catalog.id}_extraction.json"
        import json as _json
        from dataclasses import asdict
        report_path.write_text(
            _json.dumps(
                {
                    "catalog_id": str(catalog.id),
                    "catalog_name": catalog.name,
                    "products_found": len(result.products),
                    "products_created": created,
                    "products_skipped": skipped,
                    "products": [asdict(p) for p in result.products],
                },
                indent=2,
                default=str,
            )
        )

        self.stdout.write(self.style.SUCCESS(
            f"Created {created} tiles, skipped {skipped} (no SKU or duplicate)."
        ))
        self.stdout.write(f"Report: {report_path}")
        self.stdout.write(f"ZIP export: {zip_path}")
        self.stdout.write("\nExtraction complete. Use --dry-run to preview without saving.")
