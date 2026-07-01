import factory
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone

from inventory.models import Tile, Batch, Inventory, Movement, MovementType, AuditLog

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user{n}')
    password = factory.PostGenerationMethodCall('set_password', 'pass123')


class GroupFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Group

    name = factory.Sequence(lambda n: f'group{n}')


class TileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Tile

    sku = factory.Sequence(lambda n: f'SKU-{n:04d}')
    name = factory.Sequence(lambda n: f'Tile {n}')
    description = ''
    dimensions = '30x30cm'
    pieces_per_carton = 10
    category = 'Wall'


class BatchFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Batch

    tile = factory.SubFactory(TileFactory)
    batch_number = factory.Sequence(lambda n: f'BATCH-{n:04d}')
    production_date = factory.Faker('date_this_year')
    supplier = factory.Sequence(lambda n: f'Supplier {n}')
    received_date = factory.LazyFunction(timezone.now().date)
    is_active = True


class InventoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Inventory

    tile = factory.SubFactory(TileFactory)
    batch = factory.SubFactory(BatchFactory)
    cartons = 10
    loose_pieces = 5
    location = factory.Sequence(lambda n: f'WH-{n}')


class MovementFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Movement

    tile = factory.SubFactory(TileFactory)
    batch = factory.SubFactory(BatchFactory)
    movement_type = MovementType.RECEIVING
    cartons_change = 10
    loose_pieces_change = 5
    previous_cartons = 0
    previous_loose_pieces = 0
    new_cartons = 10
    new_loose_pieces = 5
    reference = ''
    reason = 'Test movement'
    performed_by = factory.SubFactory(UserFactory)


class AuditLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = AuditLog

    movement = factory.SubFactory(MovementFactory)
    action = 'TEST_ACTION'
    old_values = {}
    new_values = {}
    changed_by = factory.SubFactory(UserFactory)
