import pytest
from django.db import IntegrityError
from django.core.exceptions import ValidationError as DjangoValidationError

from inventory.models import Tile, Batch, Inventory, Movement, MovementType, AuditLog
from .factories import TileFactory, BatchFactory, InventoryFactory, UserFactory


pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Fixtures used by this module
# ---------------------------------------------------------------------------

@pytest.fixture
def movement(tile, batch):
    user = UserFactory()
    return Movement.objects.create(
        tile=tile, batch=batch, movement_type=MovementType.RECEIVING,
        cartons_change=5, loose_pieces_change=3,
        previous_cartons=0, previous_loose_pieces=0,
        new_cartons=5, new_loose_pieces=3,
        performed_by=user,
    )


# ---------------------------------------------------------------------------
# Tile
# ---------------------------------------------------------------------------

class TestTileModel:
    def test_create_tile_with_minimal_fields(self):
        t = Tile.objects.create(sku='T-001', name='Test', dimensions='30x30', pieces_per_carton=10, category='Wall')
        assert t.sku == 'T-001'
        assert t.name == 'Test'
        assert t.description == ''
        assert str(t) == 'T-001 - Test'

    def test_sku_must_be_unique(self):
        TileFactory(sku='DUPE')
        with pytest.raises(IntegrityError):
            TileFactory(sku='DUPE')

    def test_pieces_per_carton_must_be_at_least_1(self):
        with pytest.raises(DjangoValidationError):
            t = Tile(sku='T-BAD', name='Bad', dimensions='30x30', pieces_per_carton=0, category='Wall')
            t.full_clean()

    def test_str_representation(self):
        t = TileFactory(sku='STR-001', name='Str Tile')
        assert str(t) == 'STR-001 - Str Tile'

    def test_auto_timestamps_on_create(self):
        t = TileFactory()
        assert t.created_at is not None
        assert t.updated_at is not None


# ---------------------------------------------------------------------------
# Batch
# ---------------------------------------------------------------------------

class TestBatchModel:
    def test_create_batch_with_minimal_fields(self, tile):
        b = Batch.objects.create(
            tile=tile, batch_number='B-001',
            production_date='2026-06-01', supplier='Sup',
            received_date='2026-06-15',
        )
        assert b.batch_number == 'B-001'
        assert b.is_active is True

    def test_batch_number_must_be_unique(self, tile):
        BatchFactory(tile=tile, batch_number='UNIQUE-B')
        with pytest.raises(IntegrityError):
            BatchFactory(tile=tile, batch_number='UNIQUE-B')

    def test_unique_tile_batch_constraint(self, tile):
        BatchFactory(tile=tile, batch_number='TB-001')
        with pytest.raises(IntegrityError):
            BatchFactory(tile=tile, batch_number='TB-001')

    def test_batch_number_globally_unique(self, tile):
        from .factories import TileFactory
        t2 = TileFactory()
        BatchFactory(tile=tile, batch_number='GLOBAL-UNIQUE')
        with pytest.raises(IntegrityError):
            BatchFactory(tile=t2, batch_number='GLOBAL-UNIQUE')

    def test_deactivate_batch(self, tile):
        b = BatchFactory(tile=tile, is_active=False)
        assert b.is_active is False

    def test_str_representation(self, tile):
        t = TileFactory(sku='STR-B')
        b = BatchFactory(tile=tile, batch_number='B-STR')
        assert str(b) == f'{b.batch_number} - {b.tile.sku}'

    def test_tile_protected_delete(self, tile):
        b = BatchFactory(tile=tile)
        with pytest.raises(IntegrityError):
            tile.delete()


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------

