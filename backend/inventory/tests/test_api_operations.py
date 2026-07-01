import pytest
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from inventory.models import Tile, Batch, Inventory, Movement, AuditLog
from inventory.tests.conftest import ENDPOINTS


pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Full receive → dispatch → transfer flow
# ---------------------------------------------------------------------------

class TestFullFlow:
    def test_receive_create_tile_then_receive_then_dispatch_then_transfer(self, manager_client):
        # 1. Create a tile
        tile_resp = manager_client.post(ENDPOINTS['tiles'], {
            'sku': 'FLOW-001', 'name': 'Flow Tile', 'dimensions': '30x30',
            'pieces_per_carton': 10, 'category': 'Floor',
        }, format='json')
        assert tile_resp.status_code == status.HTTP_201_CREATED
        tile_id = tile_resp.json()['id']

        # 2. Receive inventory
        recv_resp = manager_client.post(ENDPOINTS['operations-receive'], {
            'tile_id': tile_id, 'batch_number': 'FLOW-BATCH',
            'production_date': '2026-06-01', 'supplier': 'FlowSup',
            'cartons': 10, 'loose_pieces': 5, 'location': 'WH-1',
        }, format='json')
        assert recv_resp.status_code == status.HTTP_201_CREATED
        batch_id = recv_resp.json()['data']['inventory']['batch']

        # Verify inventory state
        inv_resp = manager_client.get(ENDPOINTS['inventory'])
        assert inv_resp.status_code == status.HTTP_200_OK
        assert inv_resp.json()['count'] == 1
        assert inv_resp.json()['results'][0]['cartons'] == 10

        # 3. Dispatch some inventory
        disp_resp = manager_client.post(ENDPOINTS['operations-dispatch'], {
            'tile_id': tile_id, 'batch_id': batch_id,
            'cartons': 3, 'loose_pieces': 2, 'location': 'WH-1',
        }, format='json')
        assert disp_resp.status_code == status.HTTP_200_OK

        inv_resp2 = manager_client.get(ENDPOINTS['inventory'])
        inv = inv_resp2.json()['results'][0]
        assert inv['cartons'] == 7
        assert inv['loose_pieces'] == 3

        # 4. Transfer to another location
        xfer_resp = manager_client.post(ENDPOINTS['operations-transfer'], {
            'tile_id': tile_id, 'batch_id': batch_id,
            'from_location': 'WH-1', 'to_location': 'WH-2',
            'cartons': 2, 'loose_pieces': 1,
        }, format='json')
        assert xfer_resp.status_code == status.HTTP_200_OK

        inv_resp3 = manager_client.get(ENDPOINTS['inventory'])
        results = inv_resp3.json()['results']
        assert len(results) == 2
        wh1 = next(r for r in results if r['location'] == 'WH-1')
        wh2 = next(r for r in results if r['location'] == 'WH-2')
        assert wh1['cartons'] == 5
        assert wh1['loose_pieces'] == 2
        assert wh2['cartons'] == 2
        assert wh2['loose_pieces'] == 1

        # 5. Verify movements and audit logs were created
        mov_resp = manager_client.get(ENDPOINTS['movements'])
        assert mov_resp.json()['count'] == 3

        audit_resp = manager_client.get(ENDPOINTS['audit-logs'])
        assert audit_resp.json()['count'] == 3

    def test_available_stock_endpoint(self, manager_client):
        tile_resp = manager_client.post(ENDPOINTS['tiles'], {
            'sku': 'STOCK-001', 'name': 'Stock Tile', 'dimensions': '30x30',
            'pieces_per_carton': 10, 'category': 'Wall',
        }, format='json')
        tile_id = tile_resp.json()['id']

        manager_client.post(ENDPOINTS['operations-receive'], {
            'tile_id': tile_id, 'batch_number': 'STK-B1',
            'production_date': '2026-06-01', 'supplier': 'S1',
            'cartons': 5, 'loose_pieces': 3, 'location': 'WH-A',
        }, format='json')

        stock_resp = manager_client.get(
            f"{ENDPOINTS['inventory']}available_stock/?tile_id={tile_id}"
        )
        assert stock_resp.status_code == status.HTTP_200_OK
        data = stock_resp.json()
        assert data['total_cartons'] == 5
        assert data['total_loose_pieces'] == 3


# ---------------------------------------------------------------------------
# Movement and AuditLog are read-only
# ---------------------------------------------------------------------------

class TestReadOnlyEndpoints:
    def test_cannot_create_movement(self, manager_client):
        resp = manager_client.post(ENDPOINTS['movements'], {}, format='json')
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_cannot_create_audit_log(self, manager_client):
        resp = manager_client.post(ENDPOINTS['audit-logs'], {}, format='json')
        assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_cannot_update_inventory(self, manager_client, tile):
        from .factories import TileFactory
        t = TileFactory()
        resp = manager_client.put(f"{ENDPOINTS['inventory']}{t.id}/", {}, format='json')
        assert resp.status_code in (status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_receive_twice_at_same_location_adds_stock(self, manager_client, tile):
        tile_id = tile.id
        manager_client.post(ENDPOINTS['operations-receive'], {
            'tile_id': tile_id, 'batch_number': 'E-BATCH',
            'production_date': '2026-06-01', 'supplier': 'Sup',
            'cartons': 5, 'loose_pieces': 0, 'location': 'WH-E',
        }, format='json')
        manager_client.post(ENDPOINTS['operations-receive'], {
            'tile_id': tile_id, 'batch_number': 'E-BATCH',
            'production_date': '2026-06-01', 'supplier': 'Sup',
            'cartons': 3, 'loose_pieces': 2, 'location': 'WH-E',
        }, format='json')
        inv_resp = manager_client.get(ENDPOINTS['inventory'])
        inv = inv_resp.json()['results'][0]
        assert inv['cartons'] == 8
        assert inv['loose_pieces'] == 2

    def test_dispatch_exact_all_stock(self, manager_client, tile):
        tile_id = tile.id
        manager_client.post(ENDPOINTS['operations-receive'], {
            'tile_id': tile_id, 'batch_number': 'E-BATCH2',
            'production_date': '2026-06-01', 'supplier': 'Sup',
            'cartons': 2, 'loose_pieces': 0, 'location': 'WH-E',
        }, format='json')
        batch_id = manager_client.get(ENDPOINTS['batches']).json()['results'][0]['id']
        disp_resp = manager_client.post(ENDPOINTS['operations-dispatch'], {
            'tile_id': tile_id, 'batch_id': batch_id,
            'cartons': 2, 'loose_pieces': 0, 'location': 'WH-E',
        }, format='json')
        assert disp_resp.status_code == status.HTTP_200_OK
        inv_resp = manager_client.get(ENDPOINTS['inventory'])
        inv = inv_resp.json()['results'][0]
        assert inv['cartons'] == 0
        assert inv['loose_pieces'] == 0
