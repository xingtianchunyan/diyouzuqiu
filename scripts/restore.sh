#!/bin/bash
set -e

# Diyou restore script for Docker/NAS deployment
# Usage: ./scripts/restore.sh <path-to-backup.tar.gz>

ARCHIVE="$1"
if [ -z "$ARCHIVE" ]; then
  echo "Usage: $0 <path-to-backup.tar.gz>"
  exit 1
fi

if [ ! -f "$ARCHIVE" ]; then
  echo "Archive not found: $ARCHIVE"
  exit 1
fi

RESTORE_DIR=$(mktemp -d)
tar xzf "$ARCHIVE" -C "$RESTORE_DIR"

BACKUP_NAME=$(basename "$ARCHIVE" .tar.gz)
BACKUP_PATH="${RESTORE_DIR}/${BACKUP_NAME}"

echo "Stopping services..."
docker compose stop diyou-backend diyou-web

echo "Restoring database and storage..."
docker cp "${BACKUP_PATH}/diyou.db" diyou-backend:/data/db/diyou.db
docker cp "${BACKUP_PATH}/storage/." diyou-backend:/data/storage/

echo "Restarting services..."
docker compose start diyou-backend diyou-web

rm -rf "$RESTORE_DIR"
echo "Restore completed from: $ARCHIVE"
