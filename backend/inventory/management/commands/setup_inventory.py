from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create default groups and dev users for inventory system'

    def handle(self, *args, **options):
        managers_group, created = Group.objects.get_or_create(name='inventory_managers')
        if created:
            self.stdout.write(self.style.SUCCESS("Created group 'inventory_managers'"))
        else:
            self.stdout.write("Group 'inventory_managers' already exists")

        default_users = [
            {
                'username': 'manager',
                'password': 'manager123',
                'is_superuser': False,
                'is_staff': False,
                'groups': [managers_group],
            },
            {
                'username': 'viewer',
                'password': 'viewer123',
                'is_superuser': False,
                'is_staff': False,
                'groups': [],
            },
            {
                'username': 'admin',
                'password': 'admin123',
                'is_superuser': True,
                'is_staff': True,
                'groups': [managers_group],
            },
        ]

        for cfg in default_users:
            user, created = User.objects.get_or_create(
                username=cfg['username'],
                defaults={
                    'is_superuser': cfg['is_superuser'],
                    'is_staff': cfg['is_staff'],
                },
            )
            if created:
                user.is_superuser = cfg['is_superuser']
                user.is_staff = cfg['is_staff']
                user.set_password(cfg['password'])
            user.is_active = True
            user.save()
            user.groups.set(cfg['groups'])
            status = "Created" if created else "Skipped (unchanged)"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{status} user '{cfg['username']}' (password: {cfg['password']})"
                )
            )
