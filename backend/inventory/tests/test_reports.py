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
