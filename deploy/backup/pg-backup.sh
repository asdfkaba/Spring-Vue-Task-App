#!/usr/bin/env bash
# Daily dump of the app database, run by pg-backup.timer (see README.md in this folder).
#
# Writes <BACKUP_DIR>/spring-<UTC time>.dump in pg_dump's custom format (compressed,
# restore with pg_restore) and deletes dumps older than KEEP_DAYS.
# The password comes from ~/.pgpass, so it is neither in this file nor in the process list.
set -euo pipefail

DB_NAME="${DB_NAME:-spring}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:?set DB_USER to the database user from spring.datasource.username}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/postgres}"
KEEP_DAYS="${KEEP_DAYS:-14}"

umask 077 # dumps contain all user data
mkdir -p "$BACKUP_DIR"

target="$BACKUP_DIR/$DB_NAME-$(date -u +%Y-%m-%dT%H%M%SZ).dump"
partial="$target.partial"
trap 'rm -f "$partial"' EXIT

# --no-password: fail instead of waiting for input when ~/.pgpass is missing or wrong.
pg_dump --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --no-password \
  --format=custom --file="$partial" "$DB_NAME"

# A dump that pg_restore can't read is no backup; keep the old ones in that case.
pg_restore --list "$partial" > /dev/null

mv "$partial" "$target"
echo "Backup written: $target ($(du -h "$target" | cut -f1))"

# Only after a good dump, so a failing backup never deletes the last working ones.
find "$BACKUP_DIR" -maxdepth 1 -name "$DB_NAME-*.dump" -type f -mtime +"$KEEP_DAYS" -print -delete
