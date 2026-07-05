import json
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Movement, Inventory, Notification


def _send_group(channel_layer, group, message):
    async_to_sync(channel_layer.group_send)(group, message)


@receiver(post_save, sender=Movement)
def movement_signal_handler(sender, instance, created, **kwargs):
    if not created:
        return
    channel_layer = get_channel_layer()
    data = {
        'movement_type': instance.movement_type,
        'tile_sku': instance.tile.sku,
        'tile_name': instance.tile.name,
        'batch_number': instance.batch.batch_number,
        'cartons_change': instance.cartons_change,
        'loose_pieces_change': instance.loose_pieces_change,
        'reference': instance.reference,
        'reason': instance.reason,
        'performed_by': instance.performed_by.username,
        'created_at': instance.created_at.isoformat(),
        'movement_id': str(instance.id),
    }
    _send_group(channel_layer, 'inventory_updates', {
        'type': 'movement_notification',
        'data': data,
    })
    Notification.objects.create(
        notification_type='MOVEMENT',
        title=f"{instance.get_movement_type_display()}: {instance.tile.sku}",
        message=f"{instance.cartons_change} cartons, {instance.loose_pieces_change} loose pieces - {instance.reference}",
        data=data,
    )


@receiver(post_save, sender=Inventory)
def inventory_signal_handler(sender, instance, **kwargs):
    try:
        total = instance.total_pieces
    except Exception:
        return
    if total <= 50:
        channel_layer = get_channel_layer()
        data = {
            'tile_sku': instance.tile.sku,
            'tile_name': instance.tile.name,
            'batch_number': instance.batch.batch_number,
            'location': instance.location,
            'cartons': instance.cartons,
            'loose_pieces': instance.loose_pieces,
            'total_pieces': total,
        }
        _send_group(channel_layer, 'inventory_updates', {
            'type': 'low_stock_alert',
            'data': data,
        })
        Notification.objects.create(
            notification_type='LOW_STOCK',
            title=f"Low Stock: {instance.tile.sku}",
            message=f"Only {total} pieces remaining at {instance.location}",
            data=data,
        )
