import pytest
from django.core.exceptions import ValidationError
from django.contrib.auth.models import Group

from inventory.services import InventoryService
from inventory.models import Movement, AuditLog, Inventory
from .factories import TileFactory, BatchFactory, InventoryFactory, UserFactory


pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def performer():
    u = UserFactory(username='performer')
    u.groups.add(Group.objects.get_or_create(name='inventory_managers')[0])
    return u


@pytest.fixture
def tile():
    return TileFactory(pieces_per_carton=10)


@pytest.fixture
def batch(tile):
    return BatchFactory(tile=tile, batch_number='B-ORIG', is_active=True)


@pytest.fixture
def inactive_batch(tile):
    return BatchFactory(tile=tile, batch_number='B-INACTIVE', is_active=False)


@pytest.fixture
def inventory(tile, batch):
    return InventoryFactory(tile=tile, batch=batch, cartons=10, loose_pieces=5, location='WH-A')


# ---------------------------------------------------------------------------
# receive_inventory
# ---------------------------------------------------------------------------

class TestReceive:
    def test_receive_at_new_location_creates_inventory_and_movement(self, tile, performer):
        inv, mov = InventoryService.receive_inventory(
            tile_id=tile.id, batch_number='B-NEW', production_date='2026-06-01',
            supplier='Sup', cartons=5, loose_pieces=3, location='WH-Z',
            performed_by=performer,
        )
        assert inv.cartons == 5
        assert inv.loose_pieces == 3
        assert inv.location == 'WH-Z'
        assert mov.movement_type == 'RECEIVING'
        assert mov.cartons_change == 5
        assert mov.loose_pieces_change == 3
        assert Movement.objects.count() == 1
        assert AuditLog.objects.count() == 1

    def test_receive_zero_quantity_raises_error(self, tile, performer):
        with pytest.raises(ValidationError, match='at least one'):
            InventoryService.receive_inventory(
                tile_id=tile.id, batch_number='B-ZERO', production_date='2026-06-01',
                supplier='Sup', cartons=0, loose_pieces=0, location='WH-A',
                performed_by=performer,
            )

    def test_reuse_existing_batch_with_matching_metadata(self, tile, batch, performer):
        inv, mov = InventoryService.receive_inventory(
            tile_id=tile.id, batch_number=batch.batch_number,
            production_date=batch.production_date, supplier=batch.supplier,
            cartons=3, loose_pieces=0, location='WH-B', performed_by=performer,
        )
        assert inv.batch == batch
        assert inv.cartons == 3
        assert inv.location == 'WH-B'

    def test_reuse_existing_batch_with_conflicting_supplier_raises_error(self, tile, batch, performer):
        with pytest.raises(ValidationError, match='conflicting'):
            InventoryService.receive_inventory(
                tile_id=tile.id, batch_number=batch.batch_number,
                production_date=batch.production_date, supplier='DifferentSupplier',
                cartons=1, loose_pieces=0, location='WH-C', performed_by=performer,
            )

    def test_reuse_existing_batch_with_conflicting_production_date_raises_error(self, tile, batch, performer):
        with pytest.raises(ValidationError, match='conflicting'):
            InventoryService.receive_inventory(
                tile_id=tile.id, batch_number=batch.batch_number,
                production_date='2025-01-01', supplier=batch.supplier,
                cartons=1, loose_pieces=0, location='WH-C', performed_by=performer,
            )

    def test_inactive_batch_raises_error(self, tile, inactive_batch, performer):
        with pytest.raises(ValidationError, match='not active'):
            InventoryService.receive_inventory(
                tile_id=tile.id, batch_number=inactive_batch.batch_number,
                production_date=inactive_batch.production_date,
                supplier=inactive_batch.supplier,
                cartons=1, loose_pieces=0, location='WH-D', performed_by=performer,
            )

    def test_add_to_existing_inventory(self, tile, batch, inventory, performer):
        inv, mov = InventoryService.receive_inventory(
            tile_id=tile.id, batch_number=batch.batch_number,
            production_date=batch.production_date, supplier=batch.supplier,
            cartons=3, loose_pieces=2, location=inventory.location,
            performed_by=performer,
        )
        assert inv.id == inventory.id
        assert inv.cartons == 13
        assert inv.loose_pieces == 7


# ---------------------------------------------------------------------------
# dispatch_inventory
# ---------------------------------------------------------------------------

