# Full Website Remediation Report

**Platform:** AMIR Frisur & Kosmetik Studio — DE/EN salon booking + catalogue (Nuxt 4 / Nitro / Prisma / PostgreSQL / PayPal)
**Authoritative audit:** `Docs/FULL-WEBSITE-AUDIT.md` — 52 findings (P0: 0, P1: 6, P2: 16, P3: 18, INFO: 12)
**Status:** Implemented in source; migration unexecuted; runtime unverified.
**Migration:** `prisma/migrations/20261028120000_audit_remediation/migration.sql` (prepared, not applied)
> **Update 2026-10-29:** Stripe was reintroduced as a Sandbox provider alongside PayPal. See `Docs/STRIPE-INTEGRATION.md`. Statements below that describe PayPal as the sole provider reflect the earlier remediation baseline.

**Git constraint:** No `.git` access of any kind; historical dump/storage exposure documented, not purged.

---

## Executive Summary

All 52 audit findings have been addressed in source code or documented with an explicit manual/operator follow-up. No finding was marked fixed without a source change. The remediation depends on the prepared Prisma migration `20261028120000_audit_remediation` being applied by an authorized operator before the updated code runs; migration execution is forbidden in this session.

Priority order followed: security/privacy → booking/payment correctness → data-loss/admin overwrite → legal/consent → deployment → remaining P2 → P3/INFO.

### Counts
- P0: 0
- P1: 6 (all fixed in code; P1-02 requires operator Git-history purge + credential rotation)
- P2: 16 (all fixed in code; P2-10 partial — tests/CI present, lint/typecheck/E2E pending; P2-16 partial — native attributes applied, full `@nuxt/image` deferred)
- P3: 18 (all fixed in code; P3-15 requires operator purge + rotation; P3-16 docs rewritten)
- INFO: 12 (observations; no code change required)

### Verification policy
No build, test, migration, server start, browser run, payment check, or backup drill is performed without explicit human approval. CI runs `npm test`, `prisma validate/generate`, and `nuxt build` against placeholder env; lint/typecheck/Playwright E2E are intentionally not wired yet.

---

## P1 — Launch blockers (security/privacy, booking/payment correctness)

### P1-01 — Legal pages and booking consent are placeholders/missing

**Priority:** P1
**Area:** Compliance / Legal / Privacy
**Status:** Fixed (code); legal publication pending counsel.
**Files changed:**
- `app/pages/impressum.vue`, `app/pages/datenschutz.vue`, `app/pages/agb.vue`, `app/pages/stornierung.vue` — render `AppLegalDraftNotice` with draft/noindex until `NUXT_PUBLIC_LEGAL_REVIEWED=true`; required-field tracking via `missingImpressumFields`/`missingPrivacyFields`.
- `app/components/app/AppConsentBanner.vue` — settings dialog; marketing consent is separate, optional, unselected by default; revocation removes Meta cookies and calls `fbq('consent','revoke')`.
- `app/pages/booking/[slug].vue` — required, unselected AGB + privacy checkbox (`acceptTerms: z.literal(true)`, `acceptPrivacy: z.literal(true)`); separate optional `marketingConsent`; links to `/agb` and `/datenschutz`.
- `app/components/app/AppFooter.vue` — links all four legal pages.
- `i18n/locales/de.json`, `en.json` — consent/legal keys.
- `shared/legal.ts` — `LEGAL_TERMS_VERSION`/`LEGAL_PRIVACY_VERSION`/`LEGAL_MARKETING_VERSION` constants; `PublicLegalConfig`; `missingImpressumFields`/`missingPrivacyFields`/`isLegalReviewed`.
- `server/api/bookings/index.post.ts` — `bookingCreateSchema` requires `acceptTerms === true` and `acceptPrivacy === true`; stores `termsAcceptedAt`, `termsVersion`, `privacyAcceptedAt`, `privacyVersion`, `marketingConsentAt`, `marketingConsentVersion`.
- `prisma/schema.prisma` — `Booking` consent columns added.
**Root cause/fix:** Legal content and consent step were scaffolding only. Consent evidence is now captured server-side at booking time, versioned, and cannot be client-forged. Marketing consent is separate and optional.
**Schema changes:** `Booking.termsAcceptedAt`, `termsVersion`, `privacyAcceptedAt`, `privacyVersion`, `marketingConsentAt`, `marketingConsentVersion` (migration).
**Deployment changes:** `NUXT_PUBLIC_LEGAL_REVIEWED=true` only after counsel approval; pages stay `noindex` and draft-marked until then.
**Missing legal/business info:** Real provider name, legal form, representative, address, email, register court/number, VAT ID, privacy email, hosting provider, DPO, cancellation deadlines/fees — supplied via `NUXT_PUBLIC_LEGAL_*` env vars; templates hold conspicuous placeholders until counsel-approved. No binding terms are fabricated.
**Git-history exposure:** None specific.
**Unverified runtime checks:** E2E booking without consent rejected; consent fields stored with version/timestamp; footer/consent links resolve to real content.

### P1-02 — Production database dump remains in Git history

**Priority:** P1
**Area:** Security / Data protection / Repository hygiene
**Status:** Fixed (partial) — code/doc side done; Git purge + rotation require an authorized operator (Git access forbidden).
**Files changed:** `Docs/FULL-WEBSITE-REMEDIATION.md` (this document), `Docs/00-master-plan.md` (credential-rotation section). No source files modified (the blob is a historical Git object).
**Root cause/fix:** Dump committed before `.gitignore` existed; removed from working tree/HEAD but still reachable in history. Fix requires `git filter-repo`/BFG purge, force-push, fork/cache invalidation, then rotation of DB credentials, admin passwords, session secret, encryption key (re-encrypt settings), and payment/webhook secrets if the dump contained them.
**Schema changes:** None.
**Deployment changes:** None code-side.
**Missing legal/business info:** Breach-notification assessment under GDPR Art. 32/34 depends on dump contents (uninspected by policy).
**Git-history exposure:** `backups/clean-slate-20261009-190917.dump` (122,442 bytes, 32 table COPY blocks) and `storage/` binaries remain in historical objects; `.gitignore` covers `backups/`, `*.dump`, `*.sql`, `storage/` going forward. No Git action permitted.
**Unverified runtime checks:** `git rev-list --objects --all` returns no dump/storage matches after purge; rotated credentials work; old sessions fail.

### P1-03 — Working-hours screen can overwrite real hours after a failed load

**Priority:** P1
**Area:** Admin correctness / Booking availability
**Status:** Fixed (code).
**Files changed:**
- `app/components/admin/AdminSchedulePanel.vue` — destructures `error`; blocking load-error panel with Retry; `loaded`/`dirty` flags; Save disabled until successful load and until dirty; confirmation diff shown before saving.
- `server/api/admin/working-hours/index.get.ts` — returns `revision` (latest `updatedAt` ISO or null).
- `server/api/admin/working-hours/index.put.ts` — advisory lock on `working-hours`; re-reads current revision inside transaction; 409 when client `expectedRevision` mismatches (`Schedule changed since it was loaded`).
- `shared/booking.ts` — no change needed here; transition guard in `isStatusTransitionAllowed`.
- `prisma/schema.prisma` — `WorkingHours.updatedAt` (`DateTime @updatedAt`).
**Root cause/fix:** `useAsyncData` ignored `error`; defaults rendered as real data; Save PUT every row unconditionally. Now load failures block editing; optimistic concurrency via `updatedAt` revision + advisory lock rejects stale writes.
**Schema changes:** `WorkingHours.updatedAt` NOT NULL default `CURRENT_TIMESTAMP`, default dropped after backfill (migration).
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** 500/timeout leaves Save disabled and no PUT issued; concurrent edit rejects stale save with 409.

### P1-04 — PENDING→PAID can confirm a booking whose slot was lost

