from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TileViewSet, BatchViewSet, InventoryViewSet, MovementViewSet, AuditLogViewSet, TileCatalogViewSet, InventoryOperationViewSet, ReportViewSet, UserViewSet

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

urlpatterns = [
    path('', include(router.urls)),
]