class TestDispatch:
    def test_dispatch_cartons_only(self, tile, batch, inventory, performer):
        inv, mov = InventoryService.dispatch_inventory(
            tile_id=tile.id, batch_id=batch.id,
            cartons=3, loose_pieces=0, location='WH-A',
            performed_by=performer,
        )
        assert inv.cartons == 7
        assert inv.loose_pieces == 5
        assert mov.movement_type == 'DISPATCH'

    def test_dispatch_loose_pieces_only(self, tile, batch, inventory, performer):
        inv, mov = InventoryService.dispatch_inventory(
            tile_id=tile.id, batch_id=batch.id,
            cartons=0, loose_pieces=3, location='WH-A',
            performed_by=performer,
        )
        assert inv.cartons == 10
        assert inv.loose_pieces == 2

    def test_dispatch_triggers_carton_breakdown(self, tile, batch, inventory, performer):
        inv, mov = InventoryService.dispatch_inventory(
            tile_id=tile.id, batch_id=batch.id,
            cartons=0, loose_pieces=12, location='WH-A',
            performed_by=performer,
        )
        assert inv.cartons == 9
        assert inv.loose_pieces == 3

    def test_dispatch_zero_quantity_raises_error(self, tile, batch, performer):
        with pytest.raises(ValidationError, match='at least one'):
            InventoryService.dispatch_inventory(
                tile_id=tile.id, batch_id=batch.id,
                cartons=0, loose_pieces=0, location='WH-A',
                performed_by=performer,
            )

    def test_dispatch_insufficient_cartons_raises_error(self, tile, batch, inventory, performer):
        with pytest.raises(ValidationError, match='Insufficient cartons'):
            InventoryService.dispatch_inventory(
                tile_id=tile.id, batch_id=batch.id,
                cartons=99, loose_pieces=0, location='WH-A',
                performed_by=performer,
            )

    def test_dispatch_insufficient_total_pieces_raises_error(self, tile, batch, inventory, performer):
        with pytest.raises(ValidationError, match='Insufficient total pieces'):
            InventoryService.dispatch_inventory(
                tile_id=tile.id, batch_id=batch.id,
                cartons=10, loose_pieces=10, location='WH-A',
                performed_by=performer,
            )

    def test_dispatch_inactive_batch_raises_error(self, tile, inactive_batch, performer):
        with pytest.raises(ValidationError, match='not active'):
            InventoryService.dispatch_inventory(
                tile_id=tile.id, batch_id=inactive_batch.id,
                cartons=1, loose_pieces=0, location='WH-A',
                performed_by=performer,
            )

    def test_dispatch_creates_movement_and_audit_log(self, tile, batch, inventory, performer):
        InventoryService.dispatch_inventory(
            tile_id=tile.id, batch_id=batch.id,
            cartons=2, loose_pieces=1, location='WH-A',
            performed_by=performer,
        )
        assert Movement.objects.count() == 1
        assert AuditLog.objects.count() == 1
        mov = Movement.objects.first()
        assert mov.cartons_change == -2
        assert mov.loose_pieces_change == -1

    def test_dispatch_with_reference(self, tile, batch, inventory, performer):
        inv, mov = InventoryService.dispatch_inventory(
            tile_id=tile.id, batch_id=batch.id,
            cartons=1, loose_pieces=0, location='WH-A',
            performed_by=performer, reference='ORD-123',
        )
        assert mov.reference == 'ORD-123'

    def test_dispatch_exact_total_pieces(self, tile, batch, inventory, performer):
        inv, mov = InventoryService.dispatch_inventory(
            tile_id=tile.id, batch_id=batch.id,
            cartons=10, loose_pieces=5, location='WH-A',
            performed_by=performer,
        )
        assert inv.cartons == 0
        assert inv.loose_pieces == 0

    def test_dispatch_breakdown_consumes_exact_cartons(self, tile, batch, performer):
        inv = InventoryFactory(tile=tile, batch=batch, cartons=3, loose_pieces=0, location='WH-DB')
        result, mov = InventoryService.dispatch_inventory(
            tile_id=tile.id, batch_id=batch.id,
            cartons=0, loose_pieces=30, location='WH-DB',
            performed_by=performer,
        )
        assert result.cartons == 0
        assert result.loose_pieces == 0

    def test_dispatch_nonexistent_location_raises_error(self, tile, batch, performer):
        with pytest.raises(Inventory.DoesNotExist):
            InventoryService.dispatch_inventory(
                tile_id=tile.id, batch_id=batch.id,
                cartons=1, loose_pieces=0, location='NOWHERE',
                performed_by=performer,
            )


# ---------------------------------------------------------------------------
# adjust_inventory
# ---------------------------------------------------------------------------

