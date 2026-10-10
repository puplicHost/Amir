# Docker & Database Configuration Check — ME-Project

Generated: 2026-10-10
Scope: `docker-compose.yml` + `.env`
Status: **SUPERSEDED 2026-10-10 (server setup)** — compose rewritten for NPM/`proxy`
network: `name: mango-electronics`, app on `internal` + external `proxy` (expose 3000,
no published ports), db on `internal` only (+`5439` kept published for local dev),
`pgdata` pinned external to existing `me-project_pgdata` (data preserved),
app `DATABASE_URL` overridden to `mango-electronics-db:5432` (`.env` untouched, still
`localhost:5439` for `npm run dev`). App built and running: `/api/health` 200,
`/api/admin/auth/login` 200 via internal network.

---

## Section 1 — Current Config

Source files read verbatim.

### 1.1 `docker-compose.yml` (current, full relevant excerpt)

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: mango
      POSTGRES_PASSWORD: mango
      POSTGRES_DB: mango
    ports:
      - "5434:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mango -d mango"]
      interval: 5s
      timeout: 5s
      retries: 10
```

No `container_name:` key exists in the file.
No `networks:` block exists in the file (neither at service level nor top level).

### 1.2 Extracted values

| Item | Current value | Source |
|---|---|---|
| Database name | `mango` | `docker-compose.yml` → `services.db.environment.POSTGRES_DB` |
| Database user | `mango` | `docker-compose.yml` → `services.db.environment.POSTGRES_USER` |
| Database port mapped to host | `5434` (mapping `"5434:5432"` — host `5434` → container `5432`) | `docker-compose.yml` → `services.db.ports` |
| Container name for the postgres service | **Not set** — no `container_name` key. Docker Compose auto-generates it as `<directory>-db-1` (e.g. `me-project-db-1`) | `docker-compose.yml` → `services.db` (key absent) |
| Docker network name | **Not set** — no `networks:` block. Compose uses the implicit default network `<project>_default` | `docker-compose.yml` (block absent) |
| `DATABASE_URL` in `.env` | `postgresql://mango:mango@localhost:5434/mango?schema=public` | `.env` line 1 |

Raw `.env` line 1:

```
DATABASE_URL="postgresql://mango:mango@localhost:5434/mango?schema=public"
```

Note: `.env.example` line 4 contains the identical URL and the comment
`Port must match docker-compose.yml db mapping ("5434:5432")` — so both files
must be kept in sync.

---

## Section 2 — Risk Check

Checked against default / collision-prone values for co-hosted projects
on the same Docker host.

| Check | Default / risky value | This project | Verdict |
|---|---|---|---|
| Postgres host port | `5432` — two projects both publishing `5432:5432` → second `docker compose up` fails with `port is already allocated` | `5434:5432` (host `5434`) | **PASS** — already off the default. Low conflict risk today, but `5434` is still a commonly chosen first alternate, so pinning a rarer port is safer (see §3). |
| Container name | `postgres` or any shared literal — two projects with the same `container_name` → `Conflict. The container name ... is already in use` on `docker compose up` | No `container_name` set (auto-generated `<directory>-db-1`) | **WARNING** — no hard conflict today, but the name is implicit and depends on the folder name. Two checkouts with the same folder name (e.g. two clones both called `ME-Project`) produce the same generated name and can confuse `docker ps` / scripts. No explicit unique name. |
| Database name | `postgres` (image default) — two projects sharing one server/cluster with the same DB name → tables/data can mix, and a `prisma migrate` in one project can touch the other's data | `mango` | **WARNING** — not the `postgres` default, so no immediate mixing, but `mango` is short and generic. Any second project that also picks `mango` (likely, given the same stack/author) reconnecting to the wrong host port would silently read/write the wrong database. |
| Docker network name | Implicit `*_default` in every project — containers from different Compose projects land on different default networks, but with no explicit network, cross-project name resolution (`db`, `app`) and network-scoped tooling become ambiguous | No `networks:` block (implicit default) | **WARNING** — no explicit isolation label. Explicit named network makes `docker network ls` unambiguous and prevents future `db`-hostname collisions if projects are ever attached to a shared external network. |

