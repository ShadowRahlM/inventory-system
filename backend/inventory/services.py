import uuid
from typing import Tuple
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import Tile, Batch, Inventory, Movement, MovementType, AuditLog
from django.contrib.auth import get_user_model

User = get_user_model()


class InventoryService:
    @staticmethod
    @transaction.atomic
    def receive_inventory(
        tile_id: uuid.UUID,
        batch_number: str,
        production_date: str,
        supplier: str,
        cartons: int,
        loose_pieces: int,
        location: str,
        performed_by: User,
        reference: str = ""
    ) -> Tuple[Inventory, Movement]:
        if cartons == 0 and loose_pieces == 0:
            raise ValidationError("Must receive at least one carton or loose piece")
        tile = Tile.objects.get(id=tile_id)
        
        batch, created = Batch.objects.get_or_create(
            batch_number=batch_number,
            tile=tile,
            defaults={
                'production_date': production_date,
                'supplier': supplier,
                'received_date': timezone.now().date(),
                'is_active': True
            }
        )
        
        if not created:
            if not batch.is_active:
                raise ValidationError(f"Batch {batch_number} is not active")
            mismatches = []
            if batch.production_date != production_date:
                mismatches.append(f"production_date: {batch.production_date} vs {production_date}")
            if batch.supplier != supplier:
                mismatches.append(f"supplier: '{batch.supplier}' vs '{supplier}'")
            if mismatches:
                raise ValidationError(
                    f"Existing batch {batch_number} has conflicting attributes: {'; '.join(mismatches)}"
                )
        
        inventory, created = Inventory.objects.get_or_create(
            tile=tile,
            batch=batch,
            location=location,
            defaults={
                'cartons': 0,
                'loose_pieces': 0
            }
        )
        
        previous_cartons = inventory.cartons
        previous_loose_pieces = inventory.loose_pieces
        
        inventory.cartons += cartons
        inventory.loose_pieces += loose_pieces
        inventory.save()
        
        movement = Movement.objects.create(
            tile=tile,
            batch=batch,
            movement_type=MovementType.RECEIVING,
            cartons_change=cartons,
            loose_pieces_change=loose_pieces,
            previous_cartons=previous_cartons,
            previous_loose_pieces=previous_loose_pieces,
            new_cartons=inventory.cartons,
            new_loose_pieces=inventory.loose_pieces,
            reference=reference,
            reason=f"Received {cartons} cartons and {loose_pieces} loose pieces",
            performed_by=performed_by
        )
        
        AuditLog.objects.create(
            movement=movement,
            action="RECEIVE_INVENTORY",
            old_values={
                'cartons': previous_cartons,
                'loose_pieces': previous_loose_pieces
            },
            new_values={
                'cartons': inventory.cartons,
                'loose_pieces': inventory.loose_pieces
            },
            changed_by=performed_by
        )
        
        return inventory, movement

    @staticmethod
    @transaction.atomic
    def dispatch_inventory(
        tile_id: uuid.UUID,
        batch_id: uuid.UUID,
        cartons: int,
        loose_pieces: int,
        location: str,
        performed_by: User,
        reference: str = ""
    ) -> Tuple[Inventory, Movement]:
        if cartons == 0 and loose_pieces == 0:
            raise ValidationError("Must dispatch at least one carton or loose piece")
        tile = Tile.objects.get(id=tile_id)
        batch = Batch.objects.get(id=batch_id, tile=tile)
        
        if not batch.is_active:
            raise ValidationError(f"Batch {batch.batch_number} is not active")
        
        inventory = Inventory.objects.select_for_update().get(tile=tile, batch=batch, location=location)
        
        if inventory.cartons < cartons:
            raise ValidationError(f"Insufficient cartons. Available: {inventory.cartons}, Requested: {cartons}")
        
        total_requested_pieces = (cartons * tile.pieces_per_carton) + loose_pieces
        total_available_pieces = inventory.total_pieces
        
        if total_available_pieces < total_requested_pieces:
            raise ValidationError(f"Insufficient total pieces. Available: {total_available_pieces}, Requested: {total_requested_pieces}")
        
        previous_cartons = inventory.cartons
        previous_loose_pieces = inventory.loose_pieces
        
        inventory.cartons -= cartons
        remaining_loose_needed = loose_pieces
        
        if inventory.loose_pieces < remaining_loose_needed:
            shortage = remaining_loose_needed - inventory.loose_pieces
            additional_cartons_needed = (shortage + tile.pieces_per_carton - 1) // tile.pieces_per_carton
            
            if inventory.cartons < additional_cartons_needed:
                raise ValidationError(f"Insufficient inventory to fulfill request")
            
            inventory.cartons -= additional_cartons_needed
            inventory.loose_pieces += additional_cartons_needed * tile.pieces_per_carton
        
        inventory.loose_pieces -= remaining_loose_needed
        inventory.save()
        
        movement = Movement.objects.create(
            tile=tile,
            batch=batch,
            movement_type=MovementType.DISPATCH,
            cartons_change=-cartons,
            loose_pieces_change=-loose_pieces,
            previous_cartons=previous_cartons,
            previous_loose_pieces=previous_loose_pieces,
            new_cartons=inventory.cartons,
            new_loose_pieces=inventory.loose_pieces,
            reference=reference,
            reason=f"Dispatched {cartons} cartons and {loose_pieces} loose pieces",
            performed_by=performed_by
        )
        
        AuditLog.objects.create(
            movement=movement,
            action="DISPATCH_INVENTORY",
            old_values={
                'cartons': previous_cartons,
                'loose_pieces': previous_loose_pieces
            },
            new_values={
                'cartons': inventory.cartons,
                'loose_pieces': inventory.loose_pieces
            },
            changed_by=performed_by
        )
        
        return inventory, movement

    @staticmethod
    @transaction.atomic
    def adjust_inventory(
        tile_id: uuid.UUID,
        batch_id: uuid.UUID,
        location: str,
        new_cartons: int,
        new_loose_pieces: int,
        reason: str,
        performed_by: User
    ) -> Tuple[Inventory, Movement]:
        tile = Tile.objects.get(id=tile_id)
        batch = Batch.objects.get(id=batch_id, tile=tile)
        
        inventory = Inventory.objects.select_for_update().get(tile=tile, batch=batch, location=location)
        
        previous_cartons = inventory.cartons
        previous_loose_pieces = inventory.loose_pieces
        
        cartons_change = new_cartons - previous_cartons
        loose_pieces_change = new_loose_pieces - previous_loose_pieces
        
        if new_cartons < 0 or new_loose_pieces < 0:
            raise ValidationError("Inventory quantities cannot be negative")
        
        inventory.cartons = new_cartons
        inventory.loose_pieces = new_loose_pieces
        inventory.save()
        
        movement = Movement.objects.create(
            tile=tile,
            batch=batch,
            movement_type=MovementType.ADJUSTMENT,
            cartons_change=cartons_change,
            loose_pieces_change=loose_pieces_change,
            previous_cartons=previous_cartons,
            previous_loose_pieces=previous_loose_pieces,
            new_cartons=inventory.cartons,
            new_loose_pieces=inventory.loose_pieces,
            reason=reason,
            performed_by=performed_by
        )
        
        AuditLog.objects.create(
            movement=movement,
            action="ADJUST_INVENTORY",
            old_values={
                'cartons': previous_cartons,
                'loose_pieces': previous_loose_pieces
            },
            new_values={
                'cartons': inventory.cartons,
                'loose_pieces': inventory.loose_pieces
            },
            changed_by=performed_by
        )
        
        return inventory, movement

    @staticmethod
    @transaction.atomic
    def transfer_inventory(
        tile_id: uuid.UUID,
        batch_id: uuid.UUID,
        from_location: str,
        to_location: str,
        cartons: int,
        loose_pieces: int,
        performed_by: User,
        reference: str = ""
    ) -> Tuple[Inventory, Inventory, Movement]:
        if from_location == to_location:
            raise ValidationError("Source and destination locations must be different")
        if cartons == 0 and loose_pieces == 0:
            raise ValidationError("Must transfer at least one carton or loose piece")
        tile = Tile.objects.get(id=tile_id)
        batch = Batch.objects.get(id=batch_id, tile=tile)
        
        if not batch.is_active:
            raise ValidationError(f"Batch {batch.batch_number} is not active")
        
        source_inventory = Inventory.objects.select_for_update().get(tile=tile, batch=batch, location=from_location)
        
        if source_inventory.cartons < cartons:
            raise ValidationError(f"Insufficient cartons in source location")
        
        total_requested_pieces = (cartons * tile.pieces_per_carton) + loose_pieces
        if source_inventory.total_pieces < total_requested_pieces:
            raise ValidationError(f"Insufficient total pieces in source location")
        
        previous_source_cartons = source_inventory.cartons
        previous_source_loose_pieces = source_inventory.loose_pieces
        
        source_inventory.cartons -= cartons
        remaining_loose_needed = loose_pieces
        
        if source_inventory.loose_pieces < remaining_loose_needed:
            shortage = remaining_loose_needed - source_inventory.loose_pieces
            additional_cartons_needed = (shortage + tile.pieces_per_carton - 1) // tile.pieces_per_carton
            
            if source_inventory.cartons < additional_cartons_needed:
                raise ValidationError(f"Insufficient inventory to transfer")
            
            source_inventory.cartons -= additional_cartons_needed
            source_inventory.loose_pieces += additional_cartons_needed * tile.pieces_per_carton
        
        source_inventory.loose_pieces -= remaining_loose_needed
        source_inventory.save()
        
        dest_inventory, created = Inventory.objects.get_or_create(
            tile=tile,
            batch=batch,
            location=to_location,
            defaults={
                'cartons': 0,
                'loose_pieces': 0
            }
        )
        
        previous_dest_cartons = dest_inventory.cartons
        previous_dest_loose_pieces = dest_inventory.loose_pieces
        
        dest_inventory.cartons += cartons
        dest_inventory.loose_pieces += loose_pieces
        dest_inventory.save()
        
        movement = Movement.objects.create(
            tile=tile,
            batch=batch,
            movement_type=MovementType.TRANSFER,
            cartons_change=0,
            loose_pieces_change=0,
            previous_cartons=previous_source_cartons,
            previous_loose_pieces=previous_source_loose_pieces,
            new_cartons=source_inventory.cartons,
            new_loose_pieces=source_inventory.loose_pieces,
            reference=reference,
            reason=f"Transfer from {from_location} to {to_location}",
            performed_by=performed_by
        )
        
        AuditLog.objects.create(
            movement=movement,
            action="TRANSFER_INVENTORY",
            old_values={
                'source_cartons': previous_source_cartons,
                'source_loose_pieces': previous_source_loose_pieces,
                'dest_cartons': previous_dest_cartons,
                'dest_loose_pieces': previous_dest_loose_pieces
            },
            new_values={
                'source_cartons': source_inventory.cartons,
                'source_loose_pieces': source_inventory.loose_pieces,
                'dest_cartons': dest_inventory.cartons,
                'dest_loose_pieces': dest_inventory.loose_pieces
            },
            changed_by=performed_by
        )
        
        return source_inventory, dest_inventory, movement

    @staticmethod
    def get_available_stock(tile_id: uuid.UUID) -> dict:
        tile = Tile.objects.get(id=tile_id)
        inventories = Inventory.objects.filter(tile=tile, batch__is_active=True)
        
        total_cartons = sum(inv.cartons for inv in inventories)
        total_loose_pieces = sum(inv.loose_pieces for inv in inventories)
        total_pieces = sum(inv.total_pieces for inv in inventories)
        
        return {
            'tile_id': str(tile_id),
            'sku': tile.sku,
            'name': tile.name,
            'total_cartons': total_cartons,
            'total_loose_pieces': total_loose_pieces,
            'total_pieces': total_pieces,
            'locations': [
                {
                    'location': inv.location,
                    'batch': inv.batch.batch_number,
                    'cartons': inv.cartons,
                    'loose_pieces': inv.loose_pieces,
                    'total_pieces': inv.total_pieces
                }
                for inv in inventories
            ]
        }