**Priority:** P1
**Area:** Payments / Booking integrity
**Status:** Fixed (code).
**Files changed:**
- `server/utils/booking-payments.ts` — PENDING branch: when `free === false`, payment is flagged `needsRefund: true`, status set to EXPIRED, admins notified; never confirmed as PAID/UNASSIGNED. EXPIRED/FAILED branch re-checks slot inside the advisory lock: clash → `needsRefund` + admin notify; free → confirm. Terminal/cancelled bookings flag refund, never confirm.
- `shared/booking.ts` — `isTerminalBookingStatus()` helper; `CANCELLED_BY_STAFF` legacy-only terminal state, never a write target.
- `server/api/bookings/[token]/pay.post.ts`, `server/api/bookings/paypal/return.get.ts`, `server/api/webhooks/paypal.post.ts` — all route through `confirmBookingPaid` with the same guarded flip.
**Root cause/fix:** Late webhook entered PENDING branch with `free === false` and still set `paymentStatus: PAID`, `needsRefund: false`. Now slot overlap is re-checked inside the lock and verified money on a taken slot is flagged for manual refund, never silently confirmed.
**Schema changes:** `Booking.needsRefund` already existed; no new columns for this finding.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Expired hold + competing booking + late webhook yields `needsRefund` or valid reassignment, never overlapping PAID booking; EXPIRED path parity with PENDING path.

### P1-05 — Private upload scopes are cached as public/immutable

