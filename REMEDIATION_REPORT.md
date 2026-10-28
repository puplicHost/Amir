# Remediation Report — AMIR Salon

Fixes applied against `AUDIT_REPORT_AMIR_SALON.md`. Severity ordering follows
the report's P0→P3 roadmap. No business rules (deposits/refunds/overlap) were
changed; no dependency versions were bumped.

> **Verification status:** the per-finding checks below are *static* (code
> review). `npm run build` (`nuxt build`) was then run on human approval and
> **succeeded (exit 0)** — see "Build verification". A functional test pass was
> subsequently run against the local dev DB and dev server (unit, DB-only and
> HTTP integration suites — **0 failures**) — see "Functional test results".
> There is no `lint`/`typecheck`/`test` script in `package.json`. Live payment
> gateway capture and browser E2E remain outstanding; no deployment was
> performed.

## P0 — Security / money / broken UX

### SEC-01 — Admin settings leaked secret fields
- `server/api/admin/settings/index.get.ts` now uses a Prisma `select`
  whitelist (no `stripeSecretKey`, `paypalSecret`, `mailHttpKey`, SMTP creds,
  Meta tokens, etc.) and requires `settings.business`/`banners.manage`.
- `mail.put.ts` only replaces `mailHttpKey` when a non-empty value is given.

### SEC-02 / SEC-15 — Secrets & dumps in git
- `.gitignore` adds `backups/`, `*.dump`, `*.sql`, `storage/`.
- `git rm --cached -r backups storage` (working files preserved).

