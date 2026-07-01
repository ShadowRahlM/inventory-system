import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import Group

from .factories import UserFactory, TileFactory


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def viewer_user():
    return UserFactory(username='viewer')


@pytest.fixture
def manager_group():
    group, _ = Group.objects.get_or_create(name='inventory_managers')
    return group


@pytest.fixture
def manager_user(manager_group):
    user = UserFactory(username='manager')
    user.groups.add(manager_group)
    return user


@pytest.fixture
def auth_header():
    def _make(user):
        token = str(RefreshToken.for_user(user).access_token)
        return f'Bearer {token}'
    return _make


@pytest.fixture
def auth_client(api_client, auth_header):
    def _make(user):
        api_client.credentials(HTTP_AUTHORIZATION=auth_header(user))
        return api_client
    return _make


@pytest.fixture
def viewer_client(viewer_user, auth_client):
    return auth_client(viewer_user)


@pytest.fixture
def manager_client(manager_user, auth_client):
    return auth_client(manager_user)


@pytest.fixture
def tile():
    return TileFactory(pieces_per_carton=10)


@pytest.fixture
def batch(tile):
    from .factories import BatchFactory
    return BatchFactory(tile=tile)


@pytest.fixture
def inventory(tile, batch):
    from .factories import InventoryFactory
    return InventoryFactory(tile=tile, batch=batch, cartons=10, loose_pieces=5)


ENDPOINTS = {
    'tiles': '/api/inventory/tiles/',
    'batches': '/api/inventory/batches/',
    'inventory': '/api/inventory/inventory/',
    'movements': '/api/inventory/movements/',
    'audit-logs': '/api/inventory/audit-logs/',
    'operations-receive': '/api/inventory/operations/receive/',
    'operations-dispatch': '/api/inventory/operations/issue_dispatch/',
    'operations-adjust': '/api/inventory/operations/adjust/',
    'operations-transfer': '/api/inventory/operations/transfer/',
    'reports-stock-summary': '/api/inventory/reports/stock_summary/',
    'reports-movement-summary': '/api/inventory/reports/movement_summary/',
}
