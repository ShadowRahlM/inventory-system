from django.contrib import admin
from .models import Tile, Batch, Inventory, Movement, AuditLog, TileCatalog, Customer, Supplier, SalesOrder, PurchaseOrder, OrderLineItem, Notification, SyncState, SyncConflict


@admin.register(Tile)
class TileAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'category', 'brand', 'tier', 'pieces_per_carton']
    search_fields = ['sku', 'name', 'category']
    list_filter = ['category', 'brand', 'tier']


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ['batch_number', 'tile', 'supplier', 'production_date', 'is_active']
    search_fields = ['batch_number', 'supplier']
    list_filter = ['is_active']


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ['tile', 'batch', 'location', 'cartons', 'loose_pieces']
    search_fields = ['location']
    list_filter = ['location']


@admin.register(Movement)
class MovementAdmin(admin.ModelAdmin):
    list_display = ['movement_type', 'tile', 'batch', 'cartons_change', 'loose_pieces_change', 'reference', 'created_at']
    search_fields = ['reference', 'reason']
    list_filter = ['movement_type', 'created_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'movement', 'changed_by', 'timestamp']
    list_filter = ['action', 'timestamp']


@admin.register(TileCatalog)
class TileCatalogAdmin(admin.ModelAdmin):
    list_display = ['name', 'processed', 'uploaded_at', 'uploaded_by']
    list_filter = ['processed', 'uploaded_at']


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone']
    search_fields = ['name', 'email']


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'lead_time_days']
    search_fields = ['name', 'email']


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'customer', 'status', 'order_date', 'total_amount']
    list_filter = ['status', 'order_date']
    search_fields = ['order_number', 'customer__name']


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'supplier', 'status', 'order_date', 'expected_date']
    list_filter = ['status', 'order_date']
    search_fields = ['order_number', 'supplier__name']


@admin.register(OrderLineItem)
class OrderLineItemAdmin(admin.ModelAdmin):
    list_display = ['tile', 'quantity_cartons', 'quantity_loose', 'unit_price', 'line_total']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['notification_type', 'title', 'user', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['title', 'message']


@admin.register(SyncState)
class SyncStateAdmin(admin.ModelAdmin):
    list_display = ['peer_url', 'model_name', 'last_synced_at', 'updated_at']
    list_filter = ['model_name']


@admin.register(SyncConflict)
class SyncConflictAdmin(admin.ModelAdmin):
    list_display = ['model_name', 'record_id', 'peer_url', 'resolved', 'created_at']
    list_filter = ['model_name', 'resolved']
