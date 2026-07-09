import re
import uuid
from typing import Tuple
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import Tile, Batch, Inventory, Movement, MovementType, AuditLog, Customer, Supplier, SalesOrder, PurchaseOrder, OrderLineItem, OrderStatus
from django.contrib.auth import get_user_model

User = get_user_model()


def _eval_expression(raw: str | int) -> int:
    if isinstance(raw, int | float):
        return int(raw)
    raw = raw.strip()
    raw = re.sub(r'[^0-9+\-*/().]', '', raw)
    try:
        return int(eval(raw, {'__builtins__': {}}, {}))
    except Exception:
        raise ValidationError(f"Cannot evaluate expression: '{raw}'")


def _looks_like_mix(sku: str) -> bool:
    lower = sku.lower()
    return lower == 'mix' or 'mix' in lower


def _flatten_stock_take(data: dict | list) -> list[dict]:
    if isinstance(data, list):
        seen: dict[str, list[int]] = {}
        ppc_map: dict[str, int | None] = {}
        for item in data:
            raw_sku = str(item.get('sku_code', '')).strip().replace(' ', '').upper()
            if not raw_sku:
                continue
            boxes = _eval_expression(item.get('boxes', 0))
            if boxes <= 0:
                continue
            seen.setdefault(raw_sku, []).append(boxes)
            ppc = item.get('pcs_per_box')
            if ppc is not None:
                try:
                    ppc = int(ppc)
                except (ValueError, TypeError):
                    ppc = None
            if ppc is not None and ppc_map.get(raw_sku) is None:
                ppc_map[raw_sku] = ppc
        return [
            {'sku': sku, 'quantity': sum(qtys), 'pieces_per_carton': ppc_map.get(sku)}
            for sku, qtys in seen.items()
        ]

    entries = []
    for image_key, value in data.items():
        if isinstance(value, dict):
            for sku, qty in value.items():
                entries.append({'sku': str(sku).strip().upper(), 'quantity': qty, 'pieces_per_carton': None})
        elif isinstance(value, int | float):
            entries.append({'sku': str(image_key).strip(), 'quantity': value, 'pieces_per_carton': None})
    return entries


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

    @staticmethod
    @transaction.atomic
    def stock_take(data: dict | list, performed_by: User) -> dict:
        raw_entries = _flatten_stock_take(data)
        if not raw_entries:
            raise ValidationError("No stock entries found in data")

        entries = []
        for e in raw_entries:
            qty = _eval_expression(e['quantity'])
            if qty <= 0:
                continue
            entries.append({
                'sku': e['sku'],
                'quantity': qty,
                'pieces_per_carton': e.get('pieces_per_carton'),
            })

        tiles_created = 0
        tiles_updated = 0
        stock_created = 0
        stock_updated = 0
        errors = []
        movements = []

        for entry in entries:
            sku = entry['sku']
            qty = entry['quantity']
            ppc = entry['pieces_per_carton']
            try:
                tile, was_created = Tile.objects.get_or_create(
                    sku=sku,
                    defaults={
                        'name': sku,
                        'dimensions': '30x30cm',
                        'pieces_per_carton': ppc or 10,
                        'category': 'Stock Take',
                        'description': 'Imported from stock take',
                        'is_mix': _looks_like_mix(sku),
                    },
                )
                if was_created:
                    tiles_created += 1
                elif ppc is not None and tile.pieces_per_carton != ppc:
                    tile.pieces_per_carton = ppc
                    tile.save(update_fields=['pieces_per_carton'])
                    tiles_updated += 1

                batch_number = f'STOCK-{sku}'
                batch, _ = Batch.objects.get_or_create(
                    batch_number=batch_number,
                    tile=tile,
                    defaults={
                        'production_date': timezone.now().date(),
                        'supplier': 'stock-take',
                        'received_date': timezone.now().date(),
                        'is_active': True,
                    },
                )

                inv = Inventory.objects.select_for_update().filter(
                    tile=tile, batch=batch, location='STOCKROOM'
                ).first()
                prev_cartons = inv.cartons if inv else 0
                prev_loose = inv.loose_pieces if inv else 0

                if inv is None:
                    inv = Inventory.objects.create(
                        tile=tile, batch=batch, location='STOCKROOM',
                        cartons=qty, loose_pieces=0,
                    )
                    stock_created += 1
                else:
                    inv.cartons += qty
                    inv.save(update_fields=['cartons'])
                    stock_updated += 1

                cartons_change = qty
                loose_change = 0
                if cartons_change != 0 or loose_change != 0:
                    movements.append(Movement(
                        tile=tile,
                        batch=batch,
                        movement_type=MovementType.ADJUSTMENT,
                        cartons_change=cartons_change,
                        loose_pieces_change=loose_change,
                        previous_cartons=prev_cartons,
                        previous_loose_pieces=prev_loose,
                        new_cartons=inv.cartons,
                        new_loose_pieces=inv.loose_pieces,
                        reference='STOCK-TAKE',
                        reason=f"Stock take: {sku} set to {qty} cartons",
                        performed_by=performed_by,
                    ))

            except Exception as e:
                errors.append({'sku': sku, 'error': str(e)})

        created_movements = Movement.objects.bulk_create(movements) if movements else []
        for m in created_movements:
            AuditLog.objects.create(
                movement=m,
                action='STOCK_TAKE',
                old_values={'cartons': m.previous_cartons, 'loose_pieces': m.previous_loose_pieces},
                new_values={'cartons': m.new_cartons, 'loose_pieces': m.new_loose_pieces},
                changed_by=performed_by,
            )

        return {
            'tiles_created': tiles_created,
            'tiles_updated': tiles_updated,
            'stock_created': stock_created,
            'stock_updated': stock_updated,
            'total_entries': len(entries),
            'errors': errors,
        }


