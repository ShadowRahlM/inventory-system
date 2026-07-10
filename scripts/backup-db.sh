#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker compose exec -T db pg_dump -U postgres --no-owner --no-acl --format=custom inventory_db \
  > "$BACKUP_DIR/inventory_${TIMESTAMP}.dump"

SIZE=$(stat --format=%s "$BACKUP_DIR/inventory_${TIMESTAMP}.dump" 2>/dev/null || echo "?")
echo "✓ Backup saved: $BACKUP_DIR/inventory_${TIMESTAMP}.dump  (${SIZE} bytes)"

# Keep last 30 dumps, delete older ones
ls -t "$BACKUP_DIR"/inventory_*.dump 2>/dev/null | tail -n +31 | xargs -r rm --

echo "  (pruned backups older than 30 most recent)"
