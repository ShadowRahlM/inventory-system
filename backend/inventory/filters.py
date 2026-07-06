from django.utils.dateparse import parse_datetime
from rest_framework.filters import BaseFilterBackend


class UpdatedSinceFilter(BaseFilterBackend):
    """Filter queryset by ?updated_since=<ISO datetime> for models with updated_at."""

    def filter_queryset(self, request, queryset, view):
        param = request.query_params.get('updated_since')
        if not param:
            return queryset
        dt = parse_datetime(param)
        if dt is None:
            return queryset
        model = queryset.model
        if hasattr(model, 'updated_at'):
            return queryset.filter(updated_at__gt=dt)
        if hasattr(model, 'created_at'):
            return queryset.filter(created_at__gt=dt)
        return queryset
