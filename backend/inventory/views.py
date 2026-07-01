import json as _json
import tempfile
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.core.files.base import ContentFile

from django.db import transaction
from django.db.models import Count, Q, Sum

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Tile, Batch, Inventory, Movement, AuditLog, TileCatalog
from .serializers import (
    TileSerializer, BatchSerializer, InventorySerializer, MovementSerializer, AuditLogSerializer, TileCatalogSerializer,
    ReceiveInventorySerializer, DispatchInventorySerializer, AdjustInventorySerializer, TransferInventorySerializer,
    UserSerializer, SetRoleSerializer,
)
from .services import InventoryService
from .permissions import IsInventoryViewer, CanPerformInventoryOperations, IsAdminUser


class TileViewSet(viewsets.ModelViewSet):
    queryset = Tile.objects.all()
    serializer_class = TileSerializer
    permission_classes = [IsAuthenticated, IsInventoryViewer]
    filterset_fields = ['category', 'sku']
    search_fields = ['sku', 'name', 'description', 'category', 'brand', 'series', 'tile_type', 'finish', 'use_case']
    ordering_fields = ['sku', 'name', 'created_at']
    ordering = ['sku']

    @action(detail=False, methods=['post'])
    def batch_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'success': False, 'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            AuditLog.objects.filter(movement__tile_id__in=ids).delete()
            Movement.objects.filter(tile_id__in=ids).delete()
            Inventory.objects.filter(tile_id__in=ids).delete()
            Batch.objects.filter(tile_id__in=ids).delete()
            deleted = Tile.objects.filter(id__in=ids).delete()
        return Response({'success': True, 'data': {'deleted': deleted[0]}})


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.select_related('tile').all()
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated, IsInventoryViewer]
    filterset_fields = ['tile', 'is_active']
    search_fields = ['batch_number', 'supplier']
    ordering_fields = ['production_date', 'received_date']
    ordering = ['-received_date']


class InventoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Inventory.objects.select_related('tile', 'batch').all()
    serializer_class = InventorySerializer
    permission_classes = [IsAuthenticated, IsInventoryViewer]
    filterset_fields = ['tile', 'batch', 'location']
    search_fields = ['location']
    ordering_fields = ['updated_at', 'location']
    ordering = ['-updated_at']

    @action(detail=False, methods=['get'])
    def available_stock(self, request):
        tile_id = request.query_params.get('tile_id')
        if not tile_id:
            return Response({'error': 'tile_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            stock_info = InventoryService.get_available_stock(tile_id)
            return Response(stock_info)
        except Tile.DoesNotExist:
            return Response({'error': 'Tile not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        threshold = int(request.query_params.get('threshold', 50))
        items = Inventory.objects.select_related('tile', 'batch').all()
        low = [item for item in items if item.total_pieces <= threshold]
        low_sorted = sorted(low, key=lambda x: x.total_pieces)
        serializer = InventorySerializer(low_sorted, many=True)
        return Response({
            'count': len(low_sorted),
            'threshold': threshold,
            'results': serializer.data,
        })


class MovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Movement.objects.select_related('tile', 'batch', 'performed_by').all()
    serializer_class = MovementSerializer
    permission_classes = [IsAuthenticated, IsInventoryViewer]
    filterset_fields = ['tile', 'batch', 'movement_type']
    search_fields = ['reference', 'reason']
    ordering_fields = ['created_at']
    ordering = ['-created_at']


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('movement', 'changed_by').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsInventoryViewer]
    filterset_fields = ['movement', 'action']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']


class TileCatalogViewSet(viewsets.ModelViewSet):
    queryset = TileCatalog.objects.all()
    serializer_class = TileCatalogSerializer
    permission_classes = [IsAuthenticated, IsInventoryViewer]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=False, methods=['post'])
    def batch_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'success': False, 'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        deleted = TileCatalog.objects.filter(id__in=ids).delete()
        return Response({'success': True, 'data': {'deleted': deleted[0]}})

    @action(detail=True, methods=['post'])
    def extract(self, request, pk=None):
        catalog = self.get_object()
        pdf_path = catalog.file.path
        dpi = int(request.query_params.get('dpi', 300))

        # Auto-calculate min_cell_area from page dimensions
        import fitz
        doc = fitz.open(str(pdf_path))
        page = doc[0]
        zoom = dpi / 72
        pw = int(page.rect.width * zoom)
        ph = int(page.rect.height * zoom)
        doc.close()

        # Default: assume max 6 columns × 10 rows per page
        min_cell_area = int(request.query_params.get('min_cell_area', (pw * ph) // 60))
        max_cell_area = int(request.query_params.get('max_cell_area', (pw * ph) // 2))

        from scripts.extract_catalog import process_pdf, build_reference
        from django.conf import settings

        # Build reference data from existing tiles
        from .serializers import TileSerializer
        existing_tiles = TileSerializer(Tile.objects.all(), many=True).data
        reference = build_reference(existing_tiles)

        # Save images to MEDIA_ROOT/extractions/{catalog.id}/
        images_root = Path(settings.MEDIA_ROOT) / 'extractions' / str(catalog.id)
        images_url = f'{settings.MEDIA_URL}extractions/{catalog.id}'

        try:
            result = process_pdf(
                pdf_path,
                dpi=dpi,
                min_cell_area=min_cell_area,
                max_cell_area=max_cell_area,
                images_output_dir=str(images_root),
                reference=reference,
            )
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Build image URLs for each product
        for prod in result.products:
            if prod.image_filename:
                prod.image_url = f'{images_url}/{prod.image_filename}'

        # Save products to DB
        created = 0
        skipped_no_sku = 0
        skipped_duplicate = 0
        skipped_error = 0
        products_data = []
        debug_samples = []
        for prod in result.products[:50]:
            debug_samples.append({
                'sku': prod.sku,
                'name': prod.name,
                'page': prod.page_number,
                'image_filename': prod.image_filename,
                'ocr_snippet': prod.description[:120] if prod.description else '',
                'brand': prod.brand,
                'series': prod.series,
                'tier': prod.tier,
                'tile_type': prod.tile_type,
                'finish': prod.finish,
                'thickness': prod.thickness,
                'coverage_per_box': prod.coverage_per_box,
                'use_case': prod.use_case,
            })
        for prod in result.products:
            if not prod.sku:
                skipped_no_sku += 1
                continue
            try:
                tile, was_created = Tile.objects.get_or_create(
                    sku=prod.sku,
                    defaults={
                        'name': prod.name or prod.sku,
                        'dimensions': prod.dimensions or '30x30cm',
                        'pieces_per_carton': prod.pieces_per_carton or 10,
                        'category': prod.category or 'Wall',
                        'description': prod.description or prod.name or '',
                        'brand': prod.brand or 'other',
                        'series': prod.series or '',
                        'tier': prod.tier or 'standard',
                        'tile_type': prod.tile_type or '',
                        'finish': prod.finish or '',
                        'thickness': prod.thickness or '',
                        'coverage_per_box': prod.coverage_per_box or '',
                        'use_case': prod.use_case or '',
                    },
                )
                if was_created:
                    created += 1
                else:
                    skipped_duplicate += 1

                # Save extracted image to tile record if available
                if prod.image_filename and not tile.image:
                    img_path = images_root / prod.image_filename
                    if img_path.exists():
                        with open(img_path, 'rb') as f:
                            tile.image.save(prod.image_filename, ContentFile(f.read()), save=True)

                products_data.append(TileSerializer(tile).data)
            except Exception:
                skipped_error += 1

        # Save extraction report
        report = {
            'catalog_id': str(catalog.id),
            'catalog_name': catalog.name,
            'total_pages': result.total_pages,
            'processed_pages': result.processed_pages,
            'cells_per_page': result.cells_per_page,
            'page_errors': result.page_errors,
            'products_found': len(result.products),
            'products_created': created,
            'products_skipped': skipped_no_sku + skipped_duplicate + skipped_error,
            'breakdown': {
                'no_sku_detected': skipped_no_sku,
                'already_in_db': skipped_duplicate,
                'error': skipped_error,
            },
            'debug_first_50_sku': debug_samples,
            'params': {
                'dpi': dpi,
                'page_width_px': pw,
                'page_height_px': ph,
                'min_cell_area': min_cell_area,
                'max_cell_area': max_cell_area,
            },
        }
        report_dir = images_root.parent
        report_dir.mkdir(parents=True, exist_ok=True)
        (report_dir / f'{catalog.id}_report.json').write_text(
            _json.dumps(report, indent=2, default=str)
        )

        return Response({
            'success': True,
            'data': report | {'products': products_data},
        })


class InventoryOperationViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, CanPerformInventoryOperations]

    @action(detail=False, methods=['post'])
    def receive(self, request):
        serializer = ReceiveInventorySerializer(data=request.data)
        if serializer.is_valid():
            try:
                inventory, movement = InventoryService.receive_inventory(
                    tile_id=serializer.validated_data['tile_id'],
                    batch_number=serializer.validated_data['batch_number'],
                    production_date=serializer.validated_data['production_date'],
                    supplier=serializer.validated_data['supplier'],
                    cartons=serializer.validated_data['cartons'],
                    loose_pieces=serializer.validated_data['loose_pieces'],
                    location=serializer.validated_data['location'],
                    performed_by=request.user,
                    reference=serializer.validated_data.get('reference', '')
                )
                return Response({
                    'success': True,
                    'data': {
                        'inventory': InventorySerializer(inventory).data,
                        'movement': MovementSerializer(movement).data
                    }
                }, status=status.HTTP_201_CREATED)
            except (ValidationError, ObjectDoesNotExist) as e:
                return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def issue_dispatch(self, request):
        serializer = DispatchInventorySerializer(data=request.data)
        if serializer.is_valid():
            try:
                inventory, movement = InventoryService.dispatch_inventory(
                    tile_id=serializer.validated_data['tile_id'],
                    batch_id=serializer.validated_data['batch_id'],
                    cartons=serializer.validated_data['cartons'],
                    loose_pieces=serializer.validated_data['loose_pieces'],
                    location=serializer.validated_data['location'],
                    performed_by=request.user,
                    reference=serializer.validated_data.get('reference', '')
                )
                return Response({
                    'success': True,
                    'data': {
                        'inventory': InventorySerializer(inventory).data,
                        'movement': MovementSerializer(movement).data
                    }
                }, status=status.HTTP_200_OK)
            except (ValidationError, ObjectDoesNotExist) as e:
                return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def adjust(self, request):
        serializer = AdjustInventorySerializer(data=request.data)
        if serializer.is_valid():
            try:
                inventory, movement = InventoryService.adjust_inventory(
                    tile_id=serializer.validated_data['tile_id'],
                    batch_id=serializer.validated_data['batch_id'],
                    location=serializer.validated_data['location'],
                    new_cartons=serializer.validated_data['new_cartons'],
                    new_loose_pieces=serializer.validated_data['new_loose_pieces'],
                    reason=serializer.validated_data['reason'],
                    performed_by=request.user
                )
                return Response({
                    'success': True,
                    'data': {
                        'inventory': InventorySerializer(inventory).data,
                        'movement': MovementSerializer(movement).data
                    }
                }, status=status.HTTP_200_OK)
            except (ValidationError, ObjectDoesNotExist) as e:
                return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def transfer(self, request):
        serializer = TransferInventorySerializer(data=request.data)
        if serializer.is_valid():
            try:
                source_inventory, dest_inventory, movement = InventoryService.transfer_inventory(
                    tile_id=serializer.validated_data['tile_id'],
                    batch_id=serializer.validated_data['batch_id'],
                    from_location=serializer.validated_data['from_location'],
                    to_location=serializer.validated_data['to_location'],
                    cartons=serializer.validated_data['cartons'],
                    loose_pieces=serializer.validated_data['loose_pieces'],
                    performed_by=request.user,
                    reference=serializer.validated_data.get('reference', '')
                )
                return Response({
                    'success': True,
                    'data': {
                        'source_inventory': InventorySerializer(source_inventory).data,
                        'destination_inventory': InventorySerializer(dest_inventory).data,
                        'movement': MovementSerializer(movement).data
                    }
                }, status=status.HTTP_200_OK)
            except (ValidationError, ObjectDoesNotExist) as e:
                return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


User = get_user_model()


class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsInventoryViewer]

    @action(detail=False, methods=['get'])
    def stock_summary(self, request):
        total_tiles = Tile.objects.count()
        inventory_items = Inventory.objects.select_related('tile').all()
        total_cartons = sum(item.cartons for item in inventory_items)
        total_loose = sum(item.loose_pieces for item in inventory_items)
        total_pieces = sum(item.total_pieces for item in inventory_items)
        low_stock_count = sum(1 for item in inventory_items if item.total_pieces <= 50)
        location_count = Inventory.objects.values('location').distinct().count()
        total_batches = Batch.objects.count()
        return Response({
            'total_tiles': total_tiles,
            'total_cartons': total_cartons,
            'total_loose_pieces': total_loose,
            'total_pieces': total_pieces,
            'low_stock_count': low_stock_count,
            'location_count': location_count,
            'total_batches': total_batches,
        })

    @action(detail=False, methods=['get'])
    def movement_summary(self, request):
        period = request.query_params.get('period', 'day')
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        if period == 'week':
            since = now - timedelta(days=30)
            trunc = 'week'
        elif period == 'month':
            since = now - timedelta(days=365)
            trunc = 'month'
        else:
            since = now - timedelta(days=7)
            trunc = 'day'

        from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
        trunc_func = {'day': TruncDay, 'week': TruncWeek, 'month': TruncMonth}[trunc]

        movements = (
            Movement.objects.filter(created_at__gte=since)
            .annotate(period=trunc_func('created_at'))
            .values('period', 'movement_type')
            .annotate(count=Count('id'))
            .order_by('period', 'movement_type')
        )

        by_type = Movement.objects.filter(created_at__gte=since).values('movement_type').annotate(
            count=Count('id'), total_pieces=Sum('cartons_change')
        ).order_by('-count')

        return Response({
            'period': period,
            'since': since.isoformat(),
            'movements': list(movements),
            'by_type': list(by_type),
        })


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=True, methods=['post'])
    def set_role(self, request, pk=None):
        user = self.get_object()
        serializer = SetRoleSerializer(data=request.data)
        if serializer.is_valid():
            role = serializer.validated_data['role']
            group = None
            try:
                from django.contrib.auth.models import Group
                group = Group.objects.get(name='inventory_managers')
            except Group.DoesNotExist:
                pass
            if role == 'admin':
                user.is_superuser = True
                user.is_staff = True
                if group:
                    user.groups.add(group)
            elif role == 'manager':
                user.is_superuser = False
                user.is_staff = False
                if group:
                    user.groups.add(group)
            else:
                user.is_superuser = False
                user.is_staff = False
                if group:
                    user.groups.remove(group)
            user.save()
            return Response({'success': True, 'data': UserSerializer(user).data})
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)