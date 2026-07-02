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

        if not User.objects.filter(username='manager').exists():
            manager = User.objects.create_user(username='manager', password='manager123')
            manager.groups.add(managers_group)
            self.stdout.write(self.style.SUCCESS("Created user 'manager' (password: manager123) in inventory_managers"))
        else:
            self.stdout.write("User 'manager' already exists")

        if not User.objects.filter(username='viewer').exists():
            viewer = User.objects.create_user(username='viewer', password='viewer123')
            self.stdout.write(self.style.SUCCESS("Created user 'viewer' (password: viewer123)"))
        else:
            self.stdout.write("User 'viewer' already exists")

        if not User.objects.filter(is_superuser=True).exists():
            admin = User.objects.create_superuser(username='admin', password='admin123', email='admin@example.com')
            admin.groups.add(managers_group)
            self.stdout.write(self.style.SUCCESS("Created superuser 'admin' (password: admin123)"))
        else:
            self.stdout.write("Superuser already exists")
