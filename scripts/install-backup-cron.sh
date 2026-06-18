#!/bin/bash
set -e

# Install a daily backup cron job for the Diyou project.
# Run this script on your NAS after the project is deployed.

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${1:-${PROJECT_DIR}/backups}"
RETENTION_DAYS="${2:-7}"
CRON_SCHEDULE="30 2 * * *"
CRON_JOB="${CRON_SCHEDULE} cd ${PROJECT_DIR} && ${PROJECT_DIR}/scripts/backup-with-retention.sh ${BACKUP_DIR} ${RETENTION_DAYS} >> ${PROJECT_DIR}/backups/backup.log 2>&1"

mkdir -p "${BACKUP_DIR}"

# Remove existing diyou backup cron job if present
(crontab -l 2>/dev/null | grep -v 'backup-with-retention.sh' || true) > /tmp/diyou-crontab

# Add new cron job
echo "${CRON_JOB}" >> /tmp/diyou-crontab
crontab /tmp/diyou-crontab
rm -f /tmp/diyou-crontab

echo "Daily backup cron installed:"
echo "  Project:  ${PROJECT_DIR}"
echo "  Backups:  ${BACKUP_DIR}"
echo "  Retain:   ${RETENTION_DAYS} days"
echo "  Schedule: ${CRON_SCHEDULE}"
echo ""
echo "You can verify with: crontab -l"
