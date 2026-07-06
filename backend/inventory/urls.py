from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TileViewSet, BatchViewSet, InventoryViewSet, MovementViewSet, AuditLogViewSet, TileCatalogViewSet, InventoryOperationViewSet, ReportViewSet, UserViewSet, CustomerViewSet, SupplierViewSet, SalesOrderViewSet, PurchaseOrderViewSet, OrderOperationViewSet, BarcodeViewSet, NotificationViewSet, SyncConflictViewSet

router = DefaultRouter()
router.register(r'tiles', TileViewSet, basename='tile')
router.register(r'batches', BatchViewSet, basename='batch')
router.register(r'inventory', InventoryViewSet, basename='inventory')
router.register(r'movements', MovementViewSet, basename='movement')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'catalogs', TileCatalogViewSet, basename='catalog')
router.register(r'operations', InventoryOperationViewSet, basename='operation')
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'users', UserViewSet, basename='user')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'sales-orders', SalesOrderViewSet, basename='salesorder')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchaseorder')
router.register(r'order-operations', OrderOperationViewSet, basename='orderoperation')
router.register(r'barcodes', BarcodeViewSet, basename='barcode')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'sync-conflicts', SyncConflictViewSet, basename='syncconflict')

urlpatterns = [
    path('', include(router.urls)),
]