class OrderService:
    @staticmethod
    @transaction.atomic
    def create_sales_order(
        customer_id: uuid.UUID,
        items: list,
        performed_by: User,
        notes: str = ""
    ) -> SalesOrder:
        customer = Customer.objects.get(id=customer_id)
        order = SalesOrder.objects.create(
            customer=customer,
            notes=notes,
            created_by=performed_by,
        )
        total = 0
        for item in items:
            tile = Tile.objects.get(id=item['tile_id'])
            batch_id = item.get('batch_id')
            batch = None
            if batch_id:
                batch = Batch.objects.get(id=batch_id, tile=tile)
            line = OrderLineItem.objects.create(
                sales_order=order,
                tile=tile,
                batch=batch,
                quantity_cartons=item.get('cartons', 0),
                quantity_loose=item.get('loose_pieces', 0),
                unit_price=item.get('unit_price', 0),
            )
            total += line.line_total
        order.total_amount = total
        order.save(update_fields=['total_amount'])
        return order

    @staticmethod
    @transaction.atomic
    def confirm_sales_order(order_id: uuid.UUID, performed_by: User) -> SalesOrder:
        order = SalesOrder.objects.select_for_update().get(id=order_id)
        if order.status != OrderStatus.DRAFT:
            raise ValidationError(f"Cannot confirm order in status {order.status}")
        items = list(OrderLineItem.objects.filter(sales_order=order).select_related('tile'))
        movements = []
        for item in items:
            available = InventoryService.get_available_stock(item.tile_id)
            total_requested = (item.quantity_cartons * item.tile.pieces_per_carton) + item.quantity_loose
            if available['total_pieces'] < total_requested:
                raise ValidationError(
                    f"Insufficient stock for {item.tile.sku}: "
                    f"available {available['total_pieces']}, requested {total_requested}"
                )
            inv_records = Inventory.objects.filter(
                tile=item.tile,
                batch__is_active=True
            ).select_related('batch').select_for_update().order_by('batch__received_date')
            remaining_cartons = item.quantity_cartons
            remaining_loose = item.quantity_loose
            for inv in inv_records:
                if remaining_cartons <= 0 and remaining_loose <= 0:
                    break
                prev_cartons = inv.cartons
                prev_loose = inv.loose_pieces
                dispatch_cartons = min(remaining_cartons, inv.cartons)
                remaining_cartons -= dispatch_cartons
                inv.cartons -= dispatch_cartons
                pieces_from_cartons = dispatch_cartons * item.tile.pieces_per_carton
                if pieces_from_cartons > 0:
                    inv.loose_pieces += pieces_from_cartons
                loose_to_take = min(remaining_loose, inv.loose_pieces)
                inv.loose_pieces -= loose_to_take
                remaining_loose -= loose_to_take
                movements.append(Movement(
                    tile=item.tile,
                    batch=inv.batch,
                    movement_type=MovementType.DISPATCH,
                    cartons_change=-dispatch_cartons,
                    loose_pieces_change=pieces_from_cartons - loose_to_take,
                    previous_cartons=prev_cartons,
                    previous_loose_pieces=prev_loose,
                    new_cartons=inv.cartons,
                    new_loose_pieces=inv.loose_pieces,
                    reference=order.order_number,
                    reason=f"Sales order {order.order_number} confirmed",
                    performed_by=performed_by,
                ))
                inv.save()
        if movements:
            Movement.objects.bulk_create(movements)
        order.status = OrderStatus.CONFIRMED
        order.save(update_fields=['status'])
        return order

    @staticmethod
    @transaction.atomic
    def ship_sales_order(order_id: uuid.UUID, performed_by: User) -> SalesOrder:
        order = SalesOrder.objects.get(id=order_id)
        if order.status != OrderStatus.CONFIRMED:
            raise ValidationError(f"Cannot ship order in status {order.status}")
        order.status = OrderStatus.SHIPPED
        order.save(update_fields=['status'])
        return order

    @staticmethod
    @transaction.atomic
    def cancel_sales_order(order_id: uuid.UUID, performed_by: User) -> SalesOrder:
        order = SalesOrder.objects.get(id=order_id)
        if order.status in (OrderStatus.DELIVERED, OrderStatus.CANCELLED):
            raise ValidationError(f"Cannot cancel order in status {order.status}")
        old_status = order.status

        if old_status in (OrderStatus.CONFIRMED, OrderStatus.SHIPPED):
            dispatch_movements = Movement.objects.filter(
                reference=order.order_number,
                movement_type=MovementType.DISPATCH,
            ).select_related('tile', 'batch').select_for_update()

            for m in dispatch_movements:
                inv, _ = Inventory.objects.select_for_update().get_or_create(
                    tile=m.tile,
                    batch=m.batch,
                    location='STOCKROOM',
                    defaults={'cartons': 0, 'loose_pieces': 0},
                )
                cartons_back = abs(m.cartons_change)
                loose_back = -m.loose_pieces_change
                inv.cartons += cartons_back
                inv.loose_pieces += loose_back
                inv.save()

                prev_cartons = inv.cartons - cartons_back
                prev_loose = inv.loose_pieces - loose_back
                Movement.objects.create(
                    tile=m.tile,
                    batch=m.batch,
                    movement_type=MovementType.ADJUSTMENT,
                    cartons_change=cartons_back,
                    loose_pieces_change=loose_back,
                    previous_cartons=prev_cartons,
                    previous_loose_pieces=prev_loose,
                    new_cartons=inv.cartons,
                    new_loose_pieces=inv.loose_pieces,
                    reference=order.order_number,
                    reason=f"Sales order {order.order_number} cancelled — stock reversal",
                    performed_by=performed_by,
                )

        order.status = OrderStatus.CANCELLED
        order.save(update_fields=['status'])

        AuditLog.objects.create(
            movement=None,
            action='CANCEL_SALES_ORDER',
            old_values={'status': old_status},
            new_values={'status': OrderStatus.CANCELLED},
            changed_by=performed_by,
        )
        return order

    @staticmethod
    @transaction.atomic
    def create_purchase_order(
        supplier_id: uuid.UUID,
        items: list,
        performed_by: User,
        expected_date=None,
        notes: str = ""
    ) -> PurchaseOrder:
        supplier = Supplier.objects.get(id=supplier_id)
        order = PurchaseOrder.objects.create(
            supplier=supplier,
            expected_date=expected_date,
            notes=notes,
            created_by=performed_by,
        )
        total = 0
        for item in items:
            tile = Tile.objects.get(id=item['tile_id'])
            line = OrderLineItem.objects.create(
                purchase_order=order,
                tile=tile,
                quantity_cartons=item.get('cartons', 0),
                quantity_loose=item.get('loose_pieces', 0),
                unit_price=item.get('unit_price', 0),
            )
            total += line.line_total
        order.total_amount = total
        order.save(update_fields=['total_amount'])
        return order

    @staticmethod
    @transaction.atomic
    def receive_purchase_order(
        order_id: uuid.UUID,
        performed_by: User,
        location: str
    ) -> PurchaseOrder:
        order = PurchaseOrder.objects.select_for_update().get(id=order_id)
        if order.status != OrderStatus.CONFIRMED:
            raise ValidationError(f"Cannot receive order in status {order.status}")
        items = OrderLineItem.objects.filter(purchase_order=order)
        for item in items:
            InventoryService.receive_inventory(
                tile_id=item.tile_id,
                batch_number=f"PO-{order.order_number}-{item.tile.sku}",
                production_date=timezone.now().date(),
                supplier=order.supplier.name,
                cartons=item.quantity_cartons,
                loose_pieces=item.quantity_loose,
                location=location,
                performed_by=performed_by,
                reference=order.order_number,
            )
        order.status = OrderStatus.DELIVERED
        order.save(update_fields=['status'])
        return order

    @staticmethod
    @transaction.atomic
    def confirm_purchase_order(order_id: uuid.UUID, performed_by: User) -> PurchaseOrder:
        order = PurchaseOrder.objects.select_for_update().get(id=order_id)
        if order.status != OrderStatus.DRAFT:
            raise ValidationError(f"Cannot confirm purchase order in status {order.status}")
        order.status = OrderStatus.CONFIRMED
        order.save(update_fields=['status'])
        AuditLog.objects.create(
            movement=None,
            action='CONFIRM_PURCHASE_ORDER',
            old_values={'status': OrderStatus.DRAFT},
            new_values={'status': OrderStatus.CONFIRMED},
            changed_by=performed_by,
        )
        return order
