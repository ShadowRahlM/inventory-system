import uuid
from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Tile(models.Model):
    BRAND_CHOICES = [
        ('goodwill', 'Goodwill'),
        ('crown_crane', 'Crown Crane'),
        ('other', 'Other'),
    ]
    TIER_CHOICES = [
        ('standard', 'Standard'),
        ('premium', 'Premium'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sku = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    dimensions = models.CharField(max_length=50)  # e.g., "30x30cm"
    pieces_per_carton = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    category = models.CharField(max_length=100, db_index=True)
    brand = models.CharField(max_length=50, choices=BRAND_CHOICES, default='other')
    series = models.CharField(max_length=100, blank=True, help_text="Collection/series name (e.g. Cosmos, Noble, Glaze)")
    tier = models.CharField(max_length=50, choices=TIER_CHOICES, default='standard')
    tile_type = models.CharField(max_length=100, blank=True, help_text="e.g. Ceramic Floor Tile, Porcelain Wall Tile")
    finish = models.CharField(max_length=100, blank=True, help_text="e.g. Matt, Gloss, Matt or Gloss available")
    thickness = models.CharField(max_length=50, blank=True, help_text="e.g. 8-10mm")
    coverage_per_box = models.CharField(max_length=100, blank=True, help_text="e.g. 1.92 sqm per box")
    use_case = models.CharField(max_length=200, blank=True, help_text="e.g. Living rooms, bedrooms")
    image = models.ImageField(upload_to='tiles/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['category']),
            models.Index(fields=['brand']),
            models.Index(fields=['tier']),
        ]

    def __str__(self):
        return f"{self.sku} - {self.name}"


class Batch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tile = models.ForeignKey(Tile, on_delete=models.PROTECT, related_name='batches')
    batch_number = models.CharField(max_length=50, unique=True, db_index=True)
    production_date = models.DateField()
    supplier = models.CharField(max_length=200)
    received_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['batch_number']),
            models.Index(fields=['tile']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['tile', 'batch_number'],
                name='unique_tile_batch'
            )
        ]

    def __str__(self):
        return f"{self.batch_number} - {self.tile.sku}"


class Inventory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tile = models.ForeignKey(Tile, on_delete=models.PROTECT, related_name='inventory')
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT, related_name='inventory')
    cartons = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    loose_pieces = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    location = models.CharField(max_length=100, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['tile']),
            models.Index(fields=['batch']),
            models.Index(fields=['location']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['tile', 'batch', 'location'],
                name='unique_tile_batch_location'
            ),

        ]

    @property
    def total_pieces(self) -> int:
        return (self.cartons * self.batch.tile.pieces_per_carton) + self.loose_pieces

    def __str__(self):
        return f"{self.tile.sku} - {self.batch.batch_number} - {self.location}"


class MovementType(models.TextChoices):
    RECEIVING = 'RECEIVING', 'Receiving'
    DISPATCH = 'DISPATCH', 'Dispatch'
    ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'
    TRANSFER = 'TRANSFER', 'Transfer'


class Movement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tile = models.ForeignKey(Tile, on_delete=models.PROTECT, related_name='movements')
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    cartons_change = models.IntegerField()
    loose_pieces_change = models.IntegerField()
    previous_cartons = models.PositiveIntegerField()
    previous_loose_pieces = models.PositiveIntegerField()
    new_cartons = models.PositiveIntegerField()
    new_loose_pieces = models.PositiveIntegerField()
    reference = models.CharField(max_length=100, blank=True)
    reason = models.TextField(blank=True)
    performed_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='movements')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['tile']),
            models.Index(fields=['batch']),
            models.Index(fields=['movement_type']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.movement_type} - {self.tile.sku} - {self.created_at}"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    movement = models.ForeignKey(Movement, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=100)
    old_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    changed_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='audit_logs')
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['movement']),
            models.Index(fields=['timestamp']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} - {self.timestamp}"


class TileCatalog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='catalogs/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.name


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    lead_time_days = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class OrderStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    CONFIRMED = 'CONFIRMED', 'Confirmed'
    SHIPPED = 'SHIPPED', 'Shipped'
    DELIVERED = 'DELIVERED', 'Delivered'
    CANCELLED = 'CANCELLED', 'Cancelled'


class SalesOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='sales_orders')
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.DRAFT)
    order_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='sales_orders')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['status']),
            models.Index(fields=['order_date']),
        ]
        ordering = ['-order_date']

    def save(self, *args, **kwargs):
        if not self.order_number:
            prefix = 'SO'
            date_part = timezone.now().strftime('%Y%m%d')
            last_today = SalesOrder.objects.filter(
                order_number__startswith=f'{prefix}-{date_part}'
            ).count()
            self.order_number = f'{prefix}-{date_part}-{last_today + 1:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_number} - {self.customer.name}"


class PurchaseOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders')
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.DRAFT)
    order_date = models.DateTimeField(auto_now_add=True)
    expected_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='purchase_orders')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['status']),
            models.Index(fields=['order_date']),
        ]
        ordering = ['-order_date']

    def save(self, *args, **kwargs):
        if not self.order_number:
            prefix = 'PO'
            date_part = timezone.now().strftime('%Y%m%d')
            last_today = PurchaseOrder.objects.filter(
                order_number__startswith=f'{prefix}-{date_part}'
            ).count()
            self.order_number = f'{prefix}-{date_part}-{last_today + 1:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_number} - {self.supplier.name}"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    NOTIFICATION_TYPES = [
        ('LOW_STOCK', 'Low Stock'),
        ('MOVEMENT', 'Movement'),
        ('ORDER_STATUS', 'Order Status'),
        ('SYSTEM', 'System'),
    ]
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title}"


class OrderLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sales_order = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, null=True, blank=True, related_name='line_items')
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, null=True, blank=True, related_name='line_items')
    tile = models.ForeignKey(Tile, on_delete=models.PROTECT, related_name='order_line_items')
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT, null=True, blank=True, related_name='order_line_items')
    quantity_cartons = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    quantity_loose = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        indexes = [
            models.Index(fields=['sales_order']),
            models.Index(fields=['purchase_order']),
            models.Index(fields=['tile']),
        ]

    def save(self, *args, **kwargs):
        total_pieces = (self.quantity_cartons * self.tile.pieces_per_carton) + self.quantity_loose
        self.line_total = self.unit_price * total_pieces
        super().save(*args, **kwargs)

    def __str__(self):
        order = self.sales_order or self.purchase_order
        return f"{order.order_number if order else 'No Order'} - {self.tile.sku}"


class SyncState(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    peer_url = models.URLField(max_length=500)
    model_name = models.CharField(max_length=100)
    last_synced_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('peer_url', 'model_name')
        verbose_name_plural = 'Sync states'

    def __str__(self):
        return f"{self.peer_url} / {self.model_name}"


class SyncConflict(models.Model):
    RESOLUTION_CHOICES = [
        ('local', 'Keep Local'),
        ('remote', 'Use Remote'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    model_name = models.CharField(max_length=100)
    record_id = models.UUIDField()
    peer_url = models.URLField(max_length=500)
    local_data = models.JSONField()
    remote_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolution = models.CharField(max_length=20, null=True, blank=True, choices=RESOLUTION_CHOICES)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['model_name', 'record_id']),
            models.Index(fields=['resolved']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Conflict: {self.model_name} / {self.record_id} from {self.peer_url}"
