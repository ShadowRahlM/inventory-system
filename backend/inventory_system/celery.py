import os
from celery import Celery
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_system.settings')

app = Celery('inventory_system')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()