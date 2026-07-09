import json
from io import StringIO

from django.core.management.base import BaseCommand, CommandError
from django.core.serializers import deserialize
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission

User = get_user_model()

IMPORT_ORDER = [
    'Group', 'User',
    'Tile', 'Batch', 'Customer', 'Supplier',
    'Inventory', 'Movement', 'AuditLog',
    'SalesOrder', 'PurchaseOrder', 'OrderLineItem',
    'TileCatalog', 'Notification', 'SyncState', 'SyncConflict',
]


class Command(BaseCommand):
    help = 'Import database data from export_data JSON'

    def add_arguments(self, parser):
        parser.add_argument(
            'input', type=str,
            help='Path to exported JSON file',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Preview what would be imported without writing',
        )

    def handle(self, *args, **options):
        path = options['input']
        dry_run = options['dry_run']

        try:
            with open(path) as f:
                export = json.load(f)
        except FileNotFoundError:
            raise CommandError(f'File not found: {path}')
        except json.JSONDecodeError as e:
            raise CommandError(f'Invalid JSON: {e}')

        version = export.get('version', '?')
        exported_at = export.get('exported_at', '?')
        self.stdout.write(f'Importing data (version {version}, exported {exported_at})')
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be made'))

        counts = {}

        for label in IMPORT_ORDER:
            records = export.get('models', {}).get(label, [])
            if not records:
                counts[label] = (0, 0)
                continue

            created = 0
            skipped = 0

            if label == 'Group':
                for g in records:
                    if dry_run:
                        created += 1
                        continue
                    group, was = Group.objects.get_or_create(
                        name=g['name'],
                        defaults={'id': g['id']},
                    )
                    perm_codenames = g.get('permissions', [])
                    if perm_codenames:
                        perms = Permission.objects.filter(codename__in=perm_codenames)
                        group.permissions.add(*perms)
                    if was:
                        created += 1
                    else:
                        skipped += 1

            elif label == 'User':
                for u in records:
                    if dry_run:
                        created += 1
                        continue
                    user, was = User.objects.get_or_create(
                        username=u['username'],
                        defaults={
                            'email': u.get('email', ''),
                            'is_superuser': u['is_superuser'],
                            'is_staff': u['is_staff'],
                            'is_active': u.get('is_active', True),
                        },
                    )
                    if was:
                        user.set_unusable_password()
                        user.save(update_fields=['password'])
                        created += 1
                    else:
                        skipped += 1
                    group_names = u.get('groups', [])
                    if group_names:
                        groups = Group.objects.filter(name__in=group_names)
                        user.groups.add(*groups)

            else:
                model_name = f'inventory.{label}'
                for obj in records:
                    if dry_run:
                        created += 1
                        continue
                    stream = StringIO(json.dumps([obj]))
                    for deserialized in deserialize('json', stream):
                        try:
                            deserialized.save()
                            created += 1
                        except Exception:
                            skipped += 1

            counts[label] = (created, skipped)
            if not dry_run:
                self.stdout.write(
                    self.style.SUCCESS(f'  {label:20} {created:>4} created, {skipped:>4} skipped')
                )
            else:
                self.stdout.write(f'  {label:20} {created:>4} would be created')

        total_created = sum(c[0] for c in counts.values())
        total_skipped = sum(c[1] for c in counts.values())

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'\nDry run complete. {total_created} records would be imported.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'\nImport complete. {total_created} created, {total_skipped} skipped.'
            ))
