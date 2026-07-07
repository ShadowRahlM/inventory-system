from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('inventory', '0008_sync_models'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tilecatalog',
            name='file',
        ),
        migrations.AddField(
            model_name='tilecatalog',
            name='json_data',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='tilecatalog',
            name='processed',
            field=models.BooleanField(default=False),
        ),
    ]