class TestAdjust:
    def test_increase_stock(self, tile, batch, inventory, performer):
        inv, mov = InventoryService.adjust_inventory(
            tile_id=tile.id, batch_id=batch.id, location='WH-A',
            new_cartons=20, new_loose_pieces=10,
            reason='Inventory count correction', performed_by=performer,
        )
        assert inv.cartons == 20
        assert inv.loose_pieces == 10
        assert mov.cartons_change == 10
        assert mov.loose_pieces_change == 5

    def test_decrease_stock(self, tile, batch, inventory, performer):
        inv, mov = InventoryService.adjust_inventory(
            tile_id=tile.id, batch_id=batch.id, location='WH-A',
            new_cartons=5, new_loose_pieces=2,
            reason='Damage write-off', performed_by=performer,
        )
        assert inv.cartons == 5
        assert inv.loose_pieces == 2
        assert mov.cartons_change == -5
        assert mov.loose_pieces_change == -3

    def test_negative_values_raises_error(self, tile, batch, inventory, performer):
        with pytest.raises(ValidationError, match='cannot be negative'):
            InventoryService.adjust_inventory(
                tile_id=tile.id, batch_id=batch.id, location='WH-A',
                new_cartons=-1, new_loose_pieces=0,
                reason='Bad data', performed_by=performer,
            )

    def test_creates_movement_and_audit_log(self, tile, batch, inventory, performer):
        InventoryService.adjust_inventory(
            tile_id=tile.id, batch_id=batch.id, location='WH-A',
            new_cartons=15, new_loose_pieces=5,
            reason='Corrected', performed_by=performer,
        )
        assert Movement.objects.count() == 1
        assert AuditLog.objects.count() == 1

    def test_adjust_to_zero(self, tile, batch, inventory, performer):
        inv, mov = InventoryService.adjust_inventory(
            tile_id=tile.id, batch_id=batch.id, location='WH-A',
            new_cartons=0, new_loose_pieces=0,
            reason='Write off all', performed_by=performer,
        )
        assert inv.cartons == 0
        assert inv.loose_pieces == 0
        assert mov.cartons_change == -10
        assert mov.loose_pieces_change == -5

    def test_adjust_nonexistent_location_raises_error(self, tile, batch, performer):
        with pytest.raises(Inventory.DoesNotExist):
            InventoryService.adjust_inventory(
                tile_id=tile.id, batch_id=batch.id, location='NOWHERE',
                new_cartons=5, new_loose_pieces=0,
                reason='Not found', performed_by=performer,
            )


# ---------------------------------------------------------------------------
# transfer_inventory
# ---------------------------------------------------------------------------

class TestTransfer:
    def test_simple_transfer(self, tile, batch, inventory, performer):
        src, dst, mov = InventoryService.transfer_inventory(
            tile_id=tile.id, batch_id=batch.id,
            from_location='WH-A', to_location='WH-B',
            cartons=3, loose_pieces=2, performed_by=performer,
        )
        assert src.cartons == 7
        assert src.loose_pieces == 3
        assert dst.cartons == 3
        assert dst.loose_pieces == 2
        assert dst.location == 'WH-B'

    def test_transfer_with_carton_breakdown(self, tile, batch, inventory, performer):
        src, dst, mov = InventoryService.transfer_inventory(
            tile_id=tile.id, batch_id=batch.id,
            from_location='WH-A', to_location='WH-B',
            cartons=0, loose_pieces=12, performed_by=performer,
        )
        assert src.cartons == 9
        assert src.loose_pieces == 3
        assert dst.cartons == 0
        assert dst.loose_pieces == 12

    def test_same_location_raises_error(self, tile, batch, inventory, performer):
        with pytest.raises(ValidationError, match='different'):
            InventoryService.transfer_inventory(
                tile_id=tile.id, batch_id=batch.id,
                from_location='WH-A', to_location='WH-A',
                cartons=1, loose_pieces=0, performed_by=performer,
            )

    def test_zero_quantity_raises_error(self, tile, batch, performer):
        with pytest.raises(ValidationError, match='at least one'):
            InventoryService.transfer_inventory(
                tile_id=tile.id, batch_id=batch.id,
                from_location='WH-A', to_location='WH-B',
                cartons=0, loose_pieces=0, performed_by=performer,
            )

    def test_insufficient_stock_raises_error(self, tile, batch, inventory, performer):
        with pytest.raises(ValidationError):
            InventoryService.transfer_inventory(
                tile_id=tile.id, batch_id=batch.id,
                from_location='WH-A', to_location='WH-B',
                cartons=99, loose_pieces=0, performed_by=performer,
            )

    def test_creates_movement_and_audit_log(self, tile, batch, inventory, performer):
        InventoryService.transfer_inventory(
            tile_id=tile.id, batch_id=batch.id,
            from_location='WH-A', to_location='WH-B',
            cartons=2, loose_pieces=1, performed_by=performer,
        )
        assert Movement.objects.count() == 1
        assert AuditLog.objects.count() == 1

    def test_transfer_to_existing_location_merges_stock(self, tile, batch, performer):
        src = InventoryFactory(tile=tile, batch=batch, cartons=5, loose_pieces=0, location='WH-SRC')
        dst = InventoryFactory(tile=tile, batch=batch, cartons=3, loose_pieces=2, location='WH-DST')
        src_result, dst_result, mov = InventoryService.transfer_inventory(
            tile_id=tile.id, batch_id=batch.id,
            from_location='WH-SRC', to_location='WH-DST',
            cartons=2, loose_pieces=0, performed_by=performer,
        )
        assert src_result.cartons == 3
        assert dst_result.cartons == 5
        assert dst_result.loose_pieces == 2

    def test_transfer_inactive_batch_raises_error(self, tile, inactive_batch, performer):
        InventoryFactory(tile=tile, batch=inactive_batch, cartons=5, loose_pieces=0, location='WH-IA')
        with pytest.raises(ValidationError, match='not active'):
            InventoryService.transfer_inventory(
                tile_id=tile.id, batch_id=inactive_batch.id,
                from_location='WH-IA', to_location='WH-B',
                cartons=1, loose_pieces=0, performed_by=performer,
            )

    def test_transfer_all_stock_zeros_source(self, tile, batch, inventory, performer):
        src, dst, mov = InventoryService.transfer_inventory(
            tile_id=tile.id, batch_id=batch.id,
            from_location='WH-A', to_location='WH-ZERO',
            cartons=10, loose_pieces=5, performed_by=performer,
        )
        assert src.cartons == 0
        assert src.loose_pieces == 0

    def test_transfer_with_reference(self, tile, batch, inventory, performer):
        src, dst, mov = InventoryService.transfer_inventory(
            tile_id=tile.id, batch_id=batch.id,
            from_location='WH-A', to_location='WH-REF',
            cartons=1, loose_pieces=0, performed_by=performer,
            reference='TRF-001',
        )
        assert mov.reference == 'TRF-001'


