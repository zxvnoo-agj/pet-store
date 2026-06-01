#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_NAME="${DB_NAME:-petshop}"
DB_USER="${DB_USER:-petshop}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-petstore-postgres}"
REDIS_CONTAINER="${REDIS_CONTAINER:-petstore-redis}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "=== Database Backup: $TIMESTAMP ==="

echo "--- Backing up PostgreSQL ---"
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"
echo "PostgreSQL backup saved: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"

echo "--- Backing up Redis ---"
docker exec "$REDIS_CONTAINER" redis-cli BGSAVE
sleep 2
echo "Redis backup triggered (RDB)."

echo "--- Cleaning backups older than 30 days ---"
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +30 -delete

echo "=== Backup complete ==="
