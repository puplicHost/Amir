# Backup & Restore Runbook (AUDIT P3-10)

Status: tooling and runbook added. **No backup job has been executed from this
repository**, and no restore drill has been performed. An authorized operator
must schedule the job, verify the first encrypted artifact, and complete a
restore drill into a scratch database before claiming backup coverage.

## What exists

| File | Purpose |
|---|---|
| `scripts/backup.sh` | `pg_dump --format=custom`, archive verification (`pg_restore --list`), AES-256/PBKDF2 encryption, SHA-256 checksum, local retention, optional off-host copy |
| `scripts/restore.sh` | Checksum verification, decryption, `pg_restore --clean --if-exists --exit-on-error` into an explicitly confirmed target |
| `Docs/BACKUP-RESTORE.md` | This runbook |

Neither script is wired into application startup. Backups must run outside the
app container so a broken deployment cannot stop the backup schedule.

## Required secrets / variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes (or `PG*` vars) | Use a dedicated backup role with `SELECT` on all tables |
| `BACKUP_ENCRYPTION_PASSPHRASE` | yes | ≥ 32 random characters from a secret store; never commit it |
| `BACKUP_DIR` | no | Default `./backups`; must be writable and not inside the web root |
| `BACKUP_RETENTION_DAYS` | no | Default `14` |
| `BACKUP_OFFSITE_CMD` | production: yes | Receives dump as `$1` and checksum as `$2`, e.g. `rclone copy "$1" remote:amir-backups && rclone copy "$2" remote:amir-backups` |
| `RESTORE_CONFIRM` | restore only | Must be exactly `yes` |

## Schedule (host cron)

```cron
# 02:15 UTC daily; output goes to the operator's log collector.
15 2 * * *  cd /srv/amir && set -a && . ./.backup.env && set +a && ./scripts/backup.sh >> /var/log/amir-backup.log 2>&1
```

`/srv/amir/.backup.env` must be mode `0600`, owned by the deploy user, and
excluded from Git.

### systemd timer alternative

`/etc/systemd/system/amir-backup.service`:

```ini
[Unit]
Description=Amir encrypted PostgreSQL backup
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/srv/amir
EnvironmentFile=/srv/amir/.backup.env
ExecStart=/srv/amir/scripts/backup.sh
User=deploy
```

`/etc/systemd/system/amir-backup.timer`:

```ini
[Unit]
Description=Daily Amir backup

[Timer]
OnCalendar=*-*-* 02:15:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

Enable with `systemctl enable --now amir-backup.timer`.

## Off-host storage

Local-only backups do not survive host loss. Configure at least one of:

- `rclone` to an S3-compatible bucket with object lock / versioning.
- Cloud provider snapshot schedule for the database volume **in addition to**
  logical dumps (snapshots alone cannot restore a single table).
- A second host pulling the encrypted artifacts.

Verify that the destination retains at least 30 days and that access is limited
to the backup role.

## Restore drill (mandatory, quarterly)

1. Provision an empty scratch database, e.g. `amir_restore_drill`.
2. Pick the newest artifact and its checksum from the off-host destination.
3. Run:

   ```sh
   RESTORE_CONFIRM=yes \
   BACKUP_ENCRYPTION_PASSPHRASE="$(secret-tool lookup service amir-backup)" \
   DATABASE_URL='postgresql://restore@db:5432/amir_restore_drill' \
   ./scripts/restore.sh backups/amir-YYYYMMDDTHHMMSSZ.dump
   ```

4. Verify row counts for `Booking`, `Product`, `AdminUser`, `NotificationOutbox`.
5. Run `npx prisma migrate status` against the scratch DB and confirm no pending
   migrations beyond the artifact's schema version.
6. Start a staging app against the scratch DB, open the public catalogue, and
   complete one test booking with a payment provider in sandbox mode.
7. Record the drill date, artifact name, checksum, and verifier in the
   operations log. Do not mark P3-10 as verified before this record exists.

## Known gaps

- No automated backup/restore test in CI (requires an ephemeral database and
  secrets; out of scope for the code-only remediation).
- The historical `backups/*.dump` file already present in Git history is a
  separate exposure tracked under P1-02/P3-15; it must be purged and the
  database credentials rotated. See `Docs/FULL-WEBSITE-REMEDIATION.md`.
- Retention/pruning runs only on the host that executes `backup.sh`; confirm the
  off-host destination applies its own lifecycle policy.
