#!/bin/sh
# AUDIT P3-10: restore drill. This DESTROYS the target database objects.
# Always restore into a scratch database first and verify application health
# there before touching production.
#
# Usage:
#   RESTORE_CONFIRM=yes BACKUP_ENCRYPTION_PASSPHRASE=... \
#     DATABASE_URL=postgresql://user:pass@host:5432/amir_restore_test \
#     ./scripts/restore.sh backups/amir-20260101T000000Z.dump
set -eu
umask 077

DUMP="${1:?usage: restore.sh <encrypted dump file>}"
[ -f "$DUMP" ] || { echo "[restore] missing $DUMP" >&2; exit 1; }
[ "${RESTORE_CONFIRM:-}" = "yes" ] || { echo "[restore] set RESTORE_CONFIRM=yes to proceed" >&2; exit 1; }
: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"
: "${DATABASE_URL:?DATABASE_URL pointing at the (scratch) target is required}"

if [ -f "$DUMP.sha256" ]; then
  echo "[restore] verifying checksum ..."
  ( cd "$(dirname "$DUMP")" && sha256sum -c "$(basename "$DUMP").sha256" )
fi

TMP="$(mktemp "${TMPDIR:-/tmp}/amir-restore-XXXXXX")"
trap 'rm -f "$TMP"' EXIT INT TERM

echo "[restore] decrypting ..."
openssl enc -d -aes-256-cbc -pbkdf2 -in "$DUMP" -out "$TMP" -pass env:BACKUP_ENCRYPTION_PASSPHRASE

echo "[restore] restoring into target ..."
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname="$DATABASE_URL" "$TMP"

echo "[restore] restore complete. Verify:"
echo "  1. SELECT COUNT(*) FROM \"Booking\";"
echo "  2. prisma migrate status"
echo "  3. start a staging app against this DB and run the booking smoke checks"
