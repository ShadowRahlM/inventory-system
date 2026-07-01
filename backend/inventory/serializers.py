from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Tile, Batch, Inventory, Movement, AuditLog, TileCatalog

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'role', 'password']
        read_only_fields = ['id']

    def get_role(self, obj):
        if obj.is_superuser:
            return 'admin'
        if obj.groups.filter(name='inventory_managers').exists():
            return 'manager'
        return 'viewer'

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class SetRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['admin', 'manager', 'viewer'])


class TileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tile
        fields = '__all__'


class BatchSerializer(serializers.ModelSerializer):
    tile_sku = serializers.CharField(source='tile.sku', read_only=True)
    tile_name = serializers.CharField(source='tile.name', read_only=True)

    class Meta:
        model = Batch
        fields = '__all__'
        read_only_fields = ['received_date']


class InventorySerializer(serializers.ModelSerializer):
    tile_sku = serializers.CharField(source='tile.sku', read_only=True)
    tile_name = serializers.CharField(source='tile.name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    total_pieces = serializers.SerializerMethodField()

    class Meta:
        model = Inventory
        fields = '__all__'

    def get_total_pieces(self, obj):
        return obj.total_pieces


class MovementSerializer(serializers.ModelSerializer):
    tile_sku = serializers.CharField(source='tile.sku', read_only=True)
    tile_name = serializers.CharField(source='tile.name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    performed_by_username = serializers.CharField(source='performed_by.username', read_only=True)

    class Meta:
        model = Movement
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(source='changed_by.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = '__all__'


class TileCatalogSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = TileCatalog
        fields = '__all__'
        read_only_fields = ['uploaded_by']


class ReceiveInventorySerializer(serializers.Serializer):
    tile_id = serializers.UUIDField()
    batch_number = serializers.CharField(max_length=100)
    production_date = serializers.DateField()
    supplier = serializers.CharField(max_length=200)
    cartons = serializers.IntegerField(min_value=0)
    loose_pieces = serializers.IntegerField(min_value=0)
    location = serializers.CharField(max_length=100)
    reference = serializers.CharField(required=False, allow_blank=True)


class DispatchInventorySerializer(serializers.Serializer):
    tile_id = serializers.UUIDField()
    batch_id = serializers.UUIDField()
    cartons = serializers.IntegerField(min_value=0)
    loose_pieces = serializers.IntegerField(min_value=0)
    location = serializers.CharField(max_length=100)
    reference = serializers.CharField(required=False, allow_blank=True)


class AdjustInventorySerializer(serializers.Serializer):
    tile_id = serializers.UUIDField()
    batch_id = serializers.UUIDField()
    location = serializers.CharField(max_length=100)
    new_cartons = serializers.IntegerField(min_value=0)
    new_loose_pieces = serializers.IntegerField(min_value=0)
    reason = serializers.CharField(max_length=500)


class TransferInventorySerializer(serializers.Serializer):
    tile_id = serializers.UUIDField()
    batch_id = serializers.UUIDField()
    from_location = serializers.CharField(max_length=100)
    to_location = serializers.CharField(max_length=100)
    cartons = serializers.IntegerField(min_value=0)
    loose_pieces = serializers.IntegerField(min_value=0)
    reference = serializers.CharField(required=False, allow_blank=True)