**Summary:** 1 × PASS (host port is already non-default), 3 × WARNING
(no explicit `container_name`, generic DB name `mango`, no explicit network).
No `postgres`-default values in use, so there is no critical active conflict —
but the configuration is not collision-proof per the project's own standard.
Fix recommended below.

---

## Section 3 — Recommended Fix (THIS project only)

Apply these exact values for `ME-Project`. Nothing here has been applied yet.

### 3.1 Target values

| Item | New unique value |
|---|---|
| Host port | `5439` (mapping `"5439:5432"`). Rationale: `5432` = default, `5433`/`5434`/`5435` are the most common first alternates; `5439` is rarely used and keeps the `543x` convention. |
| Container name | `mango-electronics-db` |
| Database name | `mango_electronics_db` |
| Network name | `mango-electronics-network` |
| Updated `DATABASE_URL` | `postgresql://mango:mango@localhost:5439/mango_electronics_db?schema=public` (user/password unchanged to keep the diff minimal; only port + db name change) |

### 3.2 Exact lines to change in `docker-compose.yml`

Replace the entire `db:` service block (lines 2–17) with:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: mango-electronics-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: mango
      POSTGRES_PASSWORD: mango
      POSTGRES_DB: mango_electronics_db
    ports:
      - "5439:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mango -d mango_electronics_db"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - mango-electronics-network
```

Line-by-line diff vs. current file:

| Line(s) | Old (exact) | New (exact) |
|---|---|---|
| after `image: postgres:16-alpine` | *(absent)* | `    container_name: mango-electronics-db` |
| `POSTGRES_DB` | `      POSTGRES_DB: mango` | `      POSTGRES_DB: mango_electronics_db` |
| `ports` | `      - "5434:5432"` | `      - "5439:5432"` |
| `healthcheck.test` | `      test: ["CMD-SHELL", "pg_isready -U mango -d mango"]` | `      test: ["CMD-SHELL", "pg_isready -U mango -d mango_electronics_db"]` |
| after `retries: 10` (db service) | *(absent)* | `    networks:\n      - mango-electronics-network` |

Attach the `app` service to the same network — add under the `app:` service
(next to its existing `volumes:` block, lines 37–39):

```yaml
    networks:
      - mango-electronics-network
```

And add the top-level network definition at the end of the file
(after the existing `volumes:` block, lines 41–44):

```yaml
networks:
  mango-electronics-network:
    name: mango-electronics-network
    driver: bridge
```

Full tail of file after the fix should read:

```yaml
volumes:
  pgdata:
  uploads-data:
  app-storage:

networks:
  mango-electronics-network:
    name: mango-electronics-network
    driver: bridge
```

### 3.3 Exact line to change in `.env`

`.env` line 1, old (exact):

```
DATABASE_URL="postgresql://mango:mango@localhost:5434/mango?schema=public"
```

`.env` line 1, new (exact):

```
DATABASE_URL="postgresql://mango:mango@localhost:5439/mango_electronics_db?schema=public"
```

Same change is needed in `.env.example` line 4 (keeps docs in sync), plus its
comment on line 3:

Old (exact):

```
# Port must match docker-compose.yml db mapping ("5434:5432").
DATABASE_URL="postgresql://mango:mango@localhost:5434/mango?schema=public"
```

New (exact):

```
# Port must match docker-compose.yml db mapping ("5439:5432").
DATABASE_URL="postgresql://mango:mango@localhost:5439/mango_electronics_db?schema=public"
```

### 3.4 Post-change notes (for when you approve the fix)

1. `POSTGRES_DB` only takes effect on first volume init. After applying the
   change, recreate the DB volume (`docker compose down -v` **wipes local dev
   data** — back up first) or create the new database manually:
   `CREATE DATABASE mango_electronics_db;`.
2. Verify with: `docker ps --filter name=mango-electronics-db`,
   `docker network ls | grep mango-electronics-network`, and
   `npx prisma db pull` / app boot against the new `DATABASE_URL`.
3. No file has been modified by this report — superseded: fix applied 2026-10-10, see Status header.
