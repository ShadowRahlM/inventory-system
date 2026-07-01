import pytest
from rest_framework import status

from inventory.tests.conftest import ENDPOINTS

pytestmark = pytest.mark.django_db


class TestUnauthenticated:
    def _assert_401(self, api_client, method, url, data=None):
        req = getattr(api_client, method)
        resp = req(url, data or {}, format='json')
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_tiles(self, api_client):
        self._assert_401(api_client, 'get', ENDPOINTS['tiles'])

    def test_post_tiles(self, api_client):
        self._assert_401(api_client, 'post', ENDPOINTS['tiles'])

    def test_get_batches(self, api_client):
        self._assert_401(api_client, 'get', ENDPOINTS['batches'])

    def test_post_batches(self, api_client):
        self._assert_401(api_client, 'post', ENDPOINTS['batches'])

    def test_get_inventory(self, api_client):
        self._assert_401(api_client, 'get', ENDPOINTS['inventory'])

    def test_get_movements(self, api_client):
        self._assert_401(api_client, 'get', ENDPOINTS['movements'])

    def test_get_audit_logs(self, api_client):
        self._assert_401(api_client, 'get', ENDPOINTS['audit-logs'])

    def test_post_receive(self, api_client):
        self._assert_401(api_client, 'post', ENDPOINTS['operations-receive'])

    def test_post_dispatch(self, api_client):
        self._assert_401(api_client, 'post', ENDPOINTS['operations-dispatch'])

    def test_post_adjust(self, api_client):
        self._assert_401(api_client, 'post', ENDPOINTS['operations-adjust'])

    def test_post_transfer(self, api_client):
        self._assert_401(api_client, 'post', ENDPOINTS['operations-transfer'])


class TestViewerAccess:
    def _assert_200(self, viewer_client, url):
        resp = viewer_client.get(url)
        assert resp.status_code == status.HTTP_200_OK

    def _assert_403(self, viewer_client, method, url, data=None):
        req = getattr(viewer_client, method)
        resp = req(url, data or {}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_read_tiles(self, viewer_client):
        self._assert_200(viewer_client, ENDPOINTS['tiles'])

    def test_cannot_create_tile(self, viewer_client):
        self._assert_403(viewer_client, 'post', ENDPOINTS['tiles'],
                         {'sku': 'T1', 'name': 'T', 'dimensions': '30x30', 'pieces_per_carton': 10, 'category': 'Wall'})

    def test_read_batches(self, viewer_client):
        self._assert_200(viewer_client, ENDPOINTS['batches'])

    def test_cannot_create_batch(self, viewer_client):
        self._assert_403(viewer_client, 'post', ENDPOINTS['batches'])

    def test_read_inventory(self, viewer_client):
        self._assert_200(viewer_client, ENDPOINTS['inventory'])

    def test_read_movements(self, viewer_client):
        self._assert_200(viewer_client, ENDPOINTS['movements'])

    def test_read_audit_logs(self, viewer_client):
        self._assert_200(viewer_client, ENDPOINTS['audit-logs'])

    def test_cannot_receive(self, viewer_client):
        self._assert_403(viewer_client, 'post', ENDPOINTS['operations-receive'])

    def test_cannot_dispatch(self, viewer_client):
        self._assert_403(viewer_client, 'post', ENDPOINTS['operations-dispatch'])

    def test_cannot_adjust(self, viewer_client):
        self._assert_403(viewer_client, 'post', ENDPOINTS['operations-adjust'])

    def test_cannot_transfer(self, viewer_client):
        self._assert_403(viewer_client, 'post', ENDPOINTS['operations-transfer'])


class TestManagerAccess:
    def _assert_200(self, manager_client, url):
        resp = manager_client.get(url)
        assert resp.status_code == status.HTTP_200_OK

    def test_read_tiles(self, manager_client):
        self._assert_200(manager_client, ENDPOINTS['tiles'])

    def test_create_tile(self, manager_client):
        resp = manager_client.post(ENDPOINTS['tiles'],
                                   {'sku': 'MGR-TILE', 'name': 'Mgr Tile', 'dimensions': '30x30',
                                    'pieces_per_carton': 10, 'category': 'Floor'}, format='json')
        assert resp.status_code == status.HTTP_201_CREATED

    def test_read_batches(self, manager_client):
        self._assert_200(manager_client, ENDPOINTS['batches'])

    def test_read_inventory(self, manager_client):
        self._assert_200(manager_client, ENDPOINTS['inventory'])

    def test_read_movements(self, manager_client):
        self._assert_200(manager_client, ENDPOINTS['movements'])

    def test_read_audit_logs(self, manager_client):
        self._assert_200(manager_client, ENDPOINTS['audit-logs'])

    def test_operations_not_forbidden(self, manager_client):
        for url in [ENDPOINTS['operations-receive'], ENDPOINTS['operations-dispatch'],
                    ENDPOINTS['operations-adjust'], ENDPOINTS['operations-transfer']]:
            resp = manager_client.post(url, {}, format='json')
            assert resp.status_code != status.HTTP_403_FORBIDDEN, f'{url} returned 403'

    def test_receive_validation_error(self, manager_client):
        resp = manager_client.post(ENDPOINTS['operations-receive'], {}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'tile_id' in resp.json()['errors']

    def test_dispatch_validation_error(self, manager_client):
        resp = manager_client.post(ENDPOINTS['operations-dispatch'], {}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_adjust_validation_error(self, manager_client):
        resp = manager_client.post(ENDPOINTS['operations-adjust'], {}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_transfer_validation_error(self, manager_client):
        resp = manager_client.post(ENDPOINTS['operations-transfer'], {}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
