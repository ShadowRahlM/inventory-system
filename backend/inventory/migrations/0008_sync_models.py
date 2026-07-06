from django.db import migrations, models
import uuid
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0007_notification'),
    ]

    operations = [
        migrations.AddField(
            model_name='batch',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='batch',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.CreateModel(
            name='SyncConflict',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('model_name', models.CharField(max_length=100)),
                ('record_id', models.UUIDField()),
                ('peer_url', models.URLField(max_length=500)),
                ('local_data', models.JSONField()),
                ('remote_data', models.JSONField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('resolved', models.BooleanField(default=False)),
                ('resolution', models.CharField(blank=True, choices=[('local', 'Keep Local'), ('remote', 'Use Remote')], max_length=20, null=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SyncState',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('peer_url', models.URLField(max_length=500)),
                ('model_name', models.CharField(max_length=100)),
                ('last_synced_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name_plural': 'Sync states',
                'unique_together': {('peer_url', 'model_name')},
            },
        ),
        migrations.AddIndex(
            model_name='syncconflict',
            index=models.Index(fields=['model_name', 'record_id'], name='inventory_s_model_n_2efaa1_idx'),
        ),
        migrations.AddIndex(
            model_name='syncconflict',
            index=models.Index(fields=['resolved'], name='inventory_s_resolve_d59b3f_idx'),
        ),
        migrations.AddIndex(
            model_name='syncconflict',
            index=models.Index(fields=['created_at'], name='inventory_s_created_2a54e2_idx'),
        ),
    ]