class TestInventoryModel:
    def test_create_inventory(self, tile, batch):
        inv = Inventory.objects.create(tile=tile, batch=batch, cartons=5, loose_pieces=3, location='WH-X')
        assert inv.cartons == 5
        assert inv.loose_pieces == 3
        assert inv.location == 'WH-X'

    def test_unique_tile_batch_location_constraint(self, tile, batch):
        InventoryFactory(tile=tile, batch=batch, location='WH-U')
        with pytest.raises(IntegrityError):
            InventoryFactory(tile=tile, batch=batch, location='WH-U')

    def test_same_tile_batch_different_location_allowed(self, tile, batch):
        i1 = InventoryFactory(tile=tile, batch=batch, location='WH-A')
        i2 = InventoryFactory(tile=tile, batch=batch, location='WH-B')
        assert i1.location != i2.location

    def test_total_pieces_property(self, tile, batch):
        inv = Inventory.objects.create(tile=tile, batch=batch, cartons=3, loose_pieces=7, location='WH-P')
        expected = (3 * tile.pieces_per_carton) + 7
        assert inv.total_pieces == expected

    def test_total_pieces_with_no_cartons(self, tile, batch):
        inv = Inventory.objects.create(tile=tile, batch=batch, cartons=0, loose_pieces=4, location='WH-P')
        assert inv.total_pieces == 4

    def test_minimal_inventory(self, tile, batch):
        inv = Inventory.objects.create(tile=tile, batch=batch, cartons=0, loose_pieces=0, location='WH-0')
        assert inv.total_pieces == 0

    def test_str_representation(self, tile, batch):
        inv = InventoryFactory(tile=tile, batch=batch, location='WH-STR')
        assert str(inv) == f'{tile.sku} - {batch.batch_number} - WH-STR'

    def test_cartons_cannot_be_negative(self, tile, batch):
        with pytest.raises(DjangoValidationError):
            inv = Inventory(tile=tile, batch=batch, cartons=-1, loose_pieces=0, location='WH-N')
            inv.full_clean()

    def test_loose_pieces_cannot_be_negative(self, tile, batch):
        with pytest.raises(DjangoValidationError):
            inv = Inventory(tile=tile, batch=batch, cartons=0, loose_pieces=-1, location='WH-N')
            inv.full_clean()


# ---------------------------------------------------------------------------
# Movement
# ---------------------------------------------------------------------------

class TestMovementModel:
    def test_create_movement(self, tile, batch):
        user = UserFactory()
        mov = Movement.objects.create(
            tile=tile, batch=batch, movement_type=MovementType.RECEIVING,
            cartons_change=5, loose_pieces_change=3,
            previous_cartons=0, previous_loose_pieces=0,
            new_cartons=5, new_loose_pieces=3,
            performed_by=user,
        )
        assert mov.movement_type == 'RECEIVING'
        assert mov.cartons_change == 5
        assert mov.loose_pieces_change == 3
        assert mov.reference == ''
        assert mov.reason == ''

    def test_movement_type_choices(self, tile, batch):
        user = UserFactory()
        for mt in [MovementType.RECEIVING, MovementType.DISPATCH, MovementType.ADJUSTMENT, MovementType.TRANSFER]:
            mov = Movement.objects.create(
                tile=tile, batch=batch, movement_type=mt,
                cartons_change=1, loose_pieces_change=1,
                previous_cartons=0, previous_loose_pieces=0,
                new_cartons=1, new_loose_pieces=1,
                performed_by=user,
            )
            assert mov.movement_type == mt

    def test_ordering_newest_first(self, tile, batch):
        user = UserFactory()
        m1 = Movement.objects.create(
            tile=tile, batch=batch, movement_type=MovementType.RECEIVING,
            cartons_change=1, loose_pieces_change=0,
            previous_cartons=0, previous_loose_pieces=0,
            new_cartons=1, new_loose_pieces=0,
            performed_by=user,
        )
        m2 = Movement.objects.create(
            tile=tile, batch=batch, movement_type=MovementType.DISPATCH,
            cartons_change=-1, loose_pieces_change=0,
            previous_cartons=1, previous_loose_pieces=0,
            new_cartons=0, new_loose_pieces=0,
            performed_by=user,
        )
        qs = Movement.objects.all()
        assert qs[0] == m2
        assert qs[1] == m1


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------

class TestAuditLogModel:
    def test_create_audit_log(self, movement):
        al = AuditLog.objects.create(
            movement=movement, action='RECEIVE_INVENTORY',
            old_values={'cartons': 0, 'loose_pieces': 0},
            new_values={'cartons': 5, 'loose_pieces': 3},
            changed_by=movement.performed_by,
        )
        assert al.action == 'RECEIVE_INVENTORY'
        assert al.old_values == {'cartons': 0, 'loose_pieces': 0}
        assert al.new_values == {'cartons': 5, 'loose_pieces': 3}
        assert al.ip_address is None

    def test_audit_log_defaults_to_empty_dicts(self, movement):
        al = AuditLog.objects.create(
            movement=movement, action='TEST',
            changed_by=movement.performed_by,
        )
        assert al.old_values == {}
        assert al.new_values == {}

    def test_timestamp_auto_set(self, movement):
        al = AuditLog.objects.create(
            movement=movement, action='TEST',
            changed_by=movement.performed_by,
        )
        assert al.timestamp is not None
