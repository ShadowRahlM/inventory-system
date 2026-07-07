import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.management import call_command
from io import StringIO

User = get_user_model()

pytestmark = pytest.mark.django_db

REGISTER_URL = '/api/auth/register/'


class TestRegistration:
    def test_register_success(self, api_client):
        resp = api_client.post(REGISTER_URL, {'username': 'newuser', 'password': 'testpass123'}, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data == {'detail': 'Registration successful'}
        assert User.objects.filter(username='newuser').exists()
        user = User.objects.get(username='newuser')
        assert user.check_password('testpass123')
        assert user.is_active
        assert not user.is_superuser
        assert not user.is_staff

    def test_register_duplicate_username(self, api_client):
        api_client.post(REGISTER_URL, {'username': 'dupuser', 'password': 'pass1234'}, format='json')
        resp = api_client.post(REGISTER_URL, {'username': 'dupuser', 'password': 'otherpass'}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert 'username' in resp.data
        assert User.objects.filter(username='dupuser').count() == 1

    def test_register_no_password(self, api_client):
        resp = api_client.post(REGISTER_URL, {'username': 'nopass'}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_short_password(self, api_client):
        resp = api_client.post(REGISTER_URL, {'username': 'shortpass', 'password': 'ab'}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_creates_normal_user(self, api_client):
        resp = api_client.post(REGISTER_URL, {'username': 'regular', 'password': 'secure123'}, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        user = User.objects.get(username='regular')
        assert not user.is_superuser
        assert not user.is_staff
        assert user.groups.count() == 0

    def test_new_user_can_login(self, api_client):
        api_client.post(REGISTER_URL, {'username': 'logmein', 'password': 'letmein123'}, format='json')
        resp = api_client.post('/api/auth/token/', {'username': 'logmein', 'password': 'letmein123'}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert 'access' in resp.data


class TestSetupInventoryCommand:
    def test_creates_default_users(self):
        out = StringIO()
        call_command('setup_inventory', stdout=out)
        assert User.objects.filter(username='admin').exists()
        assert User.objects.filter(username='manager').exists()
        assert User.objects.filter(username='viewer').exists()

    def test_does_not_reset_existing_user_password(self):
        call_command('setup_inventory')
        admin = User.objects.get(username='admin')
        admin.set_password('custom_admin_pass')
        admin.save()
        assert admin.check_password('custom_admin_pass')

        out = StringIO()
        call_command('setup_inventory', stdout=out)
        admin.refresh_from_db()
        assert admin.check_password('custom_admin_pass')
        assert 'Skipped' in out.getvalue()
        assert 'Fixed password' not in out.getvalue()
