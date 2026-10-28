#!/bin/sh
# AUDIT P3-10: encrypted PostgreSQL backup with integrity check and retention.
#
# Required environment:
#   DATABASE_URL or (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE)
#   BACKUP_ENCRYPTION_PASSPHRASE   long, randomly generated secret
# Optional:
#   BACKUP_DIR                     default ./backups
#   BACKUP_RETENTION_DAYS          default 14
#   BACKUP_OFFSITE_CMD             e.g. 'rclone copy "$1" remote:amir-backups'
#   BACKUP_PG_BIN                  directory containing pg_dump/pg_restore
#
# The script exits non-zero on any failure so cron/systemd can alert.
set -eu

umask 077

DB_URL="${DATABASE_URL:-}"
if [ -z "$DB_URL" ]; then
  : "${PGDATABASE:?DATABASE_URL or PGDATABASE is required}"
fi

: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
PG_BIN="${BACKUP_PG_BIN:-}"
if [ -n "$PG_BIN" ]; then
  PG_DUMP="$PG_BIN/pg_dump"
  PG_RESTORE="$PG_BIN/pg_restore"
else
  PG_DUMP="pg_dump"
  PG_RESTORE="pg_restore"
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP="$BACKUP_DIR/amir-$STAMP.dump"
CHECKSUM="$DUMP.sha256"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TMP="$(mktemp "$BACKUP_DIR/.dump-XXXXXX")"
cleanup() { rm -f "$TMP" "$TMP.enc"; }
trap cleanup EXIT INT TERM

echo "[backup] dumping database ..."
if [ -n "$DB_URL" ]; then
  "$PG_DUMP" --format=custom --no-owner --no-privileges --file="$TMP" "$DB_URL"
else
  "$PG_DUMP" --format=custom --no-owner --no-privileges --file="$TMP"
fi

echo "[backup] verifying archive ..."
"$PG_RESTORE" --list "$TMP" >/dev/null

echo "[backup] encrypting ..."
# AES-256 with PBKDF2; the passphrase must come from a secret store, never Git.
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$TMP" -out "$DUMP.enc" -pass env:BACKUP_ENCRYPTION_PASSPHRASE
rm -f "$TMP"
trap - EXIT INT TERM
mv "$DUMP.enc" "$DUMP"
( cd "$BACKUP_DIR" && sha256sum "$(basename "$DUMP")" > "$(basename "$CHECKSUM")" )
chmod 600 "$DUMP" "$CHECKSUM"

echo "[backup] wrote $DUMP ($(wc -c < "$DUMP") bytes)"

if [ -n "${BACKUP_OFFSITE_CMD:-}" ]; then
  echo "[backup] copying off-host ..."
  # shellcheck disable=SC2086
  sh -c "$BACKUP_OFFSITE_CMD" _ "$DUMP" "$CHECKSUM"
fi

echo "[backup] pruning local copies older than ${RETENTION_DAYS} days ..."
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'amir-*.dump' -o -name 'amir-*.dump.sha256' \) \
  -mtime "+$RETENTION_DAYS" -print -delete

echo "[backup] done"
