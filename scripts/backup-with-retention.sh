#!/bin/bash
set -e

# Diyou daily backup with retention
# Usage: ./scripts/backup-with-retention.sh [backup-dir] [retention-days]
# Example cron entry (runs daily at 2:30 AM):
#   30 2 * * * cd /path/to/project && ./scripts/backup-with-retention.sh /nas/backups/diyou 7 >> /var/log/diyou-backup.log 2>&1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${2:-7}"

mkdir -p "${BACKUP_DIR}"

"${SCRIPT_DIR}/backup.sh" "${BACKUP_DIR}"

# Delete backups older than retention period
find "${BACKUP_DIR}" -maxdepth 1 -name 'diyou-backup-*.tar.gz' -mtime +"${RETENTION_DAYS}" -type f -delete

echo "Cleanup complete. Backups older than ${RETENTION_DAYS} days removed."