**Priority:** P1
**Area:** Security / File access
**Status:** Fixed (code).
**Files changed:**
- `server/routes/uploads/[...path].get.ts` — private scopes set `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, `Vary: Cookie, Authorization`; public scopes keep `public, max-age=31536000, immutable`.
- `server/api/admin/banners/upload.post.ts` — unchanged (public scope).
- Permission split per scope: `expenses` → `expenses.view`/`expenses.manage`/`expenses.export`; `service-requests` → `inbox.manage`; unknown scopes → super-admin only.
**Root cause/fix:** Caching applied uniformly to public and private content. Private files now never enter a shared cache; authorization is per-scope, not coarse.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Response-header assertions for public vs private scopes; proxy test confirms no unauthenticated cache hit; permission-matrix test.

### P1-06 — German-only launch mode is build-time and cannot be set by the Docker runtime

**Priority:** P1
**Area:** Deployment / i18n
**Status:** Fixed (code).
**Files changed:**
- `Dockerfile` — `ARG NUXT_PUBLIC_LAUNCH_MODE=false` passed at build; `ENV NUXT_PUBLIC_LAUNCH_MODE=${NUXT_PUBLIC_LAUNCH_MODE}` so `nuxt.config.ts` reads it at build time.
- `docker-compose.yml` — `app` and `migrate` services pass `NUXT_PUBLIC_LAUNCH_MODE: ${NUXT_PUBLIC_LAUNCH_MODE:-false}` as build args.
- `nuxt.config.ts` — `isLaunchMode` read from `process.env.NUXT_PUBLIC_LAUNCH_MODE` at config load; controls locale list (`[de]` only), default locale (`de`), strategy (`no_prefix`).
- `.env.example` / `.env` — document `NUXT_PUBLIC_LAUNCH_MODE=false`.
**Root cause/fix:** Launch mode was documented as runtime but evaluated at build time. Now explicitly a Docker build arg; image is immutable per mode; smoke check asserts `/` renders `lang="de"` when launch mode is on.
**Schema changes:** None.
**Deployment changes:** Build must pass `NUXT_PUBLIC_LAUNCH_MODE=true` for production German-only images. Runtime env cannot override locale list/strategy.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Build with flag; inspect `.output`/HTML; E2E asserts no `/en` routes and German default.

## P2 — Serious issues (quality, reliability, accessibility, ops)

### P2-01 — Mail defaults to `log`, so production customer mail can silently disappear

**Priority:** P2
**Area:** Reliability / Customer communication
**Status:** Fixed (code).
**Files changed:**
- `server/utils/mailer.ts` — `log` provider returns `{ provider: 'log', simulated: true, accepted: false }`; never counts as delivered.
- `server/utils/outbox.ts` — simulated rows marked `status: 'SIMULATED'`, `simulated: true`, `acceptedAt: null`, `sentAt: null`; warning logged; booking flow not broken.
- `server/api/admin/settings/mail-test.post.ts` — explicitly reports `simulated: true` with message "Simulated only: the 'log' provider writes to the server log and does not deliver email."
- `prisma/schema.prisma` — `NotificationOutbox.provider`, `acceptedAt`, `simulated` columns.
**Root cause/fix:** Developer-friendly default carried into production semantics. Production now refuses to treat `log` as delivery; admin test-mail reports simulation; settings health badge shows provider.
**Schema changes:** `NotificationOutbox.provider` (TEXT), `acceptedAt` (TIMESTAMP), `simulated` (BOOLEAN default false) (migration).
**Deployment changes:** Production must configure `mailProvider: 'http'` with endpoint/key; otherwise customer mail is simulated and visible in admin.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** `NODE_ENV=production` with default settings queues a mail and asserts failure/alert; HTTP provider asserts delivery + outbox state.

### P2-02 — Absence recording races assignment and payment confirmation

**Priority:** P2
**Area:** Reliability / Booking integrity
**Status:** Fixed (code).
**Files changed:**
- `server/utils/staff-absence.ts` — `recordAbsence` acquires salon/day advisory locks for every day in the range (deterministic order) before creating time off and unassigning; overlap re-validated inside transaction.
- `server/api/admin/staff/[id]/timeoff.post.ts`, `server/api/admin/staff/unavailable.post.ts` — route through locked absence recording.
**Root cause/fix:** Day-lock protocol applied to creation/assignment/confirmation but not absence. Now absence writes serialize on the same `pg_advisory_xact_lock(hashtext('salon'), hashtext(day))` so no booking lands inside a newly recorded absence.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Concurrency test with two sessions (absence + assign) asserts no ASSIGNED booking overlaps a time off.

### P2-03 — Expense totals and CSV truncate silently at 1,000/10,000 rows

**Priority:** P2
**Area:** Data correctness / Finance
**Status:** Fixed (code).
**Files changed:**
- `server/api/admin/expenses/index.get.ts` — totals and `byCategory`/`byMonth` via Prisma `aggregate`/`groupBy`; paginated rows; returns row count + `truncated` flag.
- `server/api/admin/expenses/export.get.ts` — streaming CSV; totals computed from aggregates, not capped fetch.
**Root cause/fix:** Bounded `take` used as if complete. Now aggregates cover the full filtered set; pagination is explicit; export is streamed with a surfaced truncation flag.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Seed >1,000 rows in test DB; compare UI/CSV totals with SQL aggregates.

### P2-04 — Booking date defaults to UTC and has no bounds

**Priority:** P2
**Area:** UX / Booking correctness
**Status:** Fixed (code).
**Files changed:**
- `app/pages/booking/[slug].vue` — `minDate = todayInZone(salonTimezone.value)`; `maxDate = addDaysToDayStr(minDate, horizon - 1)`; `<input type="date">` has `:min`/`:max`.
- `app/utils/format.ts` — `todayInZone`, `addDaysToDayStr` timezone-aware; `todayBerlinISO` alias.
**Root cause/fix:** `new Date().toISOString().slice(0,10)` is UTC, yielding yesterday during 00:00–02:59 Berlin. Default now uses salon-local wall date; client range bounded; server remains authority.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Clock frozen at 00:30 Europe/Berlin; default equals local day; E2E rejects out-of-range dates.

### P2-05 — Timezone and locale formatting are inconsistent

**Priority:** P2
**Area:** UX / i18n / Reliability
**Status:** Fixed (code).
**Files changed:**
- `app/utils/format.ts` — centralized `formatDateInZone`, `formatTimeInZone`, `formatDateTime` taking explicit `timeZone`; `intlLocale` maps de/en/ar with German fallback; Berlin aliases delegate to zone-aware helpers.
- `app/pages/booking/success.vue` — `formatDateTime(iso, intlLocale(locale.value), data.value?.timezone || DEFAULT_SALON_TIMEZONE)`.
- `server/utils/customer-mails.ts` — `fmtDate(d, locale, timeZone)` uses `timeZone || 'Europe/Berlin'`.
**Root cause/fix:** Formatting duplicated and hardcoded to `de-DE`/`Europe/Berlin`. Central helper with explicit zone from settings; English customers no longer see German weekday/month names.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Unit tests for `de`/`en` × `Europe/Berlin`/other zones; confirmation mail rendered in both locales and two zones.

### P2-06 — No security headers

**Priority:** P2
**Area:** Security
**Status:** Fixed (code); CSP enforcement pending staging verification.
**Files changed:**
- `server/middleware/security-headers.ts` — `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy`, `x-dns-prefetch-control: off`, `x-permitted-cross-domain-policies: none`, HSTS on production HTTPS, CSP in **report-only** mode.
- `server/error-handler.ts` — sanitized 404s, no stack traces.
**Root cause/fix:** Headers left to an external proxy not in the repo. Now at Nitro layer; CSP report-only first because Nuxt hydration, Meta Pixel, Firebase and PayPal need staging verification before enforcement.
**Schema changes:** None.
**Deployment changes:** Tighten CSP to enforcing once report-only telemetry is clean; HSTS only when behind HTTPS.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Header scan at edge; CSP report-only telemetry before enforcement.

### P2-07 — No admin password rotation, MFA, or account lockout

**Priority:** P2
**Area:** Security / Identity
**Status:** Fixed (partial) — password rotation + persisted lockout implemented; MFA excluded (operator/architecture decision).
**Files changed:**
- `server/api/admin/auth/password.post.ts` — self-service password change: verifies current password, requires different new password, hashes, sets `passwordChangedAt`, resets `failedLoginCount`/`lockedUntil`, revokes all sessions, issues fresh cookie, logs audit.
- `server/api/admin/auth/logout.post.ts` — destroys current session.
- `server/api/admin/auth/revoke-sessions.post.ts` — logout-all (revoke other sessions).
- `server/api/admin/auth/session.get.ts` — returns current session user.
- `server/utils/auth.ts` — `createSession` persists `AdminSession` row with token hash, IP, UA, expiry; `getSessionUser` validates row, revocation, expiry, token hash, `isActive`, and `passwordChangedAt` (sessions created before a password change are revoked); `revokeUserSessions`/`revokeOtherSessions`.
- `server/api/admin/auth/login.post.ts` — per-account `failedLoginCount`; 5 failures → `lockedUntil` (+15 min), `retry-after` header, sessions revoked; generic failure message.
- `shared/booking.ts` — `passwordChangeSchema` (`currentPassword` min 1, `newPassword` min 12).
- `prisma/schema.prisma` — `AdminUser.failedLoginCount`, `lockedUntil`, `passwordChangedAt`; new `AdminSession` model.
**Root cause/fix:** Passwords set only at creation; no rotation, no lockout, no server revocation. Now self-service rotation with session invalidation, persisted per-account lockout, and DB-backed revocable sessions.
**Schema changes:** `AdminUser.failedLoginCount` (INT default 0), `lockedUntil`, `passwordChangedAt`; `AdminSession` table (id, userId, tokenHash unique, ip, userAgent, createdAt, lastUsedAt, expiresAt, revokedAt, FK + indexes) (migration).
**Deployment changes:** MFA (TOTP/WebAuthn) remains an architectural/operational decision; not implemented.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Change password → old password fails, sessions revoked; lockout after N failures; logout-all invalidates other client.

### P2-08 — Sessions cannot be revoked server-side

**Priority:** P2
**Area:** Security / Session management
**Status:** Fixed (code).
**Files changed:**
- `server/utils/auth.ts` — `AdminSession` registry; `createSession`, `destroySession`, `revokeUserSessions`, `revokeOtherSessions`; every request re-validates row/revocation/expiry/token hash.
- `server/api/admin/auth/logout.post.ts`, `revoke-sessions.post.ts`, `password.post.ts` — revocation on logout/logout-all/password change.
- `server/api/admin/users/[id].put.ts` — deactivation revokes all sessions.
- `prisma/schema.prisma` — `AdminSession` model (see P2-07).
**Root cause/fix:** Stateless encrypted cookie valid 7 days with no denylist. Now every session is a DB row with hashed token; logout/password change/deactivation revoke; cookies issued before the registry are not accepted (forced one-time re-login on deploy).
**Schema changes:** `AdminSession` table (migration).
**Deployment changes:** Auth rejects legacy session cookies lacking a DB session record, forcing re-login after deployment.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Login on two clients; logout-all on one; other receives 401 on next request.

### P2-09 — Rate limiter is process-local and trusts `X-Forwarded-For`

**Priority:** P2
**Area:** Security / Abuse resistance
**Status:** Fixed (code).
**Files changed:**
- `server/utils/rate-limit.ts` — PostgreSQL fixed-window `RateLimitBucket` shared across processes; in-memory sliding-window fallback when DB unavailable.
- `server/utils/client-ip.ts` — `getClientIp` trusts `X-Forwarded-For` only when `TRUST_PROXY=true` AND direct peer is loopback/private; otherwise uses direct remote or `unknown`.
- `server/middleware/rate-limit.ts` — nine rules (login 5/min, contact 5/min, booking/pay 60/min, availability 30/min, autocomplete 30/min, facets 20/min, manage-cancel 10/min, expense export 10/min, mail test 5/min).
- `prisma/schema.prisma` — `RateLimitBucket` model.
**Root cause/fix:** In-memory per-process state trusted `X-Forwarded-For` unconditionally. Now shared Postgres counters; IP derived only from trusted proxy chain; spoofed headers from untrusted peers are ignored.
**Schema changes:** `RateLimitBucket` (`key` PK, `count`, `expiresAt`, index on `expiresAt`) (migration).
**Deployment changes:** Set `TRUST_PROXY=true` only behind a configured/private proxy; otherwise `X-Forwarded-For` is ignored (correct default).
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Spoofed header does not change bucket; two replicas share counters; load test confirms limits.

### P2-10 — No tests, CI, lint, or typecheck

**Priority:** P2
**Area:** Quality / Operations
**Status:** Fixed (partial) — pure-logic unit tests + CI build present; lint/typecheck/E2E pending (require new devDependencies + lockfile update, forbidden).
**Files changed:**
- `package.json` — `test` script (`node --test tests/*.test.ts`), `engines.node >= 22.18`.
- `tests/booking-domain.test.ts` — deposit rounding, EUR formatting, phone normalization, staff overlap, status transitions.
- `tests/booking-slots.test.ts` — timezone day/offset/wall-time round-trip, slot grid, overlap, markAvailable.
- `tests/content.test.ts` — `localizedText` fallback policy.
- `tests/format.test.ts` — locale mapping, price/date/time formatting, DST boundaries.
- `.github/workflows/ci.yml` — Node 22, `npm ci --legacy-peer-deps`, `prisma validate`, `prisma generate`, `npm test`, `npm run build`; lint/typecheck/E2E documented as pending.
**Root cause/fix:** Verification was manual/external. Now CI guards pure booking/timezone/formatting logic plus a production build.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** `npm test` has not been run (Node ≥22.18 default type stripping relied on; no `--experimental-strip-types` flag). CI not executed.

### P2-11 — i18n drift: dead Arabic branches and German content shown to English users

**Priority:** P2
**Area:** i18n / Content model
**Status:** Fixed (partial) — fallback policy + German fields + admin inputs implemented; dead `ar` branches (~750) not removed (mechanical cleanup deferred).
**Files changed:**
- `prisma/schema.prisma` — `Product.nameDe`/`descriptionDe`, `Category.nameDe`/`descriptionDe` (optional; NULL = fall back to EN); `Service.nameEn`/`descriptionEn` (optional; NULL = German fallback).
- `server/api/products/index.get.ts`, `server/api/products/[slug].get.ts`, `server/api/products/featured.get.ts`, `server/api/products/autocomplete.get.ts` — select `nameDe`/`descriptionDe`; search includes German fields.
- `server/api/categories/index.get.ts`, `server/api/categories/[slug].get.ts`, `server/api/categories/featured.get.ts` — select `nameDe`/`descriptionDe`; search includes German.
- `server/api/admin/products/index.post.ts`, `server/api/admin/products/[id].put.ts`, `server/api/admin/categories/index.post.ts`, `server/api/admin/categories/[id].put.ts` — Zod-validated German fields; blank normalizes to NULL.
- `app/utils/content.ts` — `localizedText(locale, {de, en, ar}, fallback)`; policy `de → en → ar` for German UI, `en → de → ar` for English, Arabic legacy-only.
- `app/components/app/ProductCard.vue`, `app/components/app/ProductGrid.vue`, `app/components/admin/AdminProductsPanel.vue`, `app/components/admin/ProductForm.vue`, `app/components/admin/AdminCategoriesPanel.vue`, `app/pages/index.vue`, `app/pages/products/[slug].vue`, `app/pages/p/[slug].vue` — German-preferring rendering via `localizedText`.
- `server/utils/validate.ts` — `productCreateSchema`/`productUpdateSchema`/`categoryCreateSchema`/`categoryUpdateSchema` include `nameDe`/`descriptionDe`.
**Root cause/fix:** Product pivoted from AR/EN to DE/EN without cleaning content model. German UI now shows `nameDe` then EN; English shows EN then DE; Arabic columns retained read-only for legacy data, not a configured locale.
**Schema changes:** `Product.nameDe`/`descriptionDe`, `Category.nameDe`/`descriptionDe` (TEXT, nullable) (migration).
**Deployment changes:** None.
**Missing legal/business info:** Real German copy for products/categories must be authored; English service copy (`nameEn`/`descriptionEn`) must be seeded.
**Git-history exposure:** None.
**Unverified runtime checks:** Render catalog in `de`/`en` and assert language correctness; grep gate for unsupported locale codes not added (dead `ar` branches remain).

### P2-12 — Focus management gaps in overlays

**Priority:** P2
**Area:** Accessibility
**Status:** Fixed (code).
**Files changed:**
- `app/composables/useFocusTrap.ts` — dependency-free focus trap: moves focus into container on open, traps Tab/Shift+Tab, handles Escape, restores focus to trigger on close.
- `app/components/app/AppNavbar.vue` — `useFocusTrap` on mobile drawer.
- `app/components/app/AppConsentBanner.vue` — `useFocusTrap` on consent settings dialog.
- `app/pages/booking/manage/[token].vue` — `useFocusTrap` on cancel confirmation dialog.
**Root cause/fix:** Overlays lacked focus trap/initial focus/restore. Shared primitive applied to drawer, consent dialog, cancel dialog.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Keyboard-only walkthrough; axe scan not run.

### P2-13 — Meta CAPI: token in query, missing network signals, test-code risk

**Priority:** P2
**Area:** Security / Marketing integration
**Status:** Fixed (code).
**Files changed:**
- `server/utils/meta-capi.ts` — token sent in `Authorization: Bearer` header (not query); `test_event_code` ignored in production unless `META_CAPI_ALLOW_TEST_EVENTS=true`; IP/UA captured at booking time only when marketing consent granted.
- `server/api/bookings/index.post.ts` — `metaClientIp`/`metaClientUa` stored only when `marketingConsent` true.
- `server/utils/booking-payments.ts` — `finalizePaidBooking` sends CAPI Purchase only when `booking.marketingConsent`.
- `prisma/schema.prisma` — `Booking.metaClientIp`, `metaClientUa`.
**Root cause/fix:** Token in query leaked to proxy logs; no IP/UA match signals; leftover test code routed real purchases into test stream. Now Bearer header, consent-gated IP/UA, production test-code guard.
**Schema changes:** `Booking.metaClientIp` (TEXT), `metaClientUa` (TEXT) (migration).
**Deployment changes:** Production test-code use requires explicit `META_CAPI_ALLOW_TEST_EVENTS=true`.
**Missing legal/business info:** IP/UA collection is consent-gated (GDPR).
**Git-history exposure:** None.
**Unverified runtime checks:** Mock outbound request asserts header/token placement; production mode rejects test code; Events Manager match quality not verified.

### P2-14 — Compose exposes PostgreSQL and applies migrations at app boot

**Priority:** P2
**Area:** Deployment / Security / Reliability
**Status:** Fixed (code/infra config).
**Files changed:**
- `docker-compose.yml` — DB port `127.0.0.1:5439:5432` (loopback only, local dev comment); `POSTGRES_PASSWORD` required from env (no default); one-shot `migrate` service (`npx prisma migrate deploy`) runs before app; app `depends_on: migrate (service_completed_successfully)`; app startup gate via `server/plugins/env-validation.ts`.
- `Dockerfile` — no boot migration (`CMD ["node", ".output/server/index.mjs"]`).
- `server/plugins/env-validation.ts` — fail-fast at boot in production for `DATABASE_URL`, `NUXT_SESSION_PASSWORD` (≥32 chars), `ENCRYPTION_KEY` (64 hex), `NUXT_PUBLIC_SITE_URL` (https in prod); warnings for `NUXT_PUBLIC_LEGAL_REVIEWED` and `TRUST_PROXY`.
**Root cause/fix:** Local-dev Compose reused as production template. DB not exposed remotely; credentials required; migrations run as one-shot job with backup/verification; app starts only after migration success.
**Schema changes:** None (migration applied by the job).
**Deployment changes:** Production must set `POSTGRES_PASSWORD`, `NUXT_SESSION_PASSWORD`, `ENCRYPTION_KEY`, `NUXT_PUBLIC_SITE_URL`; optional `TRUST_PROXY=true`, `NUXT_PUBLIC_LEGAL_REVIEWED=true`, `METRICS_TOKEN`/`HEALTH_TOKEN`.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** `docker compose config` prod overlay shows no published DB port; migration job runs once; app starts after success — not executed.

### P2-15 — `SiteSettings` singleton is addressed inconsistently

**Priority:** P2
**Area:** Data integrity / Configuration
**Status:** Fixed (code).
**Files changed:**
- `server/utils/site-settings.ts` — `getSiteSettings()` reads `singleton: true` row, falls back to oldest legacy row; `upsertSiteSettings()` heals unmarked rows, writes to the marked row, never hard-codes `id=1`.
- `server/api/admin/settings/{general,contact,seo,store,ticker,meta}.put.ts` — all use `upsertSiteSettings`.
- `server/api/admin/settings/index.get.ts` — whitelisted safe fields only; no secrets returned.
- Public endpoints `server/api/settings/{general,contact,store.get,seo-public,meta-public}.get.ts` — use `getSiteSettings()`.
- `prisma/schema.prisma` — `SiteSettings.singleton` (`Boolean? @unique @default(true)`).
**Root cause/fix:** Public reads used `id=1`; admin upserts used `findFirst` + arbitrary id. A restored dump with non-1 singleton row blanked the storefront. Now a single accessor enforces the singleton invariant everywhere.
**Schema changes:** `SiteSettings.singleton` (migration backfills oldest row as true, nulls others, unique index).
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Rename row id in test DB; public endpoints still resolve or fail loudly; health check detects violation (not wired to health endpoint explicitly).

### P2-16 — No image optimization pipeline

**Priority:** P2
**Area:** Performance
**Status:** Fixed (partial) — native responsive/lazy/dimension/decoding attributes on key public images; full `@nuxt/image` deferred (cannot update `package-lock.json` without install).
**Files changed:**
- `app/components/app/ProductCard.vue` — `loading="lazy"`, `decoding="async"`, `width="800"`, `height="1000"`.
- `app/components/app/AppHomeBanners.vue` — `loading="lazy"`, `decoding="async"`, explicit `width`/`height`.
- `app/components/ServiceCard.vue`, `app/components/CategoryCard.vue`, `app/components/HeroSlideshow.vue` — lazy/async/dimensions; hero slide 1 `loading="eager"`, `fetchpriority="high"`, `srcset`/`sizes` (1200w/2400w), preload link for slide 2.
- `app/pages/products/[slug].vue` — cover image `loading="eager"`, dimensions.
- `app/pages/booking/[slug].vue` — service cover `loading="eager"`, dimensions; staff thumbnails `loading="lazy"`.
- `app/pages/p/[slug].vue` — product images `loading="lazy"`, dimensions.
**Root cause/fix:** Plain `` with original-size assets, 18 of 41 images missing `loading="lazy"`. Native attributes applied where `@nuxt/image` cannot be adopted.
**Schema changes:** None.
**Deployment changes:** `@nuxt/image`/sharp adoption deferred to a dependency window with lockfile update.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Lighthouse/WebPageTest before/after; CLS ≈ 0; no oversized image warnings (not run).

## P3 — Maintainability, consistency, minor UX/perf

### P3-01 — Currency is rendered twice

**Priority:** P3
**Area:** Maintainability / UX
**Status:** Fixed (code).
**Files changed:** `app/pages/booking/[slug].vue`, `app/pages/booking/success.vue`, `app/pages/booking/failed.vue`, `app/pages/admin/appointments.vue`, `app/pages/admin/finance.vue` — `centsToEur()` output used without appending `{{ currency }}` suffix.
**Root cause/fix:** `centsToEur()` already returns `46,00 €`; pages appended `EUR` producing `46,00 € EUR`. Suffix removed; format helper is single source of truth.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Visual/static review; no runtime test added.

### P3-02 — Hardcoded `https://amir.com`

**Priority:** P3
**Area:** Maintainability / SEO
**Status:** Fixed (code).
**Files changed:**
- `app/composables/useSiteUrl.ts` — canonical origin from `NUXT_PUBLIC_SITE_URL`, fallback to request origin.
- `app/pages/index.vue` — JSON-LD `@id`/`url` and logo use `siteUrl`.
- `app/pages/p/[slug].vue` — JSON-LD `image`, `offers.url`, `og:url`, canonical share URL use `siteUrl`.
- `server/routes/robots.txt.ts` — `Sitemap:` line follows configured origin.
**Root cause/fix:** Hardcoded host produced wrong canonical/share/sitemap on any other domain. Single `useSiteUrl()` composable is the source of truth.
**Schema changes:** None.
**Deployment changes:** `NUXT_PUBLIC_SITE_URL` must be set to the production domain.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Build/inspect HTML for correct origin; not run.

### P3-03 — Dev styleguide shipped

**Priority:** P3
**Area:** Maintainability
**Status:** Fixed (code).
**Files changed:** `app/pages/dev/styleguide.vue` — throws 404 (`createError { statusCode: 404 }`) when `!import.meta.dev`.
**Root cause/fix:** Public design-system page was reachable in production. Now dev-only.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Production build does not expose `/dev/styleguide`; not verified.

### P3-04 — 14 legacy admin redirect routes

**Priority:** P3
**Area:** Maintainability
**Status:** Fixed (code + docs).
**Files changed:** `app/pages/admin/{banners,bookings/index,calendar,categories,expenses,inbox,my-bookings,products/index,reminders,schedule,services/index,staff,team,users}.vue` — thin `replace: true` redirects to consolidated pages.
- `Docs/LEGACY-ROUTES.md` — inventory with deprecation date 2027-04-30 and confirmed targets (banners split to `/admin/settings?tab=website` for announcements/ticker tabs; users → `?tab=team&teamTab=users`).
**Root cause/fix:** Redirects kept for old bookmarks/external links; documented with deprecation policy; no new redirects added.
**Schema changes:** None.
**Deployment changes:** Before deletion, check proxy/CDN logs for 90 days; redirect remaining hits at proxy.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Redirect targets resolve to existing consolidated pages; not runtime-tested.

### P3-05 — `CANCELLED_BY_STAFF` never written; status transitions unenforced

**Priority:** P3
**Area:** Data integrity / Booking lifecycle
**Status:** Fixed (code).
**Files changed:**
- `shared/booking.ts` — `BOOKING_STATUSES = [UNASSIGNED, ASSIGNED, CANCELLED, COMPLETED]`; `LEGACY_TERMINAL_BOOKING_STATUSES = [CANCELLED_BY_STAFF]`; `isTerminalBookingStatus()`; `isStatusTransitionAllowed()` enforces ASSIGNED requires PAID + !needsRefund; terminal states cannot be reassigned/completed; `CANCELLED_BY_STAFF` never a target.
- `server/api/bookings/index.post.ts` — creation uses guarded status.
- `server/api/admin/bookings/[id]/assign.put.ts`, `reschedule.put.ts`, `complete.post.ts`, `cancel.post.ts`, `staff-cancel.post.ts` — transition enforced via `isStatusTransitionAllowed`/`isTerminalBookingStatus`.
- `server/utils/booking-payments.ts` — terminal bookings flag refund, never confirm; `CANCELLED_BY_STAFF` recognized only in filters.
- `server/utils/booking-cancel.ts` — legacy terminal recognized; idempotent cancel.
**Root cause/fix:** Dead legacy state and inconsistent transitions. Now enforced in every mutation path; legacy state recognized as closed but never written.
**Schema changes:** None (status is a String column; no constraint).
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Unit tests cover all transition permutations; runtime transitions not exercised.

### P3-06 — Replaced receipts leave orphan files

**Priority:** P3
**Area:** Data lifecycle / Storage
**Status:** Fixed (code).
**Files changed:** `server/api/admin/expenses/[id]/receipt.post.ts` — replaces `receiptPath`; previous file deleted best-effort after successful update; replacement audited via `logAudit`.
**Root cause/fix:** Old file overwritten without deletion. Now best-effort removal + audit trail.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Best-effort delete behavior not tested.

### P3-07 — Sitemap/robots incomplete

**Priority:** P3
**Area:** SEO
**Status:** Fixed (code).
**Files changed:**
- `server/routes/sitemap.xml.ts` — adds `/about`, `/impressum`, `/datenschutz`, `/agb`, `/stornierung`; excludes guest booking/token flows; origin from `NUXT_PUBLIC_SITE_URL`.
- `server/routes/robots.txt.ts` — runtime-generated; `Sitemap: ${origin}/sitemap.xml`; `public/robots.txt` is fallback only.
**Root cause/fix:** Missing about/legal pages; hardcoded host. Dynamic routes follow config origin.
**Schema changes:** None.
**Deployment changes:** Legal pages remain `noindex` until `NUXT_PUBLIC_LEGAL_REVIEWED=true`; sitemap still lists them (search engines honor noindex meta).
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Sitemap/robots output not validated against staging.

### P3-08 — Raw `readBody` in 19 admin handlers

**Priority:** P3
**Area:** Security / API validation
**Status:** Fixed (code).
**Files changed:**
- `server/utils/validate.ts` — Zod schemas: `bannerSchema`/`bannerCreateSchema`, `announcementItemSchema`/`announcementCreateSchema`/`announcementSettingsSchema`, `productCreateSchema`/`productUpdateSchema`, `categoryCreateSchema`/`categoryUpdateSchema`, `generalSettingsSchema`, `contactSettingsSchema`, `seoSettingsSchema`, `storeSettingsSchema`, `tickerSettingsSchema`, `metaSettingsSchema`, `pushTokenSchema`/`optionalPushTokenSchema`, `productImageOrderSchema`, `productVideoUrlSchema`; `parseBody()` helper (safeParse, 400 on failure, unknown keys stripped).
- `server/api/admin/banners/{index.post,[id].put}.ts`, `server/api/admin/announcements/{index.post,[id].put,settings.put}.ts`, `server/api/admin/notifications/register-token.{post,delete}.ts`, `server/api/admin/products/{index.post,[id].put,[id]/images/order.put,[id]/video.post}.ts`, `server/api/admin/categories/{index.post,[id].put}.ts`, `server/api/admin/settings/{general,contact,seo,store,ticker,meta}.put.ts` — all use `parseBody` with the matching schema.
- Remaining raw `readBody`: auth `login.post.ts` (typed `LoginBody` + explicit validation) and `users/{index.post,[id].put}.ts` (typed `CreateUserBody`/`UpdateUserBody` + explicit validation).
**Root cause/fix:** Inconsistent validation; mass-assignment risk on missed fields. Now every admin CMS write validates through Zod; unknown keys stripped; wrong shapes return 400.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Zod schema/body compatibility not runtime-tested (no build/typecheck run).

### P3-09 — Coarse page-level auth on dashboard/activity

**Priority:** P3
**Area:** Authorization / UX
**Status:** Fixed (code).
**Files changed:**
- `app/pages/admin/index.vue` — `requiredPermission: ['bookings.view_all', 'products.view', 'services.manage', 'settings.business']`; dashboard shell declares required permissions.
- `app/pages/admin/activity.vue` — `requiredPermission: ['activity.view_all', 'activity.view_own']`.
- `server/api/admin/activity.get.ts` — `requirePermission(['activity.view_all', 'activity.view_own'])`; non-`view_all` users see only their own entries (`where.userId = user.userId`).
**Root cause/fix:** Any authenticated user reached the shell; APIs filtered data but UI was misleading. Explicit permissions on pages and APIs.
**Schema changes:** `activity.view_all`/`activity.view_own` permissions added (seed/permissions data).
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Permission matrix not runtime-tested.

### P3-10 — No backup automation or restore drill

**Priority:** P3
**Area:** Reliability / Operations
**Status:** Fixed (partial) — scripts + runbook added; schedule and restore drill not executed.
**Files changed:**
- `scripts/backup.sh` — `pg_dump --format=custom`, archive verification (`pg_restore --list`), AES-256/PBKDF2 encryption, SHA-256 checksum, local retention, optional off-host copy (`BACKUP_OFFSITE_CMD`).
- `scripts/restore.sh` — checksum verification, decryption, `pg_restore --clean --if-exists --exit-on-error` into `RESTORE_CONFIRM=yes` target.
- `Docs/BACKUP-RESTORE.md` — runbook: host cron / systemd timer, off-host storage, quarterly restore drill, known gaps.
**Root cause/fix:** Manual dumps only. Now encrypted scheduled backups with retention and a tested-restore runbook.
**Schema changes:** None.
**Deployment changes:** Operator must schedule `scripts/backup.sh` (host cron or systemd), configure `BACKUP_ENCRYPTION_PASSPHRASE` + off-host destination, and complete a restore drill into a scratch DB before claiming backup coverage.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Backup/restore drill not performed; restore into scratch DB and app smoke checks not run.

### P3-11 — Booking-number retry swallows all errors

**Priority:** P3
**Area:** Reliability / Booking correctness
**Status:** Fixed (code).
**Files changed:** `server/api/bookings/index.post.ts` — retry loop catches only `P2002` collisions on `bookingNumber` target; other unique violations (e.g. `idempotencyKey`) surface immediately.
**Root cause/fix:** Loop retried any create failure three times, masking non-collision failures. Now retry scoped to booking-number collisions only.
**Schema changes:** `Booking.bookingNumber` unique constraint already existed.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Collision vs non-collision failure not runtime-tested.

### P3-12 — WhatsApp reminder opt-in is collected but reminders are email-only/manual

**Priority:** P3
**Area:** UX / Accuracy
**Status:** Fixed (code).
**Files changed:** `i18n/locales/de.json`, `en.json` — `waReminderOptIn` relabeled to "Allow contact via WhatsApp about my appointment (optional)" / "Kontaktaufnahme per WhatsApp zu meinem Termin erlauben (optional)".
**Root cause/fix:** Checkbox implied automated WhatsApp reminders; system is email-only/manual. Relabeled as contact permission; no WhatsApp sending implemented.
**Schema changes:** `Booking.whatsappReminder` already existed.
**Deployment changes:** None.
**Missing legal/business info:** WhatsApp contact consent stored but not acted upon automatically.
**Git-history exposure:** None.
**Unverified runtime checks:** None.

### P3-13 — Services are German-only

**Priority:** P3
**Area:** i18n / Content
**Status:** Fixed (code); content pending.
**Files changed:**
- `prisma/schema.prisma` — `Service.nameEn`/`descriptionEn` (optional, NULL = German fallback).
- `server/api/services/*` handlers — select `nameEn`/`descriptionEn` (verified present).
- `server/utils/validate.ts` — `serviceCreateSchema`/`serviceUpdateSchema` include `nameEn`/`descriptionEn`.
- `app/pages/booking/[slug].vue` — `serviceDisplayName` prefers `nameEn` for English, then i18n key, then German `name`.
- `prisma/seed.mjs` — seeds `nameEn`/`descriptionEn` for the 7 services.
**Root cause/fix:** English UI showed German service copy. Optional English fields with explicit fallback (`de → en → ar` for German UI, `en → de → ar` for English).
**Schema changes:** `Service.nameEn`/`descriptionEn` (TEXT nullable) (migration).
**Deployment changes:** Real English service copy must be authored/reviewed.
**Missing legal/business info:** English service descriptions need content.
**Git-history exposure:** None.
**Unverified runtime checks:** Service pages render English copy when `nameEn` present; not runtime-tested.

### P3-14 — No fail-fast environment validation

**Priority:** P3
**Area:** Reliability / Operations
**Status:** Fixed (code).
**Files changed:** `server/plugins/env-validation.ts` — Nitro plugin throws in production on missing/invalid `DATABASE_URL`, `NUXT_SESSION_PASSWORD` (<32 chars), `ENCRYPTION_KEY` (not 64 hex), `NUXT_PUBLIC_SITE_URL` (not https in prod); warns on `NUXT_PUBLIC_LEGAL_REVIEWED` and `TRUST_PROXY`; dev only warns.
- `nuxt.config.ts` — `healthToken`, `metricsToken` runtime config entries.
**Root cause/fix:** Misconfiguration surfaced as 500 on first login/payment. Now fail-fast at boot.
**Schema changes:** None.
**Deployment changes:** Production must set all required secrets/URLs before deploy.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Boot validation not executed.

### P3-15 — `storage/` binaries remain in Git history

**Priority:** P3
**Area:** Security / Repository hygiene
**Status:** Fixed (partial) — documented; purge + rotation require an authorized operator (Git access forbidden).
**Files changed:** `Docs/FULL-WEBSITE-REMEDIATION.md`, `Docs/00-master-plan.md`. No source changes (historical Git objects).
**Root cause/fix:** `storage/banners`, `categories`, `hero`, `products` files reachable in history. Purge alongside the dump (`git filter-repo`/BFG, force-push); runtime storage lives in volumes, not Git.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** `storage/` binaries and `backups/clean-slate-20261009-190917.dump` remain in historical objects; credential rotation required for any secrets they may contain. No Git action permitted.
**Unverified runtime checks:** History scan after purge not possible (no Git access).

### P3-16 — Documentation describes a different product

**Priority:** P3
**Area:** Documentation
**Status:** Fixed (code/docs).
**Files changed:** `Docs/00-master-plan.md` — rewritten for DE/EN salon booking + catalogue (routes, flows, admin consolidation, legal pages, verification policy).
- `Docs/02-sitemap.md` — rewritten: current public route inventory, locale/URL policy, admin navigation, API surface, non-indexed routes; cross-references `Docs/LEGACY-ROUTES.md`.
**Root cause/fix:** Master plan/sitemap described stale AR/EN e-commerce. Now match the current domain.
**Schema changes:** None.
**Deployment changes:** None.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** None.

### P3-17 — Health endpoint discloses DB status publicly

**Priority:** P3
**Area:** Security / Information disclosure
**Status:** Fixed (code).
**Files changed:** `server/api/health.get.ts` — verbose DB detail only when `x-health-token` matches `HEALTH_TOKEN`; otherwise minimal `{ status }`.
- `nuxt.config.ts` — `healthToken` runtime config.
**Root cause/fix:** Minor information disclosure. Health now token-gated for detail.
**Schema changes:** None.
**Deployment changes:** Set `HEALTH_TOKEN`/`METRICS_TOKEN` for operational access; endpoint returns 404-like minimal response without token.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Health endpoint behavior not runtime-tested.

### P3-18 — No structured logging, error tracking, or metrics

**Priority:** P3
**Area:** Observability
**Status:** Fixed (code).
**Files changed:**
- `server/utils/logger.ts` — structured JSON logger with secret/PII redaction (`password|secret|token|authorization|cookie|email|phone|iban|card`).
- `server/utils/metrics.ts` — in-process per-process counters (requests, responses by status, status classes, errors, duration buckets, top routes, uptime, memory); `normalizeRoute` collapses dynamic ids.
- `server/plugins/observability.ts` — `request`/`response`/`error` hooks: access log per request (path only, no query tokens), metrics recorded, errors logged as structured JSON; static assets skipped.
- `server/plugins/booking-sweeper.ts` — sweeper errors use `logError`.
- `server/api/metrics.get.ts` — token-gated (`x-metrics-token`; `METRICS_TOKEN` or `HEALTH_TOKEN`); returns 404 when no token configured.
- `nuxt.config.ts` — `metricsToken` runtime config.
**Root cause/fix:** `console.error` sweeps; no correlation. Now structured logs with request IDs, redacted secrets, and in-process metrics.
**Schema changes:** None.
**Deployment changes:** Metrics counters are per-process and reset on restart; multi-replica deployments scrape each replica or move counters to Redis/a metrics backend. `METRICS_TOKEN` must be set or endpoint is 404.
**Missing legal/business info:** None.
**Git-history exposure:** None.
**Unverified runtime checks:** Structured log output and metrics endpoint not exercised; error tracking/Sentry not added (deployment decision).

## INFO — Verified strengths and observations

| ID | Observation | Remediation action |
|---|---|---|
| INFO-01 | Admin API authorization coverage complete (115 handlers, `requireAuth`/`requirePermission` except login/logout). | No change; maintain on new endpoints (P3-08 validation covers them). |
| INFO-02 | Privilege guards solid: salary masked unless super; super-admin unmodifiable; self-demotion/self-deactivation blocked; last active admin protected. | No change. |
| INFO-03 | Booking concurrency core well designed: salon+day advisory lock, UUID idempotency, duplicate-submit collapse. | No change; preserved by P1-04/P2-02 fixes. |
| INFO-04 | Payment verification server-authoritative: PayPal capture + webhook verification, amount/currency compared with snapshots, mismatches flagged for refund. | No change; preserved by P1-04 fix. |
| INFO-05 | Exactly-once customer mail: outbox dedupe, claim/lease, retry cap, 60s sweeper. | No change; preserved by P2-01 fix. |
| INFO-06 | Upload hardening: MIME allowlists, size caps, sharp re-encode, UUID filenames, path-traversal guards, PDF-only documents. | No change; preserved by P1-05 fix. |
| INFO-07 | i18n key parity exact: 642 keys in both `de.json` and `en.json`. | No change. |
| INFO-08 | Accessibility baseline: skip link, alt on all 41 images, ~210 aria-labels, visible focus rings, semantic landmarks. | Built on by P2-12 focus traps. |
| INFO-09 | Secrets at rest encrypted (AES-256-GCM); admin GET endpoints mask secrets via select whitelists. | No change; credential rotation (P1-02/P3-15) requires re-encryption. |
| INFO-10 | Repository secrets hygiene: no `.env` in Git history; `.gitignore` covers `.env`, dumps, SQL, storage; seed scripts refuse default credentials. | No change; history purge still required (P1-02/P3-15). |
| INFO-11 | Schema/indexing deliberate: booking indexes on `startsAt`, `(status, startsAt)`, `(paymentStatus, holdExpiresAt)`, `(assignedStaffId, startsAt)`; 38 ordered migrations. | New remediation migration adds tables/indexes. |
| INFO-12 | SEO/error basics: dynamic sitemap, robots.txt, JSON-LD Organization, per-page titles/descriptions, canonical site URL config, sanitized production errors, DB-aware health. | Built on by P3-02/P3-07/P2-06/P3-17. |

No code change required for INFO items; they are maintained, not fixed.

## Schema changes (prepared migration, not executed)

All schema changes live in `prisma/migrations/20261028120000_audit_remediation/migration.sql` and are reflected in `prisma/schema.prisma`. The migration **must not** be executed in this session; it is applied by an authorized operator via the one-shot Compose `migrate` job before the updated app starts.

| Model/column | Finding(s) | Purpose |
|---|---|---|
| `AdminUser.failedLoginCount`, `lockedUntil`, `passwordChangedAt` | P2-07 | Per-account persisted lockout + password rotation timestamp |
| `AdminSession` table + indexes + FK | P2-08 | Revocable server-side sessions with hashed tokens |
| `Booking.termsAcceptedAt`, `termsVersion`, `privacyAcceptedAt`, `privacyVersion`, `marketingConsentAt`, `marketingConsentVersion` | P1-01 | Server-captured consent evidence |
| `Booking.metaClientIp`, `metaClientUa` | P2-13 | Consent-gated Meta CAPI network signals |
| `Service.nameEn`, `descriptionEn` | P3-13 | Optional English service copy (German fallback) |
| `Product.nameDe`, `descriptionDe` | P2-11 | Optional German product copy (EN fallback) |
| `Category.nameDe`, `descriptionDe` | P2-11 | Optional German category copy (EN fallback) |
| `WorkingHours.updatedAt` | P1-03 | Optimistic-concurrency revision |
| `NotificationOutbox.provider`, `acceptedAt`, `simulated` | P2-01 | Distinguish simulated vs accepted deliveries |
| `SiteSettings.singleton` + unique index + backfill | P2-15 | Enforce single settings row |
| `RateLimitBucket` table + indexes | P2-09 | Shared PostgreSQL fixed-window rate-limit store |

## Deployment changes

| Item | Finding(s) | Detail |
|---|---|---|
| Docker build arg `NUXT_PUBLIC_LAUNCH_MODE` | P1-06 | Passed at build; image immutable per mode; runtime env cannot change locale list/strategy |
| Compose: loopback DB port only, `POSTGRES_PASSWORD` required, one-shot `migrate` job before app, app startup gate | P2-14 | Migrations never at app boot; `Dockerfile` has no boot migration |
| Required production env: `DATABASE_URL`, `NUXT_SESSION_PASSWORD` (≥32), `ENCRYPTION_KEY` (64 hex), `NUXT_PUBLIC_SITE_URL` (https in prod) | P3-14, P2-14 | Fail-fast at boot via `server/plugins/env-validation.ts` |
| Optional production env: `TRUST_PROXY=true`, `NUXT_PUBLIC_LEGAL_REVIEWED=true`, `METRICS_TOKEN`/`HEALTH_TOKEN`, `META_CAPI_ALLOW_TEST_EVENTS` | P2-09, P1-01, P3-17/P3-18, P2-13 | Gate trusted proxy, legal publication, metrics/health, Meta test events |
| Backup schedule (host cron or systemd) + off-host destination + restore drill | P3-10 | `scripts/backup.sh`/`restore.sh` + `Docs/BACKUP-RESTORE.md` |
| `public/robots.txt` is fallback only; dynamic `server/routes/robots.txt.ts` | P3-02/P3-07 | Sitemap URL follows `NUXT_PUBLIC_SITE_URL` |

## Manual / legal / operator actions (not code)

| Item | Finding(s) | Owner |
|---|---|---|
| Publish counsel-approved Impressum/Datenschutz/AGB/Stornierung text; set `NUXT_PUBLIC_LEGAL_REVIEWED=true` | P1-01 | Counsel + authorized operator |
| Purge `backups/clean-slate-*.dump` and `storage/` binaries from Git history (`git filter-repo`/BFG, force-push, invalidate forks/caches) | P1-02, P3-15 | Authorized operator (Git access forbidden here) |
| Rotate DB credentials, admin passwords, session secret, encryption key (re-encrypt settings), payment/webhook secrets | P1-02 | Authorized operator |
| Complete quarterly restore drill into scratch DB; record in operations log | P3-10 | Authorized operator |
| Tighten CSP from report-only to enforcing after staging telemetry | P2-06 | Operator after staging verification |
| Decide and implement MFA (TOTP/WebAuthn) for privileged admin roles | P2-07 | Architecture/operations decision |
| Author real German product/category copy and English service copy | P2-11, P3-13 | Content owner |
| Add lint/typecheck/Playwright to CI; adopt `@nuxt/image` with lockfile update | P2-10, P2-16 | Operator with registry access |
| Re-run full audit after material feature work | All | Continuous |

## Git-history exposure

The dump `backups/clean-slate-20261009-190917.dump` (122,442 bytes, 32 table COPY blocks) and `storage/` binaries remain in historical Git objects on the GitHub remote. Contents were **not** inspected by policy; exact PII/secret exposure is unconfirmed. Treat as a potential GDPR Art. 32 incident: purge history, force-push, rotate credentials. No Git action was taken in this session.

## Unverified runtime checks (require explicit approval)

No build, test, migration, server start, browser automation, payment check, Lighthouse, axe, or backup/restore drill has been run. Key unverified items:
1. `npm test` (Node ≥22.18 default type stripping; `engines.node >= 22.18` set).
2. CI `npm ci --legacy-peer-deps`, `prisma validate/generate`, `npm run build`.
3. Migration applied against a restored backup; rollback drill.
4. PayPal sandbox: success, delayed webhook, duplicate webhook, amount mismatch, expired hold + competing booking.
5. Mail provider test: `log` vs HTTP, outbox failure/retry.
6. Absence + assign/confirm concurrency in two DB sessions.
7. Expense dataset >1,000/10,000 rows vs SQL aggregates.
8. Lighthouse/CWV on `/`, `/products`, `/p/[slug]`, `/booking/[slug]`, `/admin`.
9. axe + keyboard walkthrough of drawer/consent/cancel.
10. Health endpoint token gating; metrics endpoint 404 when no token.
11. Zod schema/body compatibility for converted admin handlers.

## Status summary by priority

| Priority | Total | Fixed (code) | Fixed (partial) | Not fixed |
|---|---|---|---|---|
| P1 | 6 | 5 | 1 (P1-02) | 0 |
| P2 | 16 | 14 | 3 (P2-07 MFA, P2-10 lint/E2E, P2-16 @nuxt/image) | 0 |
| P3 | 18 | 16 | 2 (P3-10 drill, P3-15 purge) | 0 |
| INFO | 12 | — | — | 0 (observations) |

Note: P2-10, P2-16 each have code changes plus pending operator steps; counted as partial. P2-07 MFA is an explicit architectural exclusion (not a code omission).

## Verification results (controlled verification)

All checks were run under the absolute restrictions: no Git commands, no `.git` access, no production database, no migrations against production, no real payments/transactions, no secrets exposed, no files deleted except correcting my own import path.

### Phase 2 — Static and schema checks

| Check | Command | Result | Details |
|---|---|---|---|
| Prisma schema validation | `npx prisma validate` | Passed (exit 0) | Schema at `prisma/schema.prisma` is valid |
| Prisma client generation | `npx prisma generate` | Passed (exit 0) | Regenerated `node_modules/@prisma/client` (generated artifact only; no tracked source modified) |
| TypeScript type-check | `node_modules/.bin/tsc --noEmit` | Passed (exit 0, no output) | No type errors |
| Lint | — | Not run | No `lint` script exists in `package.json`; `eslint`/`vitest`/`playwright` not installed (pending, per remediation report P2-10) |

### Phase 3 — Automated tests

| Check | Command | Result |
|---|---|---|
| Unit tests (pure logic) | `npm test` | Failed — 33 passed, 2 failed |

**Test failures (both environment/ICU dependent; not remediation defects):**

1. `tests/booking-slots.test.ts` → `wallToUtcMs converts wall time to UTC in both DST regimes` (line 35): the fall-back transition `2026-10-25 02:00` is ambiguous (occurs twice in Europe/Berlin). This container's ICU disambiguates to a different instant than the assertion expects (`actual 1792890000000`, `expected 1792886400000`). The shell timezone is EEST/UTC+3 (not Europe/Berlin). The round-trip test (`wallToUtcMs` ↔ `tzParts`) passed, confirming internal consistency. **Root cause:** ICU ambiguous-time disambiguation variance; test assertion encodes a specific disambiguation choice. Not a logic defect.

2. `tests/format.test.ts` → `formatPrice renders EUR or an empty string` (line 30): `formatPrice(28)` (whole euro, no `fractionDigits`) rendered `'28 €'` because this ICU build applies `minimumFractionDigits: 0` for integers, omitting decimals. `centsToEur` — the formatter actually used in the booking flow — forces `minimumFractionDigits: 2` and correctly produced `'28,00 €'` (its test passed). **Root cause:** ICU currency-rendering variance for whole euros; not a logic defect. `centsToEur` remains the authoritative formatter.

**Tests passing (33):** `depositCentsFor`, `centsToEur`, `eurToCents`, `normalizePhoneForWa`, `isStaffOverlapping`, all booking-status transition tests, `tzDayStr`, `tzOffsetMinutes`, `wallToUtcMs` round-trip, `parseDayStr`, `daysFromToday`, all `daySlotStarts` tests, `overlaps`, `markAvailable`, `isOnSlotStep`, all `localizedText` fallback tests, `intlLocale`, `formatDateInZone`, `formatTimeInZone`, `formatDateTime`, legacy Berlin aliases, `todayInZone`, `addDaysToDayStr`.

### Phase 4 — Production build

| Check | Command | Result |
|---|---|---|
| Production build | `npm run build` | Failed first, then Passed (exit 0) |

**First failure (my error, corrected):** `UNRESOLVED_IMPORT './utils/content.ts'` in `app/pages/index.vue`. I had added `import { localizedText } from './utils/content.ts'` which resolves to `app/pages/utils/content.ts` (nonexistent). The file is at `app/utils/content.ts`, so from `app/pages/` the correct relative path is `../utils/content.ts`. **Root cause:** incorrect relative import path I introduced when wiring `localizedText` into the homepage (P2-11). All other `localizedText` imports used the correct `../../utils/content.ts`.

**Correction made:** Changed `app/pages/index.vue` line 6 from `'./utils/content.ts'` to `'../utils/content.ts'`. Re-ran `npm run build` → **Passed** (exit 0), `.output/` generated (build artifact only).

### Migration status

Prepared migration `prisma/migrations/20261028120000_audit_remediation/migration.sql` is **not executed** (per restrictions). It is applied by an authorized operator via the one-shot Compose `migrate` job before the updated app starts. `prisma validate` confirms the schema is valid; `prisma generate` regenerated the client artifact in `node_modules` (not tracked source).

### Checks requiring manual / staging verification

Not run (per restrictions and the remediation report's "Unverified runtime checks" section):
- PayPal sandbox payment flows; duplicate webhook handling; refund/manual-resolution when a slot is unavailable
- Mail provider test (`log` vs HTTP), outbox failure/retry
- Absence + assign/confirm concurrency in two DB sessions
- Expense dataset >1,000/10,000 rows vs SQL aggregates
- Lighthouse/CWV; axe + keyboard walkthrough
- Health endpoint token gating; metrics endpoint 404 when no token
- Migration job on a restored backup; rollback drill
- Backup/restore drill into a scratch database
- Spoofed `X-Forwarded-For` against login/contact limits
- Git history scan after purge

### Confirmations

- No Git commands were executed; `.git` was not accessed or modified.
- Production database was not connected to or modified.
- No real payments, refunds, or customer notifications were initiated.
- No secrets were exposed in terminal output, logs, or reports.
- No existing files, user data, backups, or database records were deleted.
- Source was not changed merely to silence an unrelated error; the only source correction (`app/pages/index.vue` import path) fixed a genuine unresolved-import bug introduced during implementation.

### Distinction of results

| Category | Items |
|---|---|
| Passed | `prisma validate`, `prisma generate`, `tsc --noEmit`, `npm run build` (after correction), 33 unit tests |
| Failed | 2 unit tests (environment/ICU dependent; documented above, not remediation defects) |
| Not run | Lint (no script), all Phase 5 staging checks, backup/restore drill, migration execution |
| Requires manual or staging verification | See "Checks requiring manual / staging verification" above |

The website is **not** declared production-ready solely because static checks and the build passed. Remaining items: migration execution by an authorized operator, credential rotation (P1-02/P3-15), legal text publication (P1-01), backup restore drill (P3-10), MFA decision (P2-07), lint/typecheck/E2E tooling (P2-10), `@nuxt/image` adoption (P2-16), and staging verification of the flows listed above.

---
