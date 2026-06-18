#!/bin/bash
set -e

# Diyou backup script for Docker/NAS deployment
# Usage: ./scripts/backup.sh [backup-dir]

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="diyou-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

mkdir -p "${BACKUP_PATH}"

echo "Stopping backend to ensure a consistent database backup..."
docker compose stop diyou-backend

echo "Copying database and storage..."
docker cp diyou-backend:/data/db/diyou.db "${BACKUP_PATH}/diyou.db"
docker cp diyou-backend:/data/storage "${BACKUP_PATH}/storage"

echo "Restarting backend..."
docker compose start diyou-backend

echo "Creating archive..."
tar czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
rm -rf "${BACKUP_PATH}"

echo "Backup created: ${BACKUP_PATH}.tar.gz"
