#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.dump>"
  echo ""
  echo "Available backups:"
  ls -1 "$(dirname "$0")/../backups"/inventory_*.dump 2>/dev/null || echo "  (no backups found)"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will REPLACE all data in the database."
read -rp "Are you sure? (type 'yes' to confirm): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Restoring from $BACKUP_FILE ..."
docker compose cp "$BACKUP_FILE" db:/tmp/restore.dump
docker compose exec -T db pg_restore -U postgres --clean --if-exists --no-owner --no-acl -d inventory_db /tmp/restore.dump
docker compose exec -T db rm -f /tmp/restore.dump
echo "✓ Restore complete."