### SEC-16 — Default seed password
- `.env.example` seed password → placeholder; `prisma/seed.mjs` and
  `prisma/seed-admin.mjs` require `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.

### UX-02 — Success page showed "failed" while webhook pending
- `app/pages/booking/success.vue` polls `/api/bookings/status/:token` (3s, up
  to ~60s) and renders distinct **confirming** and **still processing** states
  instead of a false failure. Purchase tracking fires once on PAID.

### UX-01 — Deposit not disclosed before redirect
- `app/pages/booking/[slug].vue` never auto-redirects anymore. The deposit is
  always shown and payment is an explicit step (works for one or both
  gateways).

### UX-03 — Missing admin booking detail page (deep-link 404)
- Added `app/pages/admin/bookings/[id].vue`: customer (with normalized WhatsApp
  link), service/schedule, payment, email log, and actions (assign/reassign,
  mark completed, cancel + refund, mark refund handled).

### FE-01 — Broken German `wa.me` links
- `app/pages/admin/calendar.vue` and `reminders.vue` route customer numbers
  through `normalizePhoneForWa` (`0171… → 49171…`).
- `app/composables/useWhatsApp.ts` is explicitly re-scoped + documented as the
  studio's own contact-number helper only (customer numbers must use
  `shared/booking`).

## P1 — Correctness / reliability / medium security

### DB-01 / DB-02 — Missing indexes
- `prisma/schema.prisma`: added `@@index([startsAt])`,
  `@@index([status, startsAt])`, `@@index([paymentStatus, holdExpiresAt])`.
- Migration: `prisma/migrations/20261019000000_booking_range_indexes`.

### PERF-01 — Write-on-read on availability
- Removed `expireHolds()` from `server/api/availability.get.ts`. Lapsed holds
  are already ignored (`loadDayBookings` filters `holdExpiresAt > now`) and
  physically expired by `server/plugins/booking-sweeper.ts`.

### SEC-04 — Staff avatars not publicly servable
- `staff` added to `PUBLIC_SCOPES` in `server/routes/uploads/[...path].get.ts`
  so the customer staff picker renders avatars.

### SEC-05 / SEC-06 — Upload validation
- `server/utils/storage.ts`: `assertRasterImage`, `saveBrandImage`,
  `saveFavicon` (ICO magic or raster→PNG), `saveStaffPhoto` (WebP),
  `saveReceipt` (PDF magic or raster). Wired into `logo.post.ts`,
  `favicon.post.ts`, `banners/upload.post.ts`, `staff/[id]/photo.post.ts`,
  `expenses/[id]/receipt.post.ts`, and the product editor's
  `products/upload-inline-image.post.ts` — extension/MIME trust removed
  (all re-encoded/validated by content).

### SEC-03 — Dead rate-limit rule
- `server/middleware/rate-limit.ts` manage-cancel matcher fixed to
  `/api/bookings/manage/*/cancel`.

### PAY-05 — Slow webhook ACK
- Stripe + PayPal webhooks run CAPI/mail/admin fan-out via `event.waitUntil`.
  `finalizePaidBooking` loads the booking once and never rejects.

### UX-04 — No client idempotency key
- Booking create sends a per-attempt `idempotencyKey` (reset on slot change).

### ADM-01 — Thin dashboard
- `server/api/admin/dashboard/stats.get.ts` returns booking metrics
  (today, awaiting-assignment, refunds, collected deposits) to
  `bookings.view_all` users; `app/pages/admin/index.vue` renders a
  "Booking operations" section.

## P2 — Attribution / operational

### PAY-02 — Browser-initiated PayPal capture
- `webhooks/paypal.post.ts` handles `CHECKOUT.ORDER.APPROVED`: captures +
  confirms server-side (browser-independent). `paypal/return.get.ts` is a fast
  fallback that trusts stored booking state on capture races.
- Requires PayPal console subscription to `CHECKOUT.ORDER.APPROVED`.

### SEC-09 — CAPI not consent-gated
- `finalizePaidBooking` sends `Purchase` only when
  `booking.marketingConsent`, forwarding stored `fbp`/`fbc`.

### SEC-08 — Admin cookie `Secure`
- `server/utils/auth.ts` sets `Secure` when the request is HTTPS or the public
  origin is HTTPS.

### UX-05 / UX-06 / UX-08
- Manage/cancel link surfaced on the success page (UX-05).
- Client-side email validation on booking create (UX-06).
- Reminders queued for `PAID` bookings regardless of assignment (UX-08).

## P3 — Hygiene / polish

- **SEC-06** content-sniff staff photo + expense receipt: done (see above).
- **PERF-04** media cache headers: `public, max-age=31536000, immutable`
  (files are content-unique). Per-`<img>` width/height audit deferred.

## Verified-correct (no change needed)
- **UX-07:** `getBookableStaff` filters `isBookable === false`, so "any" never
  renders when no stylist is bookable.
- **ADM-02:** STAFF 403 + default-template fallback on
  `/api/admin/settings/booking` is intentional and documented.

## Intentionally deferred (documented)
- **BE-06:** the single salon+day advisory lock keeps multi-staff "any" checks
  deadlock-free (`bookings/index.post.ts`). Narrowing safely needs sorted
  multi-key locking + concurrency tests.

## Build verification

- Command: `npm run build` (`nuxt build`, Nuxt 4.5.2 / Nitro 2.13.4, preset
  `node-server`). **Exit code 0 — build succeeded** (`✨ Build complete!`).
  Only warning: `[PLUGIN_TIMINGS]` (Tailwind plugin timing, non-blocking).
  No secret/sensitive values were emitted in the build log.
- **First attempt failed (exit 1)** on 3 `vue/compiler-sfc` syntax errors —
  *pre-existing working-tree corruption, unrelated to the audit remediation*:
  `app/pages/admin/categories.vue`, `app/pages/admin/services/index.vue`,
  `app/components/admin/ProductForm.vue` (and the same defect in
  `app/components/admin/AdminRichEditor.vue`) had a stray
  ` aria-hidden="true"` injected inside the TypeScript generic type:
  `ref<File | null aria-hidden="true">(null)`. The committed baseline (HEAD)
  has the correct `ref<File | null>(null)`; the corruption came from an earlier
  uncommitted accessibility sweep in the working tree.
- **Fix:** restored the intended `ref<File | null>(null)` in all 4 files (4
  one-line, behavior-preserving corrections). The build then passed. These
  fixes are surfaced explicitly here rather than folded into the finding
  tables, since they are not remediation items.
- Not run (out of scope / require approval or infrastructure): DB migration
  deploy and any production/network calls.

## Functional test results (local dev, isolated)

- Environment: local dev DB (`localhost:5439/amir`, seed-level data: 2 bookings
  / 27 services / 1 admin), dev server on `localhost:3001`, Node v26.5.1. No
  production service, data, migration or credential was touched. All test
  fixtures were removed after each run (verified: 0 leftover rows).
- **TypeScript** — `tsc -b` exited 2 with **83 errors, all pre-existing**
  (`noUncheckedIndexedAccess` on `arr[0]`, `import.meta`, stale generated
  Prisma types for the in-flight product/expense modules). **Zero errors remain
  in any remediation-touched file.** During this pass 6 errors in touched files
  were fixed: extended `AuditEntityType`/`AuditAction` unions in
  `server/utils/audit.ts` to the entity types actually logged, and used
  optional chaining on the multipart `file` in
  `settings/logo.post.ts`, `settings/favicon.post.ts`, `banners/upload.post.ts`.
- **Lint** — NOT RUN: no ESLint config/binary and no `lint` script exist in the
  repo (only a bare `prettier` binary, no config). Nothing to run.

Pure unit suites — all PASS:
- `verify-4` (staff busy / hours / slot grid): **16/16**
- `verify-2c` (timezone slots, split payment, `confirmBookingPaid` decisions):
  **38/38**
- `verify-2d` (phone/wa normalisation, overlap, assign/cancel/complete guards):
  **27/27**

DB-only suites — all PASS:
- `verify-7` (mail templates, ICS, outbox dedupe + log send): **15/15**
- `verify-9` (reminder due-window + dedupe): **3/3**

HTTP integration suites (dev server + dev DB) — all PASS:
- `verify-2e` (RBAC roles/permissions, staff scoping, last-active-admin guard,
  notification audiences + no-PII): **43/43**
- `verify-5` (manual booking, double-booking 409, reschedule, calendar feed):
  **9/9**
- `verify-6` (absence/unavailable flow, reassignment, time-off guards): **8/8**
- `verify-8` (self-cancel window, idempotent double-cancel, slot release, refund
  modes/bounds): **12/12**
- `verify-10` (category seed, expense CRUD/totals, CSV BOM + formula-injection
  guard, permission gating): **9/9**
- `verify-race` (concurrent same/any/different staff, half-open intervals,
  availability privacy, time-off exclusion, overlapping starts): **all
  scenarios pass, 0 FAIL**.

Targeted checks (temporary script, run then deleted) — **37/37 PASS**, plus
1 extra check. Covers: auth required on admin endpoints (401); stats leaks no
secret fields; **restricted staff receives `bookings:null`** (ADM-01 scoping);
`todayBookings` excludes `CANCELLED` (ADM-01); private `uploads/` scope 403 for
anonymous, public scope 404 for missing file, path traversal not served;
content validation rejects non-image bytes with **no file written** (logo,
banner, product-inline); Stripe/PayPal webhooks **fail closed** on missing/
forged signature; PayPal return + public status + manage-cancel reject unknown
tokens; **booking idempotency** (replayed key → same booking, `created:false`,
exactly one stored row); public status/availability expose **no customer PII**.

- **FAIL: none.**
- NOT RUN: browser E2E (Playwright not installed), live Stripe/PayPal sandbox
  capture (no keys — signature verification + fail-closed behaviour verified
  instead), and `prisma migrate deploy` (see manual steps).

## Manual / out-of-band steps (require human)
1. **Rotate** Stripe/PayPal credentials and admin passwords (dumps/`storage/`
   were previously tracked).
2. **Purge** `backups/*.dump` from git history (git filter-repo / BFG).
3. Run `prisma migrate deploy` to apply the new indexes.
4. Subscribe the PayPal webhook to `CHECKOUT.ORDER.APPROVED`.
5. Run the project's build/typecheck (once a script exists) and runtime smoke
   tests with explicit approval.
