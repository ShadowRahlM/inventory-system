import json
import sys
from datetime import datetime, timezone

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()

MODELS_IN_ORDER = [
    'Tile', 'Batch', 'Customer', 'Supplier',
    'Inventory', 'Movement', 'AuditLog',
    'SalesOrder', 'PurchaseOrder', 'OrderLineItem',
    'TileCatalog', 'Notification', 'SyncState', 'SyncConflict',
]


def serialize_user(user):
    return {
        'id': str(user.id),
        'username': user.username,
        'email': user.email,
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
        'is_active': user.is_active,
        'groups': list(user.groups.values_list('name', flat=True)),
    }


def serialize_model(label):
    from django.apps import apps
    model_cls = apps.get_model('inventory', label)
    qs = model_cls.objects.all().order_by('id')
    from django.core.serializers import serialize
    raw = serialize('json', qs)
    return json.loads(raw)


class Command(BaseCommand):
    help = 'Export all database data as portable JSON'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output', '-o', type=str,
            help='Output file path (default: stdout)',
        )
        parser.add_argument(
            '--indent', type=int, default=2,
            help='JSON indent level (default: 2)',
        )

    def handle(self, *args, **options):
        output_path = options.get('output')
        indent = options['indent']

        export = {
            'version': '1.0',
            'exported_at': datetime.now(timezone.utc).isoformat(),
            'models': {},
        }

        users = User.objects.all().order_by('id')
        export['models']['User'] = [serialize_user(u) for u in users]
        self.stdout.write(self.style.SUCCESS(f'  User                 {users.count():>6} records'))

        groups = Group.objects.all().order_by('id')
        export['models']['Group'] = [
            {'id': str(g.id), 'name': g.name,
             'permissions': list(g.permissions.values_list('codename', flat=True))}
            for g in groups
        ]
        self.stdout.write(self.style.SUCCESS(f'  Group                {groups.count():>6} records'))

        for label in MODELS_IN_ORDER:
            data = serialize_model(label)
            export['models'][label] = data
            self.stdout.write(self.style.SUCCESS(f'  {label:20} {len(data):>6} records'))

        output = json.dumps(export, indent=indent)

        if output_path:
            with open(output_path, 'w') as f:
                f.write(output)
            self.stdout.write(self.style.SUCCESS(f'\nExported to {output_path}'))
        else:
            sys.stdout.write(output)
