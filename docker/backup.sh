#!/bin/sh
# Daily custom-format dump, kept for two weeks. Restore with:
#   pg_restore --clean --if-exists -d "$DATABASE_URL" /backups/invite-<stamp>.dump
#
# A failed dump must not kill the loop: with `restart: unless-stopped` that turns a
# transient error into a restart cycle nobody watches. It logs loudly and retries
# on the next round instead.
set -u
mkdir -p /backups
while true; do
  stamp=$(date -u +%Y%m%d-%H%M)
  # Write to .tmp and rename: a half-written dump must never look like a valid backup.
  if pg_dump --format=custom --file="/backups/invite-${stamp}.dump.tmp"; then
    mv "/backups/invite-${stamp}.dump.tmp" "/backups/invite-${stamp}.dump"
    find /backups -name 'invite-*.dump' -mtime +14 -delete
    echo "respaldo listo: invite-${stamp}.dump"
  else
    echo "FALLO DE RESPALDO ${stamp} — se reintenta en 24 h" >&2
    rm -f "/backups/invite-${stamp}.dump.tmp"
  fi
  sleep 86400
done
