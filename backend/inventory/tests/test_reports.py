import pytest
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from .factories import TileFactory, BatchFactory, InventoryFactory, MovementFactory, UserFactory
from inventory.models import Movement

pytestmark = pytest.mark.django_db


class TestStockSummaryReport:
    def test_stock_summary_returns_correct_counts(self, manager_client):
        tile1 = TileFactory(pieces_per_carton=10)
        tile2 = TileFactory(pieces_per_carton=5)
        batch1 = BatchFactory(tile=tile1)
        batch2 = BatchFactory(tile=tile2)
        InventoryFactory(tile=tile1, batch=batch1, cartons=5, loose_pieces=3)
        InventoryFactory(tile=tile2, batch=batch2, cartons=2, loose_pieces=1)

        resp = manager_client.get('/api/inventory/reports/stock_summary/')
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data

        assert data['total_tiles'] == 2
        assert data['total_cartons'] == 7
        assert data['total_loose_pieces'] == 4
        assert data['total_pieces'] == 64  # 5*10+3 + 2*5+1
        assert data['location_count'] == 2  # InventoryFactory uses Sequence for location
        assert data['total_batches'] == 2
        # tile2 has 2*5+1=11 pieces (<=50), so it's low stock
        assert data['low_stock_count'] == 1

    def test_low_stock_count_with_low_stock(self, manager_client):
        tile = TileFactory(pieces_per_carton=10)
        batch = BatchFactory(tile=tile)
        InventoryFactory(tile=tile, batch=batch, cartons=0, loose_pieces=3, location='Shelf A')

        resp = manager_client.get('/api/inventory/reports/stock_summary/')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['low_stock_count'] == 1

    def test_no_low_stock_if_above_threshold(self, manager_client):
        tile = TileFactory(pieces_per_carton=10)
        batch = BatchFactory(tile=tile)
        InventoryFactory(tile=tile, batch=batch, cartons=6, loose_pieces=0, location='Shelf A')

        resp = manager_client.get('/api/inventory/reports/stock_summary/')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['low_stock_count'] == 0

    def test_viewer_can_access(self, viewer_client):
        resp = viewer_client.get('/api/inventory/reports/stock_summary/')
        assert resp.status_code == status.HTTP_200_OK

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get('/api/inventory/reports/stock_summary/')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestMovementSummaryReport:
    def test_movement_summary_returns_grouped_data(self, manager_client, tile, batch):
        user = UserFactory()
        MovementFactory(
            tile=tile, batch=batch, movement_type='receive',
            cartons_change=1, loose_pieces_change=0,
            previous_cartons=0, previous_loose_pieces=0,
            new_cartons=1, new_loose_pieces=0,
            performed_by=user,
        )
        MovementFactory(
            tile=tile, batch=batch, movement_type='dispatch',
            cartons_change=-1, loose_pieces_change=0,
            previous_cartons=1, previous_loose_pieces=0,
            new_cartons=0, new_loose_pieces=0,
            performed_by=user,
        )

        resp = manager_client.get('/api/inventory/reports/movement_summary/?period=month')
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data

        assert data['period'] == 'month'
        assert len(data['movements']) >= 1
        assert len(data['by_type']) >= 1

    def test_movement_summary_by_type_counts(self, manager_client, tile, batch):
        user = UserFactory()
        for _ in range(3):
            MovementFactory(
                tile=tile, batch=batch, movement_type='receive',
                cartons_change=1, loose_pieces_change=0,
                previous_cartons=0, previous_loose_pieces=0,
                new_cartons=1, new_loose_pieces=0,
                performed_by=user,
            )
        for _ in range(2):
            MovementFactory(
                tile=tile, batch=batch, movement_type='dispatch',
                cartons_change=-1, loose_pieces_change=0,
                previous_cartons=1, previous_loose_pieces=0,
                new_cartons=0, new_loose_pieces=0,
                performed_by=user,
            )

        resp = manager_client.get('/api/inventory/reports/movement_summary/')
        assert resp.status_code == status.HTTP_200_OK
        by_type = {b['movement_type']: b for b in resp.data['by_type']}
        assert by_type['receive']['count'] == 3
        assert by_type['dispatch']['count'] == 2

    def test_viewer_can_access(self, viewer_client):
        resp = viewer_client.get('/api/inventory/reports/movement_summary/')
        assert resp.status_code == status.HTTP_200_OK

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get('/api/inventory/reports/movement_summary/')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestStockByCategoryReport:
    def test_groups_by_category(self, manager_client):
        ft = TileFactory(category='Floor Tile', pieces_per_carton=10)
        wt = TileFactory(category='Wall Tile', pieces_per_carton=15)
        b1 = BatchFactory(tile=ft)
        b2 = BatchFactory(tile=wt)
        InventoryFactory(tile=ft, batch=b1, cartons=5, loose_pieces=3)
        InventoryFactory(tile=wt, batch=b2, cartons=2, loose_pieces=0)

        resp = manager_client.get('/api/inventory/reports/stock_by_category/')
        assert resp.status_code == status.HTTP_200_OK
        cats = {r['tile__category']: r for r in resp.data}
        assert 'Floor Tile' in cats
        assert 'Wall Tile' in cats
        assert cats['Floor Tile']['total_pieces'] == 53  # 5*10+3
        assert cats['Wall Tile']['total_pieces'] == 30  # 2*15+0

    def test_returns_empty_when_no_inventory(self, manager_client):
        resp = manager_client.get('/api/inventory/reports/stock_by_category/')
        assert resp.status_code == status.HTTP_200_OK

    def test_viewer_can_access(self, viewer_client):
        resp = viewer_client.get('/api/inventory/reports/stock_by_category/')
        assert resp.status_code == status.HTTP_200_OK

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get('/api/inventory/reports/stock_by_category/')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestStockByLocationReport:
    def test_groups_by_location(self, manager_client):
        tile = TileFactory(pieces_per_carton=10)
        batch = BatchFactory(tile=tile)
        InventoryFactory(tile=tile, batch=batch, cartons=3, loose_pieces=1, location='WH-A')
        InventoryFactory(tile=tile, batch=batch, cartons=5, loose_pieces=0, location='WH-B')

        resp = manager_client.get('/api/inventory/reports/stock_by_location/')
        assert resp.status_code == status.HTTP_200_OK
        locs = {r['location']: r for r in resp.data}
        assert 'WH-A' in locs
        assert 'WH-B' in locs
        assert locs['WH-A']['total_pieces'] == 31  # 3*10+1
        assert locs['WH-B']['total_pieces'] == 50  # 5*10+0

    def test_viewer_can_access(self, viewer_client):
        resp = viewer_client.get('/api/inventory/reports/stock_by_location/')
        assert resp.status_code == status.HTTP_200_OK

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get('/api/inventory/reports/stock_by_location/')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestFastMoversReport:
    def test_returns_most_moved_tiles(self, manager_client, tile, batch):
        user = UserFactory()
        for _ in range(5):
            MovementFactory(
                tile=tile, batch=batch, movement_type='dispatch',
                cartons_change=-1, loose_pieces_change=0,
                previous_cartons=5, previous_loose_pieces=0,
                new_cartons=4, new_loose_pieces=0,
                performed_by=user,
            )
        tile2 = TileFactory()
        batch2 = BatchFactory(tile=tile2)
        MovementFactory(
            tile=tile2, batch=batch2, movement_type='receive',
            cartons_change=10, loose_pieces_change=0,
            previous_cartons=0, previous_loose_pieces=0,
            new_cartons=10, new_loose_pieces=0,
            performed_by=user,
        )

        resp = manager_client.get('/api/inventory/reports/fast_movers/')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) >= 2
        assert resp.data[0]['movement_count'] >= 5

    def test_accepts_limit_param(self, manager_client, tile, batch):
        user = UserFactory()
        for _ in range(3):
            MovementFactory(
                tile=tile, batch=batch, movement_type='dispatch',
                cartons_change=-1, loose_pieces_change=0,
                previous_cartons=5, previous_loose_pieces=0,
                new_cartons=4, new_loose_pieces=0,
                performed_by=user,
            )

        resp = manager_client.get('/api/inventory/reports/fast_movers/?limit=1')
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1

    def test_viewer_can_access(self, viewer_client):
        resp = viewer_client.get('/api/inventory/reports/fast_movers/')
        assert resp.status_code == status.HTTP_200_OK

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get('/api/inventory/reports/fast_movers/')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestLowStockDetailReport:
    def test_returns_items_below_threshold(self, manager_client):
        tile = TileFactory(pieces_per_carton=10)
        batch = BatchFactory(tile=tile)
        InventoryFactory(tile=tile, batch=batch, cartons=0, loose_pieces=3, location='Shelf A')
        InventoryFactory(tile=tile, batch=batch, cartons=6, loose_pieces=0, location='Shelf B')

        resp = manager_client.get('/api/inventory/reports/low_stock_detail/?threshold=50')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['threshold'] == 50
        assert resp.data['count'] >= 1
        for item in resp.data['results']:
            assert item['total_pieces'] <= 50
            assert item['sku']

    def test_respects_custom_threshold(self, manager_client):
        tile = TileFactory(pieces_per_carton=10)
        batch = BatchFactory(tile=tile)
        InventoryFactory(tile=tile, batch=batch, cartons=1, loose_pieces=0, location='A')

        resp = manager_client.get('/api/inventory/reports/low_stock_detail/?threshold=5')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['count'] == 0  # 1*10=10 > 5

    def test_viewer_can_access(self, viewer_client):
        resp = viewer_client.get('/api/inventory/reports/low_stock_detail/')
        assert resp.status_code == status.HTTP_200_OK

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get('/api/inventory/reports/low_stock_detail/')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestPeriodComparisonReport:
    def test_returns_comparison_data(self, manager_client, tile, batch):
        user = UserFactory()
        now = timezone.now()
        # old movement (outside current period but within previous)
        MovementFactory(
            created_at=now - timedelta(days=400),
            tile=tile, batch=batch, movement_type='receive',
            cartons_change=10, loose_pieces_change=0,
            previous_cartons=0, previous_loose_pieces=0,
            new_cartons=10, new_loose_pieces=0,
            performed_by=user,
        )
        # recent movement
        MovementFactory(
            created_at=now - timedelta(days=1),
            tile=tile, batch=batch, movement_type='dispatch',
            cartons_change=-1, loose_pieces_change=0,
            previous_cartons=10, previous_loose_pieces=0,
            new_cartons=9, new_loose_pieces=0,
            performed_by=user,
        )

        resp = manager_client.get('/api/inventory/reports/period_comparison/?period=month')
        assert resp.status_code == status.HTTP_200_OK
        assert 'comparison' in resp.data
        comp = {c['movement_type']: c for c in resp.data['comparison']}
        assert 'dispatch' in comp
        assert comp['dispatch']['current_count'] >= 1

    def test_viewer_can_access(self, viewer_client):
        resp = viewer_client.get('/api/inventory/reports/period_comparison/')
        assert resp.status_code == status.HTTP_200_OK

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get('/api/inventory/reports/period_comparison/')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