# ---------------------------------------------------------------------------
# get_available_stock
# ---------------------------------------------------------------------------

class TestAvailableStock:
    def test_returns_correct_totals(self, tile, batch, inventory, performer):
        InventoryService.receive_inventory(
            tile_id=tile.id, batch_number='B-EXTRA', production_date='2026-06-01',
            supplier='Sup', cartons=5, loose_pieces=0, location='WH-B',
            performed_by=performer,
        )
        result = InventoryService.get_available_stock(tile.id)
        assert result['sku'] == tile.sku
        assert result['total_cartons'] == 15
        assert result['total_loose_pieces'] == 5
        assert len(result['locations']) == 2

    def test_excludes_inactive_batches(self, tile, performer):
        active = BatchFactory(tile=tile, batch_number='B-ACTIVE', is_active=True)
        inactive = BatchFactory(tile=tile, batch_number='B-GHOST', is_active=False)
        InventoryFactory(tile=tile, batch=active, cartons=5, loose_pieces=0)
        InventoryFactory(tile=tile, batch=inactive, cartons=99, loose_pieces=99)
        result = InventoryService.get_available_stock(tile.id)
        assert result['total_cartons'] == 5


# ---------------------------------------------------------------------------
# Atomicity — all operations roll back on failure
# ---------------------------------------------------------------------------

class TestAtomicity:
    def test_receive_rolls_back_on_validation_error(self, tile, performer):
        assert Movement.objects.count() == 0
        assert AuditLog.objects.count() == 0
        with pytest.raises(ValidationError):
            InventoryService.receive_inventory(
                tile_id=tile.id, batch_number='B-ATOMIC', production_date='2026-06-01',
                supplier='Sup', cartons=0, loose_pieces=0, location='WH-A',
                performed_by=performer,
            )
        assert Movement.objects.count() == 0
        assert AuditLog.objects.count() == 0

    def test_dispatch_rolls_back_on_validation_error(self, tile, batch, performer):
        assert Movement.objects.count() == 0
        with pytest.raises(ValidationError):
            InventoryService.dispatch_inventory(
                tile_id=tile.id, batch_id=batch.id,
                cartons=0, loose_pieces=0, location='WH-A',
                performed_by=performer,
            )
        assert Movement.objects.count() == 0

    def test_adjust_rolls_back_on_validation_error(self, tile, batch, inventory, performer):
        assert Movement.objects.count() == 0
        with pytest.raises(ValidationError):
            InventoryService.adjust_inventory(
                tile_id=tile.id, batch_id=batch.id, location='WH-A',
                new_cartons=-1, new_loose_pieces=0,
                reason='bad', performed_by=performer,
            )
        assert Movement.objects.count() == 0

    def test_transfer_rolls_back_on_validation_error(self, tile, batch, inventory, performer):
        assert Movement.objects.count() == 0
        with pytest.raises(ValidationError):
            InventoryService.transfer_inventory(
                tile_id=tile.id, batch_id=batch.id,
                from_location='WH-A', to_location='WH-A',
                cartons=1, loose_pieces=0, performed_by=performer,
            )
        assert Movement.objects.count() == 0
