import json
import logging
from datetime import datetime, timezone

import requests
from asgiref.sync import async_to_sync
from celery import shared_task
from django.conf import settings
from django.db import connection
from django.db.models import Model
from django.utils.dateparse import parse_datetime

from inventory.models import (
    Tile, Batch, Inventory, Movement, AuditLog,
    Customer, Supplier, SalesOrder, PurchaseOrder, Notification,
    SyncState, SyncConflict,
)

logger = logging.getLogger(__name__)

SYNCABLE_MODELS = {
    'Tile': {'model': Tile, 'queryset': Tile.objects.all()},
    'Batch': {'model': Batch, 'queryset': Batch.objects.select_related('tile').all()},
    'Inventory': {'model': Inventory, 'queryset': Inventory.objects.select_related('tile', 'batch').all()},
    'Movement': {'model': Movement, 'queryset': Movement.objects.select_related('tile', 'batch').all()},
    'Customer': {'model': Customer, 'queryset': Customer.objects.all()},
    'Supplier': {'model': Supplier, 'queryset': Supplier.objects.all()},
    'SalesOrder': {'model': SalesOrder, 'queryset': SalesOrder.objects.select_related('customer').all()},
    'PurchaseOrder': {'model': PurchaseOrder, 'queryset': PurchaseOrder.objects.select_related('supplier').all()},
    'Notification': {'model': Notification, 'queryset': Notification.objects.all()},
}

APPEND_ONLY_MODELS = {'Movement', 'Notification', 'AuditLog'}


def get_auth_token(peer_url: str) -> str | None:
    """Get an access token from the peer using default admin credentials."""
    try:
        resp = requests.post(
            f"{peer_url.rstrip('/')}/api/auth/token/",
            json={'username': 'admin', 'password': 'admin123'},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json().get('access')
    except requests.RequestException:
        pass
    return None


def model_to_dict(instance: Model) -> dict:
    """Convert a model instance to a flat dict suitable for API submission."""
    data = {}
    for field in instance._meta.concrete_fields:
        val = getattr(instance, field.attname)
        if isinstance(val, datetime):
            val = val.isoformat()
        data[field.attname] = val
    return data


def get_timestamp_field(model_name: str) -> str:
    if model_name in APPEND_ONLY_MODELS:
        return 'created_at'
    return 'updated_at'


def sync_from_peer(peer_url: str, model_name: str, token: str) -> int:
    """Pull changes from a peer for a given model. Returns count of pulled records."""
    model_info = SYNCABLE_MODELS[model_name]
    model_cls = model_info['model']

    state, _ = SyncState.objects.get_or_create(
        peer_url=peer_url,
        model_name=model_name,
        defaults={'last_synced_at': datetime(2020, 1, 1, tzinfo=timezone.utc)},
    )

    ts_field = get_timestamp_field(model_name)
    url = f"{peer_url.rstrip('/')}/api/inventory/{model_name.lower()}s/?{ts_field}_since={state.last_synced_at.isoformat()}"

    headers = {'Authorization': f'Bearer {token}'}
    pulled = 0

    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code != 200:
            logger.warning("Sync from %s for %s returned %s", peer_url, model_name, resp.status_code)
            return 0

        data = resp.json()
        records = data.get('results', [])

        for record in records:
            record_id = record.get('id')
            if not record_id:
                continue

            remote_ts = parse_datetime(record.get(ts_field))
            if model_name in APPEND_ONLY_MODELS:
                _, created = model_cls.objects.get_or_create(
                    id=record_id,
                    defaults=record,
                )
                if created:
                    pulled += 1
                continue

            try:
                local = model_cls.objects.get(id=record_id)
                local_ts_str = getattr(local, ts_field)
                if isinstance(local_ts_str, datetime):
                    local_ts = local_ts_str
                else:
                    local_ts = parse_datetime(local_ts_str)

                if remote_ts and local_ts and remote_ts > local_ts:
                    for key, val in record.items():
                        if key != 'id' and hasattr(local, key):
                            setattr(local, key, val)
                    local.save()
                    pulled += 1
                elif remote_ts and local_ts and remote_ts > local_ts.replace(tzinfo=None) if local_ts.tzinfo else remote_ts > local_ts:
                    remote_ts = remote_ts.replace(tzinfo=timezone.utc) if remote_ts and not remote_ts.tzinfo else remote_ts
                    local_ts = local_ts.replace(tzinfo=timezone.utc) if local_ts and not local_ts.tzinfo else local_ts
                    if remote_ts and local_ts and remote_ts > local_ts:
                        for key, val in record.items():
                            if key != 'id' and hasattr(local, key):
                                setattr(local, key, val)
                        local.save()
                        pulled += 1
                elif model_name == 'Inventory' and remote_ts and local_ts:
                    # Both sides changed — create conflict
                    SyncConflict.objects.get_or_create(
                        model_name=model_name,
                        record_id=record_id,
                        peer_url=peer_url,
                        defaults={
                            'local_data': model_to_dict(local),
                            'remote_data': record,
                        },
                    )
            except model_cls.DoesNotExist:
                model_cls.objects.create(**record)
                pulled += 1

        if records:
            last_ts = records[-1].get(ts_field)
            if last_ts:
                parsed = parse_datetime(last_ts)
                if parsed:
                    state.last_synced_at = parsed
                    state.save()

        return pulled

    except requests.RequestException as e:
        logger.error("Sync error for %s from %s: %s", model_name, peer_url, e)
        return 0


def push_to_peer(peer_url: str, model_name: str, token: str) -> int:
    """Push local changes to a peer. Returns count of pushed records."""
    model_info = SYNCABLE_MODELS[model_name]
    model_cls = model_info['model']

    state = SyncState.objects.filter(peer_url=peer_url, model_name=model_name).first()
    if not state:
        return 0

    ts_field = get_timestamp_field(model_name)
    filter_kwargs = {f"{ts_field}__gt": state.last_synced_at}
    local_changes = model_cls.objects.filter(**filter_kwargs)
    pushed = 0

    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    for instance in local_changes:
        record = model_to_dict(instance)
        record.pop('id', None)
        try:
            resp = requests.post(
                f"{peer_url.rstrip('/')}/api/inventory/{model_name.lower()}s/",
                json=record,
                headers=headers,
                timeout=30,
            )
            if resp.status_code in (201, 200):
                pushed += 1
            else:
                logger.warning("Push to %s for %s returned %s", peer_url, model_name, resp.status_code)
        except requests.RequestException as e:
            logger.error("Push error to %s: %s", peer_url, e)

    return pushed


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def sync_with_peers(self):
    """Celery task that syncs all syncable models with all configured peers."""
    peers_str = getattr(settings, 'SYNC_PEERS', '')
    if not peers_str:
        peers_str = getattr(settings, 'SYNC_PEERS', '')
        if not peers_str:
            logger.info("SYNC_PEERS not configured, skipping sync")
            return

    peers = [p.strip() for p in peers_str.split(',') if p.strip()]
    if not peers:
        return

    for peer_url in peers:
        token = get_auth_token(peer_url)
        if not token:
            logger.warning("Could not authenticate with peer %s, skipping", peer_url)
            continue

        for model_name in SYNCABLE_MODELS:
            try:
                pulled = sync_from_peer(peer_url, model_name, token)
                pushed = push_to_peer(peer_url, model_name, token)
                if pulled or pushed:
                    logger.info("Synced %s: pulled=%d pushed=%d from %s", model_name, pulled, pushed, peer_url)
            except Exception as e:
                logger.error("Sync failed for %s with %s: %s", model_name, peer_url, e)
