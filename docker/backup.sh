#!/bin/sh
# Daily custom-format dump, kept for two weeks. Restore with:
#   pg_restore --clean --if-exists -d "$DATABASE_URL" /backups/invite-<stamp>.dump
set -eu
mkdir -p /backups
while true; do
  stamp=$(date -u +%Y%m%d-%H%M)
  pg_dump --format=custom --file="/backups/invite-${stamp}.dump"
  find /backups -name 'invite-*.dump' -mtime +14 -delete
  echo "respaldo listo: invite-${stamp}.dump"
  sleep 86400
done
