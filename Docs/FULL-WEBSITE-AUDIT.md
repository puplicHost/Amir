# Full Website Audit — AMIR Salon Platform

**Report date:** 2026-10-28  
**Repository:** `puplicHost/Amir` (branch `phase1/cleanup`, HEAD `8f9906d`)  
**Audit type:** Static, read-only, evidence-based  
**Report owner:** Engineering audit (AI-assisted)  
**Deliverable path:** `Docs/FULL-WEBSITE-AUDIT.md`

---

## 1. Executive Summary

The application is a Nuxt 4 / Nitro salon-booking platform with a public German/English storefront, a guest booking-and-deposit flow (Stripe + PayPal), and a large permissioned admin panel. The implementation is materially more mature than the repository documentation suggests: booking concurrency uses PostgreSQL advisory locks, payments are verified server-side with amount and currency checks, customer mail is queued through an exactly-once outbox, uploads are re-encoded with `sharp`, gateway secrets are AES-256-GCM encrypted, and all 115 admin API handlers enforce authentication and/or permissions.

No **P0** defect was found. Six **P1** issues are launch-relevant:

1. **Legal/compliance is not deliverable.** Impressum, Datenschutz, AGB and Stornierung are placeholder pages; the consent banner links to the placeholder privacy policy; the booking form collects personal data without an AGB/privacy acknowledgement; the footer has no legal links.
2. **A production database dump remains in Git history.** `backups/clean-slate-20261009-190917.dump` (122 KB, 32 tables) was removed from HEAD but is still reachable in history on a GitHub remote.
3. **The schedule screen can overwrite real opening hours.** A failed GET is indistinguishable from an empty schedule, so one Save writes 09:00–18:00 defaults (and closes Sunday) over production hours.
4. **A paid booking can survive a lost slot.** In the PENDING→PAID path, `free === false` is computed but only gates auto-assignment; the booking still flips to PAID with `needsRefund: false`, leaving a paid booking overlapping another booking and no admin alert.
5. **Private uploads are served with public, immutable caching.** Expense receipts and other non-public scopes are auth-checked but then sent with `Cache-Control: public, max-age=31536000, immutable`.
6. **The German-only launch mode cannot be produced by the documented Docker build.** Launch mode is read at build time, while `.env` is excluded from the Docker build context and only provided at runtime.

The dominant P2 themes are operational and UX-related: mail defaults to the `log` provider (silent non-delivery), no admin password rotation/MFA/lockout, no server-side session revocation, a process-local rate limiter that trusts `X-Forwarded-For`, no automated tests/CI, missing security headers, admin focus-management gaps, and timezone/locale formatting inconsistencies.

**Overall assessment:** strong booking/payment core, weak launch readiness around legal content, credential lifecycle, deployment reproducibility, and verification infrastructure.

---

## 2. Scope, Method & Constraints

### 2.1 Scope

- Entire repository at HEAD: `app/`, `server/`, `shared/`, `prisma/`, `public/`, `i18n/`, configuration, Docker assets, and documentation.
- Public storefront, booking funnel, payment returns/webhooks, customer self-service, and admin panel.
- Database schema, migrations, indexes, and data-integrity rules.
- Security controls: authentication, authorization, sessions, uploads, secrets, headers, rate limiting, webhook verification.
- Performance, accessibility, i18n, reliability, deployment, and operations.

### 2.2 Method

1. Read `Docs/agent.md`, master plan, sitemap, prior audit/remediation reports, and `README.md`.
2. Inventoried routes, components, composables, API handlers, Prisma models, and migrations with filesystem/search tools.
3. Read all security-critical utilities (`auth`, `rate-limit`, `login-attempts`, `validation`, `encryption`, `storage`, `mailer`, `outbox`, `booking-payments`, `booking-cancel`, `staff-absence`, `staff-availability`, `meta-capi`, `paypal`).
4. Traced the booking lifecycle end-to-end: availability → create/hold → pay → webhook/return → confirm → assign/reschedule/cancel/refund → reminders.
5. Reviewed all 44 pages at template/logic level, with deeper reads of booking, legal, admin schedule, settings, and catalog pages.
6. Cross-checked documentation claims against code; findings are based on implementation, not docs.
7. Compared Git history and repository hygiene (`git rev-list`, `git ls-files`, `.gitignore`, `.dockerignore`).

### 2.3 Constraints (observed)

- **No code, configuration, dependency, environment, database, or infrastructure changes.**
- **No installs, migrations, seeds, commits, branches, pushes, builds, tests, servers, browser automation, Lighthouse, or load tests.**
- Read-only shell inspection and Git object inspection only.
- Secrets, credentials, tokens, and PII are not reproduced in this report.
- Runtime behavior is inferred statically. Items requiring execution are listed in §18.

### 2.4 Severity model

| Level | Meaning |
|---|---|
| **P0** | Active exploitation, data loss, or total outage; fix before any exposure. |
| **P1** | Launch blocker or high-impact correctness/security/compliance defect. |
| **P2** | Serious defect with realistic impact, workaround, or bounded blast radius. |
| **P3** | Maintainability, consistency, minor UX/perf, or defense-in-depth. |
| **INFO** | Verified strength, observation, or documentation note. |

Confidence is **High** when the code path was read directly and the behavior is deterministic, **Medium** when it depends on deployment topology or runtime configuration, **Low** when only inferred.

---

## 3. Architecture & Stack

### 3.1 Runtime

| Layer | Technology |
|---|---|
| Framework | Nuxt 4.5.2, Vue 3.5, Nitro |
| Language | TypeScript |
| Styling | Tailwind CSS 3, custom CSS tokens, self-hosted Fontsource (Cormorant Garamond, Inter) |
| State | Pinia + persisted state (limited), composables, `useAsyncData` |
| i18n | `@nuxtjs/i18n`, locales `de` and `en`, default `en`, `prefix_except_default` |
| Database | PostgreSQL 16 |
| ORM | Prisma 6.19 (30 models, 38 migrations) |
| Payments | Stripe (PaymentIntents + webhook), PayPal (Orders v2 + webhook) |
| Mail | Provider abstraction: `log` (default) or generic HTTP JSON API |
| Push | Firebase Admin (server) + Firebase Web SDK/FCM service worker |
| Media | `sharp` re-encoding, local filesystem under `storage/` and `public/uploads/` |
| Auth | Encrypted cookie session (`nuxt-auth-utils`-style), bcrypt password hashes |
| Validation | Zod 4 (27 schemas) plus manual mapping in legacy handlers |
| Deployment | Multi-stage Dockerfile, Docker Compose (app + Postgres), Nitro Node server |

### 3.2 Request topology

```
Browser
  ├─ Nuxt SSR pages (public + admin)
  ├─ /api/* public handlers (32)
  ├─ /api/admin/* authenticated handlers (115)
  ├─ /api/webhooks/{stripe,paypal} (signature-verified)
  ├─ /uploads/<scope>/... (filesystem stream, auth for private scopes)
  └─ /sitemap.xml (dynamic)

Nitro server
  ├─ server/middleware/rate-limit.ts (9 route rules, in-memory)
  ├─ server/plugins/booking-sweeper.ts (60 s interval: expire holds, reminders, outbox)
  ├─ Prisma → PostgreSQL
  ├─ Stripe/PayPal REST
  ├─ Mail provider (HTTP or log)
  └─ Meta Conversions API (optional, consent-gated)
```

### 3.3 Application structure

| Path | Responsibility |
|---|---|
| `app/pages/` | 44 routes (7 top-level public, 5 booking, 2 catalog/detail, 1 dev, 27 admin, 2 other) |
| `app/components/app/` | 12 storefront components |
| `app/components/admin/` | 41 admin panels |
| `app/composables/` | 13 shared behaviors (session, consent, settings form, Meta events, push…) |
| `app/middleware/admin-auth.ts` | Route guard + permission gate |
| `server/api/admin/` | 115 admin handlers |
| `server/api/` (non-admin) | 32 public/webhook handlers |
| `server/routes/` | sitemap + uploads streaming |
| `server/utils/` | Domain logic (booking, payments, mail, storage, auth, audit) |
| `shared/` | Cross-runtime types, permissions, booking helpers |
| `prisma/` | Schema, 38 migrations, seed scripts |

### 3.4 Key domain flows

- **Booking:** guest selects service → staff (optional) → date/slot → creates `PENDING` booking with a hold TTL → pays deposit via Stripe/PayPal → webhook or return confirms → staff assignment (manual or auto for specific-staff bookings) → reminders → complete/cancel/refund.
- **Availability:** salon hours, staff schedules, time off, closures, paid bookings, unexpired pending holds, and legacy staff-less bookings all participate in slot blocking.
- **Self-service:** unguessable `manageToken` allows view/cancel within a configured window; `publicToken` powers status polling without exposing PII.
- **Money safety:** advisory day lock for create/confirm/assign/reschedule/manual; amount+currency verification; replay detection; refund flags instead of silent loss.
- **Admin:** role defaults plus explicit extra grants; page-level `requiredPermission`, UI visibility checks, and API enforcement.

---

## 4. Inventory

### 4.1 Pages (44)

| Group | Count | Routes |
|---|---|---|
| Storefront top-level | 7 | `/`, `/about`, `/contact`, `/products`, `/services`, `/impressum`, `/datenschutz` |
| Legal | 2 additional | `/agb`, `/stornierung` |
| Catalog | 2 | `/products/[slug]` (category), `/p/[slug]` (product detail) |
| Booking | 5 | `/booking/[slug]`, `/booking/success`, `/booking/failed`, `/booking/pay/[token]`, `/booking/manage/[token]` |
| Dev | 1 | `/dev/styleguide` |
| Admin | 27 | see §7 |
| **Total** | **44** | |

### 4.2 Components & composables

- 73 Vue components: 41 admin, 12 storefront, 20 shared/layout/UI.
- 13 composables: `useAdminConfirm`, `useAdminHeader`, `useAdminPush`, `useAdminSession`, `useAdminTabQuery`, `useAdminToast`, `useCookieConsent`, `useFirebasePush`, `useMetaEvents`, `useNotificationUi`, `useSettingsForm`, `useSiteSeo`, `useWhatsApp`.
- 3 client plugins (`brand-colors`, `error-payload.server`, `reveal.client`), 1 server plugin (booking sweeper), 1 route middleware (`admin-auth`), 1 server middleware (`rate-limit`).

### 4.3 API surface

| Group | Count |
|---|---|
| Admin handlers | 115 |
| Public/webhook handlers | 32 |
| Server routes (sitemap, uploads) | 2 |
| **Total** | **149** |

Admin breakdown: settings 24, products 15, bookings 11, staff 10, services 6, expenses 6, notifications 5, banners 5, announcements 5, users 4, inbox 4, expense-categories 4, categories 4, closures 3, auth 3, working-hours 2, activity 1, reminders 1, dashboard 1, calendar 1.

### 4.4 Database

30 models: `AdminUser`, `AdminPermission`, `Category`, `Product`, `ProductImage`, `ProductAttribute`, `ProductSeo`, `ProductVideo`, `ProductDocument`, `Service`, `WorkingHours`, `Booking`, `BookingAssignment`, `StaffProfile`, `StaffService`, `StaffSchedule`, `StaffTimeOff`, `SalonClosure`, `NotificationOutbox`, `BookingRefund`, `ExpenseCategory`, `Expense`, `AdminDeviceToken`, `AdminNotification`, `Banner`, `HeroSlide`, `AnnouncementItem`, `SiteSettings`, `AuditLog`, `ContactMessage`.

38 migrations, including removal of commerce, introduction of the booking system, staff availability, absence/reassign, customer mail, cancel/refund, reminders, hero slides, and lookup indexes.

### 4.5 i18n & assets

- 642 keys in `de.json` and 642 in `en.json`; zero missing/extra keys.
- 41 raw `<img>` tags; 23 with `loading="lazy"`; zero `NuxtImg`; no `@nuxt/image`.
- Self-hosted fonts via Fontsource (10 imports); no external font requests.
- `public/` ≈7.2 MB, `storage/` ≈18 MB at audit time.

---

## 5. Findings Summary

| Priority | Count | Distribution |
|---|---:|---|
| **P0** | 0 | — |
| **P1** | 6 | Compliance 1, Git/security 1, Admin correctness 1, Payments 1, Uploads 1, Deployment 1 |
| **P2** | 16 | Security 5, Reliability 3, UX/i18n 3, Performance 1, Testing 1, Ops 2, Data 1 |
| **P3** | 18 | Consistency 6, Perf 2, UX 3, Ops 3, Docs/maintainability 4 |
| **INFO** | 12 | Verified strengths and observations |
| **Total** | **52** | |

### P1 at a glance

| ID | Title |
|---|---|
| P1-01 | Legal pages and booking consent are placeholders/missing |
| P1-02 | Production database dump remains in Git history |
| P1-03 | Working-hours screen can overwrite real hours after a failed load |
| P1-04 | PENDING→PAID can confirm a booking whose slot was lost |
| P1-05 | Private upload scopes are cached as public/immutable |
| P1-06 | German-only launch mode is build-time and cannot be set by the Docker runtime |

### P2 at a glance

P2-01 Mail defaults to `log` (silent non-delivery) · P2-02 Absence recording races assignment/confirmation · P2-03 Expense totals/CSV truncate at 1,000/10,000 rows · P2-04 Booking date uses UTC and has no bounds · P2-05 Timezone/locale formatting inconsistencies · P2-06 No security headers · P2-07 No password rotation, MFA, or lockout · P2-08 No server-side session revocation · P2-09 Rate limiter is bypassable and process-local · P2-10 No tests, CI, lint, or typecheck · P2-11 i18n drift and German-content fallback · P2-12 Focus management gaps in overlays · P2-13 Meta CAPI weaknesses · P2-14 Database port exposure and boot migrations · P2-15 Settings singleton inconsistency · P2-16 No image optimization pipeline.

---

## 6. Detailed Findings

### P1 — Launch blockers

#### P1-01 — Legal pages and booking consent are placeholders/missing

- **Priority:** P1
- **Area:** Compliance / Legal / Privacy
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:**
  - `app/pages/impressum.vue:17-19`
  - `app/pages/datenschutz.vue` (same pattern)
  - `app/pages/agb.vue` (same pattern)
  - `app/pages/stornierung.vue` (same pattern)
  - `app/components/app/AppConsentBanner.vue:98`, `:176`
  - `app/pages/booking/[slug].vue` (form/submit block, no consent checkbox)
  - `app/components/app/AppFooter.vue` (no legal links)
  - `i18n/locales/de.json:672-678` (`legal.placeholder`)
- **Evidence:** All four legal routes render `t('legal.placeholder')` (“Diese Seite ist derzeit ein Platzhalter.” / “This page is currently a placeholder.”). The cookie-consent banner links to `/datenschutz`, which is that placeholder. The booking form has a WhatsApp-reminder checkbox but no AGB/privacy acknowledgement. The footer links Home, Products, Services and Contact only. A repository search finds no other references to `/impressum`, `/agb` or `/stornierung`.
- **Root cause:** Legal content and the consent/contract step were never implemented; the routes exist as scaffolding.
- **Impact:** A German commercial site requires a provider imprint (DDG §5), a privacy notice (GDPR Arts. 13–14), and a lawful basis/consent record for booking data and marketing. AGB and cancellation terms are not incorporated into the booking contract. This creates regulatory, fine, and contract-enforcement exposure, and the marketing-consent flow points users to a non-policy.
- **Reproduction reasoning:** Render `/impressum` or `/datenschutz`; the page body is a status box with the placeholder string. Submit a booking; no terms/privacy checkbox or record is sent.
- **Fix:** Publish counsel-approved Impressum, Datenschutz, AGB and Stornierung; link all four in the footer and checkout; add a required, unselected AGB + privacy checkbox with version/timestamp stored on the booking; make marketing consent separately optional; update `CONSENT_POLICY_VERSION` when the policy changes.
- **Regression risk:** A new required checkbox blocks submissions until accepted (intended); storing consent fields requires a migration and mail-template changes.
- **Verification plan:** Legal review sign-off; E2E booking without consent is rejected; DB row stores terms/privacy version and timestamp; footer/consent links resolve to real content.

#### P1-02 — Production database dump remains in Git history

- **Priority:** P1
- **Area:** Security / Data protection / Repository hygiene
- **Confidence:** High
- **Status:** Confirmed (Git object inspection; contents not read)
- **Affected files:**
  - `backups/clean-slate-20261009-190917.dump` (historical blob, 122,442 bytes)
  - `.gitignore` (now ignores `backups/`, `*.dump`, `*.sql`, `storage/`)
  - `REMEDIATION_REPORT.md:25-26`, `:217`
- **Evidence:** `git rev-list --objects --all` still lists the dump; it was added in commit `7d0ade3` and removed from the working tree/HEAD later. The dump declares 32 table `COPY` blocks. The repository has a GitHub remote. `.gitignore` prevents new commits but does not remove history.
- **Root cause:** The dump was committed before ignore rules existed; remediation removed it from the index without rewriting history.
- **Impact:** Anyone with repository access (including forks, CI caches, and GitHub object storage) can recover a production snapshot. Depending on its contents, this can include customer names/phones/emails, booking history, admin password hashes, and encrypted gateway settings. This is a GDPR Art. 32 incident risk and a credential-stuffing/attack-surface risk.
- **Reproduction reasoning:** `git rev-list --objects --all | grep backups/` returns the blob; `git cat-file -s <blob>` returns 122,442 bytes. No live secret values were inspected.
- **Fix:** Treat as a potential breach: purge the blob from all history with `git filter-repo`/BFG, force-push, invalidate forks/caches, rotate database credentials, admin passwords, session secret, encryption key (re-encrypt settings), and payment/webhook secrets if the dump contained them. Add a pre-receive/CI secret-and-dump scan.
- **Regression risk:** History rewrite requires coordinated force-push and breaks existing clones; key rotation invalidates sessions and stored ciphertexts.
- **Verification plan:** `git rev-list --objects --all` has no dump/storage matches; GitHub secret scanning and a repository clone confirm removal; rotated credentials work; old sessions fail.

#### P1-03 — Working-hours screen can overwrite real hours after a failed load

- **Priority:** P1
- **Area:** Admin correctness / Booking availability
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `app/components/admin/AdminSchedulePanel.vue:29-58` (load/seed), `:60-77` (save), `:101-103` (button state)
- **Evidence:** `useAsyncData` destructures only `{ data, refresh, pending }`; `error` is ignored. `rows` is initialized to `09:00–18:00` with Sunday closed. `watch(data)` returns early on `null`, so a 401/500/network failure leaves the defaults on screen. Save is enabled when `saving || pending` is false and PUTs every row unconditionally.
- **Root cause:** No distinction between “not loaded” and “loaded empty”; no error state, no dirty/loaded gate, no optimistic concurrency.
- **Impact:** One failed GET followed by Save silently replaces the salon’s real schedule, changing public availability, deposit/booking slots, and staff planning. Recovery requires manual re-entry.
- **Reproduction reasoning:** Force `/api/admin/working-hours` to return 500; the panel still renders editable 09:00–18:00 rows; click Save; the PUT succeeds and persists defaults.
- **Fix:** Destructure `error`; render a blocking error panel with Retry; add `loaded`/`dirty` flags; disable Save until a successful load; send the expected `updatedAt`/version and reject stale writes; show a confirmation diff before saving.
- **Regression risk:** Save becomes unavailable during transient failures (intended); version checks require a schema/API field.
- **Verification plan:** Simulate 500/timeout and confirm Save is disabled and no PUT is issued; simulate concurrent edit and confirm stale save is rejected.

#### P1-04 — PENDING→PAID can confirm a booking whose slot was lost

- **Priority:** P1
- **Area:** Payments / Booking integrity
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `server/utils/booking-payments.ts:219-320` (PENDING path), `:323-370` (EXPIRED/FAILED path), `server/plugins/booking-sweeper.ts:8-16`
- **Evidence:** Inside the advisory-lock transaction, `free` is computed for staff-assigned bookings, but it is used only in `shouldAssign = free && booking.assignedStaffId && booking.status === 'UNASSIGNED'`. The subsequent `updateMany` always sets `paymentStatus: 'PAID'`, `needsRefund: false`, and clears `holdExpiresAt`; when `free === false` it neither refunds nor notifies. The EXPIRED/FAILED branch does implement the “slot taken → keep money → needsRefund + admin notify” behavior, so the PENDING branch is inconsistent with the documented invariant.
- **Root cause:** The hold-expiry sweeper runs every 60 seconds; during the gap (or after any status drift), availability no longer blocks the expired PENDING hold, so another booking can take the slot. A late webhook then enters the PENDING branch with `free === false` and still confirms.
- **Impact:** Double-booked staff/time, a paid customer who cannot be served, no refund flag, and no admin alert. Reconciliation depends on someone noticing manually.
- **Reproduction reasoning:** Create a PENDING booking with a specific staff member; let `holdExpiresAt` pass but confirm before the sweeper flips it; create a competing booking for the same slot; deliver the first payment webhook. The first booking becomes PAID/UNASSIGNED while the second occupies the slot.
- **Fix:** In the PENDING branch, if `free === false`, do not flip to PAID as a serviceable booking: either flag `needsRefund` + notify (same as EXPIRED/FAILED) or atomically reassign to another qualified staff member and record the change; never clear `needsRefund` when the slot check failed. Consider locking the booking row (`SELECT … FOR UPDATE`) and re-checking `holdExpiresAt`.
- **Regression risk:** Legitimate late payments may now require manual handling; auto-reassign must respect skills, schedules, and time off.
- **Verification plan:** Integration test with a real Postgres clock: expired hold + competing booking + late webhook yields `needsRefund` or a valid reassignment, never an overlapping PAID booking. Add a regression test for the EXPIRED path parity.

#### P1-05 — Private upload scopes are cached as public/immutable

- **Priority:** P1
- **Area:** Security / File access
- **Confidence:** Medium-High (depends on shared-cache topology)
- **Status:** Confirmed (static)
- **Affected files:** `server/routes/uploads/[...path].get.ts:20-36` (auth), `:50-56` (headers)
- **Evidence:** Non-public scopes require a session and one of `services.manage`, `expenses.view`, or `expenses.manage`. After that check, the handler always sets `cache-control: public, max-age=31536000, immutable`. A single permission grants access to every private scope, with no per-resource ownership check.
- **Root cause:** Performance caching was applied uniformly to public and private content.
- **Impact:** A CDN/reverse proxy that caches authenticated 200 responses can replay expense receipts or service-request files to unauthenticated users. The coarse authorization also lets a services manager read financial receipts and vice versa.
- **Reproduction reasoning:** Request a private file with a valid session through a caching proxy; the response carries `public, immutable`. A subsequent unauthenticated request can be served from cache if the proxy does not key on cookies/authorization.
- **Fix:** Use `Cache-Control: private, no-store` (and `Vary: Cookie`) for every non-public scope; split permissions per scope (`expenses.receipts`, `services.media`); consider short-lived signed URLs. Keep `public, immutable` only for the explicit public allowlist.
- **Regression risk:** Private files lose edge caching (acceptable); stricter permissions may require role updates.
- **Verification plan:** Response-header assertions for public vs private scopes; proxy test confirms no unauthenticated cache hit; permission matrix test.

#### P1-06 — German-only launch mode is build-time and cannot be set by the Docker runtime

- **Priority:** P1
- **Area:** Deployment / i18n
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `nuxt.config.ts:4` (build-time read), `:56-76` (locales/default/strategy), `Dockerfile:9-13` (build stage), `.dockerignore` (`.env` excluded), `docker-compose.yml:30-36` (runtime env only)
- **Evidence:** `const isLaunchMode = process.env.NUXT_PUBLIC_LAUNCH_MODE === 'true'` is evaluated when the Nuxt config is loaded. It controls the locale list, default locale (`de` vs `en`), and strategy (`no_prefix` vs `prefix_except_default`). The Docker build copies the repo without `.env`; Compose injects environment variables only when the container starts. No build arg/ENV is declared for launch mode.
- **Root cause:** Build-time configuration was documented as if it were runtime configuration.
- **Impact:** The intended German-only launch silently ships an English-default, bilingual site with `/en` prefixes, a language switcher, and duplicate-language SEO. Setting the variable on the server after build has no effect on i18n.
- **Reproduction reasoning:** Build the image without the variable, run it with `NUXT_PUBLIC_LAUNCH_MODE=true`, and inspect the generated client config/HTML: locales still include `en` and `/` resolves to English.
- **Fix:** Either pass a Docker `ARG`/`ENV` at build time and document that launch mode is immutable per image, or move locale/strategy decisions to runtime config used by middleware/plugins. Add a build-time assertion and a smoke check that `/` renders `lang="de"` when launch mode is on.
- **Regression risk:** Rebuilding is required to switch modes if build-time; runtime switching needs careful SEO/canonical handling.
- **Verification plan:** Build with the flag and inspect `.output`/HTML; E2E asserts no `/en` routes and German default.

---

### P2 — Serious issues

#### P2-01 — Mail defaults to `log`, so production customer mail can silently disappear

- **Priority:** P2
- **Area:** Reliability / Customer communication
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `server/utils/mailer.ts:24-45`, `:70-120`; `server/utils/outbox.ts`; `server/api/admin/settings/mail-test.post.ts`
- **Evidence:** `provider: (s as any)?.mailProvider || 'log'`. The `log` provider writes the message to the server log and reports success; the outbox then marks the row sent. No startup warning, health signal, or production guard exists.
- **Root cause:** A developer-friendly default was carried into production semantics.
- **Impact:** Booking confirmations, cancellations, reschedules and reminders are never delivered, with no failure signal. Customers arrive without confirmation; reminders provide no revenue protection.
- **Fix:** In production, refuse to send/queue when `provider === 'log'` (or mark the outbox row failed and raise a persistent admin alert). Add a settings health badge and a daily “mail provider not configured” notification.
- **Regression risk:** A misconfigured deployment stops queueing instead of silently pretending; this is preferable but must be communicated.
- **Verification plan:** Set `NODE_ENV=production` with default settings; queue a mail and assert failure/alert. Configure HTTP provider and assert delivery + outbox state.

#### P2-02 — Absence recording races assignment and payment confirmation

- **Priority:** P2
- **Area:** Reliability / Booking integrity
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `server/utils/staff-absence.ts:23-70`; `server/api/admin/staff/[id]/timeoff.post.ts`; `server/api/admin/staff/unavailable.post.ts`; `server/api/admin/bookings/[id]/assign.put.ts`; `server/utils/booking-payments.ts:264-320`
- **Evidence:** `recordAbsence` creates `StaffTimeOff` and moves the staff member’s ASSIGNED bookings to UNASSIGNED in one transaction, but takes no advisory lock. Creation, assignment and confirmation serialize on `pg_advisory_xact_lock(hashtext('salon'), hashtext(day))`; absence does not.
- **Root cause:** The day-lock protocol is not applied to time-off writes.
- **Impact:** A concurrent assignment/confirmation can place a booking inside the newly recorded absence after the absence transaction’s snapshot, leaving a customer booked with an unavailable staff member. Auto-assignment may also pick that staff member immediately after the absence is recorded.
- **Reproduction reasoning:** Record a multi-day absence while an assign request for an overlapping slot commits; depending on order, the booking remains ASSIGNED inside the time-off window.
- **Fix:** Acquire the salon/day advisory lock(s) for every day in the absence range (in deterministic order) before creating time off and unassigning; re-validate overlap inside the transaction. Alternatively use a staff-level lock consistently for assign/confirm/absence.
- **Regression risk:** Longer transactions for multi-day absences; lock-order discipline is required to avoid deadlocks.
- **Verification plan:** Concurrency test with two sessions (absence + assign) asserting no ASSIGNED booking overlaps a time off.

#### P2-03 — Expense totals and CSV truncate silently at 1,000/10,000 rows

- **Priority:** P2
- **Area:** Data correctness / Finance
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `server/api/admin/expenses/index.get.ts:26-56`; `server/api/admin/expenses/export.get.ts:20-70`
- **Evidence:** The list fetches `take: 1000` and computes `total`, `byCategory`, and `byMonth` with `reduce` over those rows. The export fetches `take: 10000` and computes its totals the same way. No pagination cursor, count, or truncation flag is returned.
- **Root cause:** Bounded fetch used as if it were the complete filtered set.
- **Impact:** Once a filter/date range exceeds the cap, displayed totals, category/month breakdowns, and the exported CSV are incomplete with no warning — directly misleading financial reporting.
- **Fix:** Use Prisma `aggregate`/`groupBy` for totals and breakdowns, paginate rows, and either stream the export or impose an explicit, surfaced limit. Include a `truncated` flag and row count.
- **Regression risk:** Additional queries; export streaming complexity.
- **Verification plan:** Seed >1,000 rows in a test DB and compare UI/CSV totals with SQL aggregates.

#### P2-04 — Booking date defaults to UTC and has no bounds

- **Priority:** P2
- **Area:** UX / Booking correctness
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `app/pages/booking/[slug].vue:39` (date default), `:344-350` (date input)
- **Evidence:** `const todayStr = new Date().toISOString().slice(0, 10)`. `toISOString()` is UTC; between 00:00 and 01:59/02:59 Berlin time the local date is one day ahead (and in late-evening edge cases the reverse). The `<input type="date">` has no `min`/`max`.
- **Root cause:** UTC serialization used for a salon-local calendar day.
- **Impact:** During the first hours of the day, the default date is yesterday, yielding empty/blocked slots or a validation error. Users can select past or far-future dates and only discover the failure on submit.
- **Fix:** Get “today” from the salon timezone (settings/availability response or `Intl.DateTimeFormat` with `timeZone`); set `min` to today and `max` to today + horizon; normalize on submit.
- **Regression risk:** Client clock/timezone skew; server remains the authority.
- **Verification plan:** Freeze the clock at 00:30 Europe/Berlin and assert the default equals the local day; E2E rejects out-of-range dates.

#### P2-05 — Timezone and locale formatting are inconsistent

- **Priority:** P2
- **Area:** UX / i18n / Reliability
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `app/pages/booking/success.vue:92-95`; `server/utils/customer-mails.ts:28-34`; `app/pages/booking/[slug].vue:127-132`; `app/pages/booking/pay/[token].vue:27`; `server/utils/booking-payments.ts:415-421`; `server/api/admin/bookings/[id]/assign.put.ts:119`
- **Evidence:** `success.vue` formats dates with `de-DE` whenever the locale is not `ar` — English customers see German weekday/month names. Customer mail hardcodes `timeZone: 'Europe/Berlin'` instead of the admin-configurable `settings.timezone`; several server notification strings do the same. The booking page formats times client-side using the browser locale but no explicit salon timezone.
- **Root cause:** Formatting logic is duplicated and partially hardcoded.
- **Impact:** Wrong appointment time in mail if the salon timezone is changed; confusing mixed-language dates; support burden around “which time is my appointment?”.
- **Fix:** Centralize a `formatDateTime(iso, locale, timeZone)` helper; pass the salon timezone from settings through APIs and mail rendering; add tests for `de`/`en` × `Europe/Berlin`/other zones.
- **Regression risk:** Snapshot changes in mail templates.
- **Verification plan:** Unit tests for formatting; render confirmation mail in both locales and two zones.

#### P2-06 — No security headers

- **Priority:** P2
- **Area:** Security
- **Confidence:** High
- **Status:** Confirmed (static; edge configuration may add them)
- **Affected files:** `nuxt.config.ts` (no `routeRules`/headers), `server/error-handler.ts`, `Dockerfile`/Compose (no proxy config in repo)
- **Evidence:** Repository search finds no `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, or `Permissions-Policy`.
- **Root cause:** Headers were left to an external proxy that is not part of the repository.
- **Impact:** No defense-in-depth against XSS (notably `v-html` on product descriptions), clickjacking of admin actions/login, MIME sniffing, or referrer leakage of tokenized URLs.
- **Fix:** Add headers at the Nitro/edge layer: strict CSP with nonces/hashes, HSTS, `nosniff`, `frame-ancestors 'none'` for admin, `Referrer-Policy: strict-origin-when-cross-origin`, minimal `Permissions-Policy`.
- **Regression risk:** CSP can break inline scripts/styles, Meta Pixel, Firebase, and Stripe/PayPal redirects; roll out in report-only first.
- **Verification plan:** Header assertions in staging; CSP report-only telemetry before enforcement.

#### P2-07 — No admin password rotation, MFA, or account lockout

- **Priority:** P2
- **Area:** Security / Identity
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `server/api/admin/users/index.post.ts` (creation only), `server/api/admin/users/[id].put.ts` (no password field), `server/api/admin/auth/login.post.ts`, `server/utils/login-attempts.ts`
- **Evidence:** Passwords are hashed with bcrypt (10 rounds) at creation/seed. No endpoint or UI changes a password. `recordFailedLogin` only sends an admin notification after five failures in ten minutes; it never locks the account. No MFA/TOTP/WebAuthn exists.
- **Root cause:** Credential lifecycle was scoped to initial provisioning.
- **Impact:** A leaked admin password cannot be rotated through the product, and distributed brute force is only rate-limited per IP. Compromised credentials remain valid until manually changed in the database/seed.
- **Fix:** Add self-service password change (current-password verification), super-admin reset with forced rotation, TOTP/WebAuthn for privileged roles, and per-account exponential backoff/lockout. Invalidate sessions on change.
- **Regression risk:** Lockout support burden; MFA enrollment flow.
- **Verification plan:** Change password → old password fails, sessions revoked; lockout after N failures; MFA challenge on login.

#### P2-08 — Sessions cannot be revoked server-side

- **Priority:** P2
- **Area:** Security / Session management
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `server/utils/auth.ts:26-110`, `server/api/admin/auth/logout.post.ts`
- **Evidence:** The session is an encrypted, httpOnly cookie valid for 7 days. Each request re-loads the user and checks `isActive`/permissions, but there is no session version/epoch, token denylist, or “logout everywhere” mechanism. Logout only clears the cookie client-side.
- **Root cause:** Stateless cookie session without a revocation channel.
- **Impact:** A stolen cookie remains usable for up to 7 days even after logout or a password change; disabling the user is the only effective revocation.
- **Fix:** Add `sessionVersion`/`credentialsChangedAt` to `AdminUser`, include it in the cookie payload, and reject mismatches; bump on password change/logout-all/role change. Optionally add a short idle timeout.
- **Regression risk:** All sessions invalidate on deploy/rotation (intended).
- **Verification plan:** Login on two clients; logout-all on one; the other receives 401 on the next request.

#### P2-09 — Rate limiter is process-local and trusts `X-Forwarded-For`

- **Priority:** P2
- **Area:** Security / Abuse resistance
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `server/middleware/rate-limit.ts:12-33`; `server/utils/rate-limit.ts` (IP extraction)
- **Evidence:** Nine rules use an in-memory sliding window. The client key is derived from `x-forwarded-for`; no trusted-proxy allowlist or hop count is validated. State resets on restart and is not shared across replicas.
- **Root cause:** Single-instance, proxy-trusting implementation.
- **Impact:** An attacker can spoof `X-Forwarded-For` to bypass login/contact/booking limits; horizontal scaling multiplies the effective limit; restart clears counters.
- **Fix:** Derive the client IP only from a trusted proxy chain; use a shared store (Redis/Postgres) or edge/WAF rate limiting for auth and booking endpoints; add per-account limits alongside per-IP.
- **Regression risk:** Shared-store latency/availability; proxy misconfiguration can group users.
- **Verification plan:** Spoofed header does not change the bucket; two app replicas share counters; load test confirms limits.

#### P2-10 — No tests, CI, lint, or typecheck

- **Priority:** P2
- **Area:** Quality / Operations
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `package.json` (scripts only `dev/build/generate/preview/seed`), repository root (no `.github`, no test config/files)
- **Evidence:** No `*.test.ts`/`*.spec.ts`, no Vitest/Playwright config, no `.github` directory, no `lint`/`typecheck`/`test` scripts. Prior reports mention ad-hoc functional runs but nothing is committed.
- **Root cause:** Verification has been manual and external to the repo.
- **Impact:** Booking/payment concurrency, permission matrices, timezone logic, and i18n regressions have no automated guard. Every change is validated by manual review.
- **Fix:** Add Vitest for pure/shared logic and API integration tests against an ephemeral Postgres; Playwright for booking/admin critical paths; CI running typecheck, lint, unit, and E2E on PRs; add `vue-tsc`/ESLint scripts.
- **Regression risk:** Initial suite flakiness and setup cost.
- **Verification plan:** CI fails on a deliberately broken test; coverage report for booking/payment modules.

#### P2-11 — i18n drift: dead Arabic branches and German content shown to English users

- **Priority:** P2
- **Area:** i18n / Content model
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `nuxt.config.ts:56-76`; `app/pages/products/[slug].vue:23-24`; `app/pages/p/[slug].vue:46-47`; `app/components/app/ProductGrid.vue`; repository-wide `ar` branches
- **Evidence:** Only `de` and `en` locales are configured, yet roughly 750 `ar`/`ar-EG` branches and strings remain in pages/components (including `locale === 'ar' ? …` ternaries). Product/category schema stores `nameAr`/`nameEn`/`descriptionAr`/`descriptionEn`; the German locale displays the English fields. `Service.name`/`description` are documented as German-only, so English visitors see German service copy.
- **Root cause:** The product pivoted from an Arabic/English catalog to a German/English salon without cleaning the content model or locale branches.
- **Impact:** English UI shows German service names; German UI shows English product copy; dead branches increase bundle size and make locale changes error-prone; translators cannot supply German catalog content.
- **Fix:** Remove `ar` branches or reintroduce `ar` deliberately; add `nameDe`/`descriptionDe` fields (and admin inputs) or define an explicit fallback policy; add a lint rule/test that every configured locale has content.
- **Regression risk:** Schema migration and admin form changes; existing rows need backfill.
- **Verification plan:** Render catalog in `de`/`en` and assert language correctness; grep gate for unsupported locale codes.

#### P2-12 — Focus management gaps in overlays

- **Priority:** P2
- **Area:** Accessibility
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `app/components/app/AppNavbar.vue:62-84`, `:318-326`; `app/components/app/AppConsentBanner.vue:67-110`, `:163-180`; `app/pages/booking/manage/[token].vue:90-127`
- **Evidence:** The mobile drawer focuses the first control but does not trap Tab or restore focus to the trigger on close. The consent settings dialog has `role="dialog"`/`aria-modal` but no initial focus, trap, or restore. The cancel confirmation dialog renders inline without moving focus; Escape depends on focus being inside.
- **Root cause:** Visual modal patterns implemented without a dialog primitive.
- **Impact:** Keyboard and screen-reader users can tab into the page behind an overlay, lose context on close, and miss the confirmation dialog.
- **Fix:** Use a shared dialog primitive (or `@headlessui/vue`/`reka-ui`) with focus trap, initial focus, Escape, `aria-labelledby`, and focus restore; add `inert` to background content.
- **Regression risk:** Component behavior changes; test with keyboard/screen reader.
- **Verification plan:** Keyboard-only walkthrough of drawer, consent modal, cancel dialog; axe scan.

#### P2-13 — Meta CAPI: token in query, missing network signals, test-code risk

- **Priority:** P2
- **Area:** Security / Marketing integration
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** `server/utils/meta-capi.ts:37-100`, `:94`; `server/utils/booking-payments.ts:390-420`
- **Evidence:** The access token is sent as a `query.access_token` parameter. The server-side `Purchase` call omits `client_ip_address` and `client_user_agent`. `metaTestEventCode` from settings is appended whenever present, with no production guard.
- **Root cause:** Minimal CAPI implementation; test configuration is not environment-scoped.
- **Impact:** Tokens appear in proxy/access logs; event match quality is reduced; a leftover test code routes real production purchases into Meta Test Events, so campaigns lose conversion signal.
- **Fix:** Send the token in the `Authorization: Bearer` header where supported or redact query logs; persist/forward hashed IP/UA at booking time; block `test_event_code` when `NODE_ENV=production` or require an explicit toggle with warning.
- **Regression risk:** Meta API header support must be confirmed; IP/UA collection has privacy implications (consent-gated).
- **Verification plan:** Inspect outbound request (mock) for header/token placement; production-mode test rejects test code; Events Manager shows matched events.

#### P2-14 — Compose exposes PostgreSQL and applies migrations at app boot

- **Priority:** P2
- **Area:** Deployment / Security / Reliability
- **Confidence:** High
- **Status:** Confirmed (static; depends on host firewall)
- **Affected files:** `docker-compose.yml:4-24` (db ports/credentials), `:26-47` (app), `Dockerfile:33` (boot migration)
- **Evidence:** Postgres publishes `5439:5432` with hard-coded default credentials and a comment telling operators to firewall it. The app container runs `npx prisma migrate deploy` before starting; there is no migration job, backup gate, or replica coordination.
- **Root cause:** Local-development compose was reused as a production template.
- **Impact:** If deployed as-is, the database is reachable from the host/network with weak credentials. Multiple replicas can race migrations; a failed migration puts the app in a crash loop; no pre-migration backup.
- **Fix:** Remove the published DB port in production (or bind to localhost), require secrets from env/secret store, run migrations as a one-shot job with a backup/verification step, and gate app start on migration success.
- **Regression risk:** Local dev workflow needs an override compose file.
- **Verification plan:** `docker compose config` in prod overlay shows no published DB port; migration job runs once; app starts only after success.

#### P2-15 — `SiteSettings` singleton is addressed inconsistently

- **Priority:** P2
- **Area:** Data integrity / Configuration
- **Confidence:** Medium
- **Status:** Confirmed (static)
- **Affected files:** `server/api/settings/general.get.ts:7`, `contact.get.ts:6`, `store.get.ts:6`, `seo-public.get.ts`; admin upserts such as `settings/booking.put.ts:44`, `settings/payment.put.ts:33`
- **Evidence:** Public endpoints read `findUnique({ where: { id: 1 } })`; admin upserts use `findFirst()` to obtain an id and then upsert that row. If the singleton row is ever not `id = 1` (manual import, sequence reset, restored dump), admin writes succeed while public reads return `null`, blanking site settings.
- **Root cause:** No database-level singleton constraint or shared accessor.
- **Impact:** Whole-site configuration (names, logo, colors, contact, SEO, hero) can disappear from the storefront while the admin panel appears healthy.
- **Fix:** Enforce a single row (`id = 1`, check constraint or `findFirst` everywhere), centralize access in `getSiteSettings()`, and add a startup/health invariant.
- **Regression risk:** Existing non-1 rows need normalization.
- **Verification plan:** Rename the row id in a test DB; public endpoints still resolve or fail loudly; health check detects violation.

#### P2-16 — No image optimization pipeline

- **Priority:** P2
- **Area:** Performance
- **Confidence:** High
- **Status:** Confirmed (static)
- **Affected files:** 41 `<img>` usages across `app/`; `nuxt.config.ts` (no image module); `public/` (7.2 MB), `storage/` (18 MB)
- **Evidence:** Zero `NuxtImg`/`@nuxt/image`. 18 of 41 images lack `loading="lazy"`; most lack `width`/`height`, `srcset`, and modern-format negotiation. Uploaded images are re-encoded to WebP, but no responsive variants are generated except a single 1200 px hero variant.
- **Root cause:** Plain `<img>` markup with original-size assets.
- **Impact:** Larger LCP payloads, layout shift, and mobile bandwidth waste, especially on catalog/hero pages.
- **Fix:** Adopt `@nuxt/image` (or a build-time variant pipeline) with responsive widths, `sizes`, explicit dimensions, lazy loading below the fold, and priority/preload for the hero.
- **Regression risk:** Build/storage changes; remote pattern configuration.
- **Verification plan:** Lighthouse/WebPageTest before/after; CLS ≈ 0; no oversized image warnings.

---

### P3 — Maintainability, consistency, minor UX/perf

| ID | Finding | Evidence | Impact / Fix |
|---|---|---|---|
| P3-01 | Currency is rendered twice | `centsToEur()` returns e.g. `12,00 €`; `booking/[slug].vue:416`, `success.vue:134`, `failed.vue:48` append `{{ currency }}` | Shows “12,00 € EUR”. Remove the suffix or format with `Intl.NumberFormat` including currency. |
| P3-02 | Hardcoded `https://amir.com` | `index.vue:127` (JSON-LD), `p/[slug].vue:52,62,67` (share), `public/robots.txt` sitemap URL | Wrong canonical/share/sitemap host on any other domain. Use `runtimeConfig.public.siteUrl` consistently. |
| P3-03 | Dev styleguide shipped | `app/pages/dev/styleguide.vue` | Public design-system page in production. Gate by `NODE_ENV` or remove from the build. |
| P3-04 | 14 legacy admin redirect routes | `app/pages/admin/{banners,bookings/index,calendar,categories,expenses,inbox,my-bookings,products/index,reminders,schedule,services/index,staff,team,users}.vue` redirect to consolidated pages | Maintenance noise and redirect chains. Keep thin redirects only where external links exist; document a deprecation date. |
| P3-05 | `CANCELLED_BY_STAFF` is never written; status transitions are unenforced | `prisma/schema.prisma` status comment; `shared/booking.ts` `isStatusTransitionAllowed`; only cancel uses it | Dead state and inconsistent transitions. Either use the status or remove it; enforce transitions in every mutation. |
| P3-06 | Replaced receipts leave orphan files | `server/api/admin/expenses/[id]/receipt.post.ts:19` overwrites `receiptPath` without deleting the old file | Storage growth and retained personal/financial documents. Delete the previous file after a successful update (best-effort + audit). |
| P3-07 | Sitemap/robots incomplete | `server/routes/sitemap.xml.ts:12-17`; `public/robots.txt` | Missing `/about`, `/booking/*` (intentionally?), legal pages; hardcoded host. Add intentional entries and generate the sitemap URL from config. |
| P3-08 | Raw `readBody` in 19 admin handlers | `server/api/admin/{categories,products,settings,announcements,banners,notifications}/*` | Inconsistent validation; explicit mapping currently limits mass assignment, but a missed field can become writable. Migrate to Zod schemas. |
| P3-09 | Coarse page-level auth on dashboard/activity | `app/pages/admin/index.vue:19`, `activity.vue:13`; `server/api/admin/activity.get.ts:2` | Any authenticated user reaches the shell; APIs filter data, but the UI can look misleading. Add explicit permissions or documented staff behavior. |
| P3-10 | No backup automation or restore drill | `REMEDIATION_REPORT.md`; compose volumes; no backup service/cron in repo | Manual dumps only. Add scheduled `pg_dump` with encryption, retention, off-host storage, and a tested restore runbook. |
| P3-11 | Booking-number retry swallows all errors | `server/api/bookings/index.post.ts:183-215` | The loop retries any create failure three times and reports the last error, masking non-collision failures. Retry only on `P2002` for `bookingNumber`. |
| P3-12 | WhatsApp reminder opt-in is collected but reminders are email-only/manual | `app/pages/booking/[slug].vue:397`; `server/utils/reminders.ts:1-6`; `server/api/admin/reminders/index.get.ts` | Users may expect an automated WhatsApp message. Label it as “contact via WhatsApp” or implement sending. |
| P3-13 | Services are German-only | `prisma/schema.prisma:182-183` (`name`, `description` German only) | English UI shows German service copy. Add `nameEn`/`descriptionEn` or declare German-only content and hide the language switcher on service pages. |
| P3-14 | No fail-fast environment validation | `server/utils/auth.ts:26-31` checks the session secret per request; `server/utils/encryption.ts:5-10` throws on use | Misconfiguration surfaces as 500s on first login/payment rather than at boot. Add a startup validator for required secrets/URLs. |
| P3-15 | `storage/` binaries remain in Git history | `git rev-list --objects --all` lists `storage/banners`, `categories`, `hero`, `products` files | Repo bloat and stale media copies. Purge alongside the dump; keep runtime storage in volumes. |
| P3-16 | Documentation describes a different product | `Docs/00-master-plan.md`, `Docs/02-sitemap.md` describe AR/EN e-commerce; code is DE/EN salon booking | Onboarding and audits are misled. Rewrite the master plan/sitemap to match the current domain. |
| P3-17 | Health endpoint discloses DB status publicly | `server/api/health.get.ts` | Minor information disclosure. Require internal network/token or return only `{status}`. |
| P3-18 | No structured logging, error tracking, or metrics | `console.error` in sweeper/webhooks; no Sentry/OpenTelemetry | Incidents are invisible until users report them. Add structured logs with request/booking IDs, error tracking, and key metrics/alerts. |

---

### INFO — Verified strengths and observations

| ID | Observation |
|---|---|
| INFO-01 | **Admin API authorization coverage is complete.** All 115 admin handlers call `requireAuth`/`requirePermission` except login/logout; no unauthenticated admin mutation was found. |
| INFO-02 | **Privilege guards are solid.** Salary is masked unless `isSuper`; super-admin cannot be modified; self-demotion/self-deactivation is blocked; the last active admin cannot be removed. |
| INFO-03 | **Booking concurrency core is well designed.** Creation, confirmation, assignment, reschedule and manual booking share a salon+day advisory lock; idempotency keys are UUID-unique; duplicate submits collapse. |
| INFO-04 | **Payment verification is server-authoritative.** Stripe signatures and PayPal webhook verification are checked; amounts/currency are compared with server snapshots; mismatches are flagged for refund rather than confirmed. |
| INFO-05 | **Exactly-once customer mail.** Outbox dedupe keys, claim/lease semantics, retry cap, and a 60-second sweeper prevent duplicate sends; failures do not break booking flows. |
| INFO-06 | **Upload hardening is good.** MIME allowlists, size caps, `sharp` re-encode, UUID filenames, and path-traversal guards are present; non-image documents are restricted to PDF. |
| INFO-07 | **i18n key parity is exact.** 642 keys in both `de.json` and `en.json`, no missing/extra keys. |
| INFO-08 | **Accessibility baseline is present.** A skip link exists; public images have `alt` (41/41); ~210 `aria-label`s; visible focus rings; semantic landmarks on major pages. |
| INFO-09 | **Secrets at rest are encrypted.** Stripe/PayPal/mail/Meta credentials use AES-256-GCM; admin GET endpoints mask secret fields and use select whitelists. |
| INFO-10 | **Repository secrets hygiene improved.** No `.env` exists in Git history; `.gitignore` covers `.env`, dumps, SQL, and storage; seed scripts refuse default credentials. |
| INFO-11 | **Schema/indexing is deliberate.** Booking lookups have indexes on `startsAt`, `(status, startsAt)`, `(paymentStatus, holdExpiresAt)`, `(assignedStaffId, startsAt)`; 38 ordered migrations. |
| INFO-12 | **SEO/error basics exist.** Dynamic sitemap, robots.txt, JSON-LD Organization, per-page titles/descriptions, canonical site URL config, sanitized production errors, and a DB-aware health endpoint. |

---

## 7. Route-by-Route Review

Legend: **Public** = anonymous; **Guest** = anonymous but token/flow-scoped; **Admin** = session + permission; **Redirect** = shim to a consolidated page.

### 7.1 Storefront

| Route | Access | Purpose | Audit notes |
|---|---|---|---|
| `/` | Public | Home: hero slides, featured services/products, testimonials, CTA | Strong visual system; JSON-LD hardcodes `amir.com`; hero uses a single 1200 px variant; settings fetch can return `null` (P2-15). |
| `/about` | Public | Brand story, team, contact CTA | WhatsApp helper rewrites Egyptian numbers (`useWhatsApp`); service names may be German in EN (P2-11). |
| `/contact` | Public | Contact form + map/hours | POST `/api/contact` is rate-limited (5/min/IP); no CAPTCHA; honeypot absent. |
| `/products` | Public | Category/product catalog with filters | Uses public `/api/categories`; no SSR pagination issues found; images unoptimized (P2-16). |
| `/products/[slug]` | Public | **Category** listing (not product detail) | Route naming is misleading; fetches `/api/categories/:slug`; 404 on error. Product detail is `/p/[slug]`. |
| `/p/[slug]` | Public | Product detail, gallery, documents, share | `v-html` renders `description` (P2-06 risk); share text/link hardcodes `amir.com` (P3-02); documents open in a new tab. |
| `/services` | Public | Service catalog by section | German-only service fields (P3-13); prices formatted with `centsToEur`. |
| `/impressum` | Public | Legal imprint | **Placeholder** (P1-01). |
| `/datenschutz` | Public | Privacy policy | **Placeholder**; linked from consent banner (P1-01). |
| `/agb` | Public | Terms | **Placeholder**; not linked from booking/footer (P1-01). |
| `/stornierung` | Public | Cancellation terms | **Placeholder**; not linked from booking/footer (P1-01). |
| `/dev/styleguide` | Public | Design-system demo | Shipped to production (P3-03). |

### 7.2 Booking funnel

| Route | Access | Purpose | Audit notes |
|---|---|---|---|
| `/booking/[slug]` | Guest | Service booking: staff, date, slot, details, deposit | UTC default date (P2-04); no AGB/privacy checkbox (P1-01); duplicated currency (P3-01); WhatsApp opt-in mismatch (P3-12); idempotency key handled correctly. |
| `/booking/success` | Guest (token) | Poll payment/confirmation status | Polls status endpoint; EN shows German dates (P2-05); duplicated currency (P3-01); no PII in status response. |
| `/booking/failed` | Guest (token) | Failure/expiry guidance with retry | Token-scoped; duplicated currency (P3-01); retry path mints a new provider session. |
| `/booking/pay/[token]` | Guest (token) | Retry payment for a PENDING booking | Rejects PAID/non-PENDING; creates a fresh Stripe/PayPal attempt; locale-aware. |
| `/booking/manage/[token]` | Guest (token) | View/cancel booking within window | Cancel dialog lacks focus management (P2-12); refund messaging depends on policy; token is unguessable. |

### 7.3 Admin (27)

| Route | Access | Purpose | Audit notes |
|---|---|---|---|
| `/admin/login` | Public | Admin login | 5/min/IP; generic errors; no MFA/lockout (P2-07); no CSRF token (SameSite=lax mitigates POST). |
| `/admin` | Admin | Dashboard: counts, revenue, queue | `requireAuth` only; metrics filtered by `bookings.view_all`; staff redirected to own bookings. |
| `/admin/appointments` | `bookings.view_all` or `view_own` | Tabs: calendar, reminders, my bookings, all bookings | Primary booking workspace; tab permissions handled client-side. |
| `/admin/bookings/[id]` | `bookings.view_all` or `view_own` | Booking detail, assign, reschedule, cancel, refund | API enforces ownership for `view_own`; refund permissions separate. |
| `/admin/catalog` | `products.view`/`categories.manage` | Products + categories tabs | Consolidated page; robust empty/error states. |
| `/admin/products/new` | `products.manage` | Create product | Requires Arabic + English names despite DE/EN UI (P2-11). |
| `/admin/products/[id]/edit` | `products.manage` | Edit product, media, SEO | Rich editor preview uses `v-html` (admin-authored). |
| `/admin/products` | Admin | Redirect → catalog `tab=products` | Legacy shim (P3-04). |
| `/admin/salon` | `services.manage`/`users.manage`/`schedule.manage` | Services, team, schedule | Hosts the schedule panel with the P1-03 overwrite risk. |
| `/admin/settings` | settings/banners permissions | Business, payment, mail, Meta, website | Secret fields masked; dirty-state guard exists; some settings pages can lose unsaved edits (P3). |
| `/admin/finance` | expenses/refund permissions | Expenses, refunds | Expense totals/export truncate (P2-03). |
| `/admin/website` | `inbox.manage`/`banners.manage` | Inbox + banners | Tab visibility follows permissions. |
| `/admin/notifications` | `notifications.view` | In-app notification list | Push registration separate. |
| `/admin/activity` | Admin (authenticated) | Audit log | API filters non-`view_all` users to their own entries; page permission is coarse (P3-09). |
| `/admin/bookings` | Admin | Redirect → appointments `tab=bookings` | Legacy shim (P3-04). |
| `/admin/calendar` | Admin | Redirect → appointments `tab=calendar` | Legacy shim. |
| `/admin/reminders` | Admin | Redirect → appointments `tab=reminders` | Legacy shim. |
| `/admin/my-bookings` | Admin | Redirect → appointments `tab=my-bookings` | Legacy shim. |
| `/admin/categories` | Admin | Redirect → catalog `tab=categories` | Legacy shim. |
| `/admin/services` | Admin | Redirect → salon `tab=services` | Legacy shim. |
| `/admin/staff` | Admin | Redirect → salon `tab=team&teamTab=staff` | Legacy shim. |
| `/admin/team` | Admin | Redirect → salon `tab=team` | Legacy shim. |
| `/admin/users` | Admin | Redirect → salon `tab=team&teamTab=users` | Legacy shim. |
| `/admin/schedule` | Admin | Redirect → salon `tab=schedule` | Legacy shim. |
| `/admin/expenses` | Admin | Redirect → finance `tab=expenses` | Legacy shim. |
| `/admin/inbox` | Admin | Redirect → website `tab=inbox` | Legacy shim. |
| `/admin/banners` | Admin | Redirect → website/settings (preserves announcement/ticker tabs) | Legacy shim with query translation. |

### 7.4 Non-page routes

| Route | Method | Access | Notes |
|---|---|---|---|
| `/sitemap.xml` | GET | Public | Static + categories + products; hardcoded fallback host; omits legal/about. |
| `/uploads/[...path]` | GET | Public or admin | Public scopes allowlisted; private scopes auth-checked then publicly cached (P1-05). |
| `/api/health` | GET | Public | DB `SELECT 1`; 503 on failure; discloses DB status (P3-17). |

---

## 8. API Review

### 8.1 Authentication & authorization matrix

| Group | Handlers | Guard |
|---|---:|---|
| Admin auth | 3 | Login public (rate-limited); logout authenticated; session endpoint authenticated |
| Admin settings | 24 | `settings.business` / `settings.payment` / `settings.meta` / `banners.manage` split |
| Admin products | 15 | `products.view` / `products.manage` |
| Admin bookings | 11 | `bookings.view_all`/`view_own`/`assign`/`cancel_own`/`refund_handle`/`refund_issue` |
| Admin staff | 10 | `users.manage` / `schedule.manage` / `services.manage` |
| Admin services/categories/banners/announcements | 20 | Matching manage/view permissions |
| Admin expenses/expense-categories | 10 | `expenses.view`/`manage`/`export` |
| Admin users | 4 | `users.manage` + super/last-admin/self guards |
| Admin inbox/notifications/closures/working-hours | 14 | Matching manage/view permissions |
| Admin activity/dashboard/calendar/reminders | 4 | `requireAuth` + data filtering |
| Public catalog/settings/staff | 16 | Public, read-only, selected fields |
| Public booking/contact/availability | 9 | Guest; rate-limited; token/idempotency scoped |
| Webhooks | 2 | Signature verification, raw body, idempotent confirmation |
| Other | 5 | FCM config, service images, health, PayPal return, sitemap |

### 8.2 Notable API behaviors verified

- **Input validation:** 27 Zod schemas cover booking, settings, staff, products (partially), expenses, refunds, and auth-adjacent flows. `parseBody` returns a 400 with the first issue path/message. Nineteen legacy admin handlers still use raw `readBody` with explicit mapping (P3-08).
- **Rate limits:** login 5/min, contact 5/min, booking create/pay 60/min, availability 30/min, autocomplete 30/min, facets 20/min, manage-cancel 10/min, expense export 10/min, mail test 5/min.
- **Public data minimization:** `/api/bookings/status/[token]` returns booking number, payment/booking status, service name, duration, slot, deposit, currency, event ID — no name/phone/email. `/api/staff` exposes only public profile fields.
- **Webhooks:** Stripe signature verification uses the raw body and configured secret; PayPal verification uses the PayPal verify API. Replays and mismatches are recorded, not silently ignored.
- **Idempotency:** Booking creation accepts a UUID idempotency key with a unique DB constraint; payment retries mint new provider sessions but never mutate a PAID booking.
- **Error handling:** Production errors are sanitized via `server/error-handler.ts`; 404 responses do not expose stack traces.

### 8.3 API gaps

- No versioning or OpenAPI/schema publication.
- No pagination contract consistency: some lists paginate, expenses cap silently, sitemap caps at 5,000.
- No CSRF tokens for admin mutations; relies on `SameSite=lax` and JSON content types.
- No request-ID propagation in logs or error responses.
- No per-account lockout or MFA challenge endpoint.

---

## 9. Database Review

### 9.1 Schema strengths

- **Money is integer cents** (`priceAbCents`, `depositCents`, `amountCents`), avoiding floating-point drift.
- **Snapshots protect history:** `durationMinSnapshot`, `priceSnapshotCents`, `depositCents` are stored on the booking, so later service edits do not rewrite past appointments.
- **Uniqueness where it matters:** `bookingNumber`, `idempotencyKey`, `publicToken`, `manageToken`, `providerRef`, `(staffId, serviceId)`, `(weekday)`.
- **Booking indexes match query patterns:** `startsAt`, `(status, startsAt)`, `(paymentStatus, holdExpiresAt)`, `(assignedStaffId, startsAt)`, `(serviceId, startsAt)`.
- **Referential behavior is deliberate:** `Booking.service` is `Restrict` (cannot delete a booked service); `assignedStaff` is `SetNull`; assignment history is preserved without a user FK.
- **Audit and outbox tables** provide traceability and exactly-once side effects.

### 9.2 Data-integrity gaps

| Gap | Detail | Risk |
|---|---|---|
| Status enums are strings | `Booking.status`, `paymentStatus`, `refundStatus`, `source`, `staffChoice` are unconstrained strings | Invalid states can be written by future code/manual SQL; no DB-level guarantee. |
| No singleton constraint on `SiteSettings` | Public reads assume `id = 1`; admin uses `findFirst` | Settings can silently blank (P2-15). |
| `WorkingHours.weekday` uniqueness only | No check that `openMin < closeMin` at DB level (Zod enforces at API) | Manual writes can create invalid hours. |
| `StaffSchedule`/time off overlap | No exclusion constraint on overlapping ranges | Application logic must prevent overlaps; absence race (P2-02). |
| Expense soft delete | `deletedAt` used, but aggregates/receipts must filter consistently | A missed filter would include deleted expenses. |
| No retention policy | Bookings, contact messages, audit logs, and outbox rows grow indefinitely | GDPR storage limitation and table bloat. |
| No PII encryption at rest | Names/phones/emails are plain columns | DB dump exposure (P1-02) is more damaging. |

### 9.3 Migrations

- 38 migrations are ordered and mostly additive; commerce was removed and the booking domain added.
- The app applies migrations at container boot (`prisma migrate deploy`), which is simple but unsafe for multi-replica or zero-downtime deploys (P2-14).
- No down-migration or rollback policy is documented.
- No migration test job or shadow-DB validation in CI (P2-10).

### 9.4 Recommended DB work

1. Enforce booking status/payment status with enums or check constraints.
2. Add a singleton constraint/accessor for `SiteSettings`.
3. Add exclusion constraints (or serialized locks) for staff time off vs bookings.
4. Add retention jobs for outbox, audit logs, contact messages, and expired holds.
5. Move migrations to a one-shot deploy job with a pre-migration backup.

---

## 10. Security Review

### 10.1 Authentication

| Control | Status |
|---|---|
| Password hashing | bcrypt, 10 rounds — acceptable, consider 12 |
| Seed credentials | No defaults; env-required, min length 8 |
| Login enumeration | Generic error message; inactive users treated as invalid |
| Brute-force protection | Per-IP 5/min + admin alert after 5 failures/10 min; **no lockout/MFA** (P2-07) |
| Session storage | Encrypted httpOnly cookie, `sameSite=lax`, `secure` on HTTPS/siteUrl, 7 days |
| Session revocation | **None** beyond `isActive` (P2-08) |
| Password rotation | **None** in product (P2-07) |

### 10.2 Authorization

- Role defaults: `ADMIN` all permissions, `MANAGER` operational set, `STAFF` own bookings/completion/notifications.
- Extra grants are validated against `ALL_PERMISSIONS`; unknown stored keys are ignored.
- Page-level `requiredPermission` + UI `useAdminCan` + API `requirePermission` provide three layers.
- Ownership checks exist for staff booking detail/cancel; refunds require dedicated permissions.
- Salary is visible only to super-admin; super-admin cannot be modified; last-admin/self-modification guards are implemented.

**Gaps:** coarse upload authorization (P1-05), coarse activity/dashboard page permissions (P3-09), no CSRF tokens (mitigated by SameSite/JSON), and no field-level audit for permission changes beyond the audit log.

### 10.3 Transport & headers

- HTTPS is assumed via proxy; session `secure` is set when `x-forwarded-proto=https` or `siteUrl` is HTTPS.
- **No CSP/HSTS/nosniff/frame/referrer/permissions headers in the repo** (P2-06).
- `x-forwarded-for` is trusted without a proxy allowlist (P2-09).
- Uploads set `content-type` from an extension allowlist; no `Content-Disposition` for documents (inline rendering of PDFs is expected).

### 10.4 File uploads

- Images: JPEG/PNG/WebP, 5 MB cap, `sharp` re-encode (strips metadata), UUID names.
- Video: MP4/WebM/OGG, 50 MB cap; documents: PDF, 10 MB cap.
- Path traversal guarded by segment filtering + `resolveUploadPath` containment.
- Private scopes require a session, but permissions are broad and caching is wrong (P1-05).
- No antivirus/content-disarm for PDFs; no image decompression-bomb limit beyond `sharp` defaults.

### 10.5 Payments & secrets

- Gateway secrets are AES-256-GCM encrypted with a 32-byte hex key; decryption failures are handled.
- Admin settings GET uses select whitelists and masks secrets.
- Stripe webhook signatures and PayPal verification are enforced; amounts/currencies are checked against snapshots.
- Refunds are manual/flagged, not auto-executed — a deliberate safety choice.
- Meta CAPI token handling and test-code risk (P2-13).

### 10.6 Privacy

- Marketing consent gates browser Pixel and server CAPI; `fbp`/`fbc` are stored only with consent.
- Consent cookie is versioned (v1), 180 days, `sameSite=lax`.
- **Privacy policy is a placeholder** and booking consent is absent (P1-01).
- No documented retention/erasure workflow for booking/contact data.
- Production dump in Git history is a potential personal-data breach (P1-02).

### 10.7 Security priorities

1. Legal/consent + dump purge + key rotation (P1-01, P1-02).
2. Private upload caching/authorization (P1-05).
3. Credential lifecycle + session revocation (P2-07, P2-08).
4. Security headers + trusted-proxy rate limiting (P2-06, P2-09).
5. MFA for super-admin and financial permissions.

---

## 11. Performance Review

### 11.1 What is already good

- Nitro `compressPublicAssets` + `minify` enabled.
- Self-hosted fonts (no third-party font round-trip).
- Public settings/catalog endpoints use `defineCachedEventHandler` in several places.
- Images uploaded as WebP; hero has a 1200 px variant.
- SSR pages fetch in parallel with `Promise.all` where independent.
- No heavy client-side charting/animation library observed; icons are tree-shaken `lucide-vue-next`.

### 11.2 Risks

| Risk | Evidence | Impact |
|---|---|---|
| Raw `<img>` everywhere | 41 tags, 0 `NuxtImg`, 18 without lazy | Large LCP, CLS, mobile bandwidth (P2-16). |
| No width/height | Most `<img>` lack dimensions | Layout shift on catalog/hero. |
| 18 MB runtime storage | `storage/` size at audit | Slow first paint for uncached media; backup size. |
| Uncached public endpoints | Availability, staff, products list may hit DB per request | Booking page latency under load. |
| Client-side admin polling | Calendar/notifications poll on intervals | Admin tab load and DB queries; no pause when hidden (P3). |
| In-memory rate limiter | Per-process map | Cannot scale horizontally without weakening limits (P2-09). |
| Boot migrations | `prisma migrate deploy` before start | Slow cold starts; rollout risk (P2-14). |
| Single Postgres instance | Compose has one DB, no pooler | Connection exhaustion under many Nitro workers; no read replica. |

### 11.3 Measurement plan (requires approval)

- Lighthouse (mobile/desktop) for `/`, `/products`, `/p/[slug]`, `/booking/[slug]`, `/admin`.
- WebPageTest for LCP/CLS/TBT with cold and warm cache.
- `EXPLAIN (ANALYZE, BUFFERS)` for availability, booking list, expense aggregates, and sitemap queries.
- Load test booking availability/creation with realistic concurrency (advisory-lock contention).
- Postgres connection/CPU/memory during a 100-VU browse + 10 booking/min scenario.

No performance measurements were executed for this report.

---

## 12. UX, Accessibility & Internationalization

### 12.1 Strengths

- Consistent design tokens, typography scale, spacing, and dark-mode variables.
- Visible focus rings on most interactive elements.
- Skip link present; semantic headings/landmarks on major pages.
- Public images have `alt` (41/41); ~210 `aria-label`s; `aria-current` on navigation.
- Status/error regions use `role="status"`/`role="alert"` in booking/manage flows.
- i18n keys are complete and symmetric (642/642).
- Reduced-motion handling exists in global CSS (`prefers-reduced-motion`).
- Mobile navigation, cookie banner, and booking flow are responsive.

### 12.2 Accessibility gaps

| Gap | Evidence | Fix |
|---|---|---|
| No focus trap/restore in mobile drawer | `AppNavbar.vue:62-84` | Dialog primitive or manual Tab loop + restore. |
| Consent dialog no initial focus/trap | `AppConsentBanner.vue:67-110` | Focus title/first control; trap; restore. |
| Cancel dialog no focus move | `booking/manage/[token].vue:90-127` | Focus heading/first button; Escape/restore. |
| Some icon-only buttons lack labels | Spot checks in admin panels | Audit with axe; add `aria-label`. |
| Color contrast in dark mode | Several muted-on-dark combinations | Automated contrast scan; raise tokens. |
| Form errors not always linked | Booking/settings forms | `aria-describedby`, `aria-invalid`, error summary. |
| Tables lack captions/scope in places | Admin lists | Add `<caption>`, `scope="col"`, sortable announcements. |

### 12.3 UX issues

- **Booking:** UTC default date (P2-04); duplicated currency (P3-01); no terms/privacy acknowledgement (P1-01); WhatsApp opt-in label overpromises (P3-12).
- **Success/failed:** EN customers see German dates (P2-05); retry path is clear but token context can be lost if the user navigates away.
- **Legal:** All four pages are placeholders (P1-01); footer offers no legal navigation.
- **Admin schedule:** overwrite risk (P1-03); no unsaved-changes guard on this panel.
- **Admin settings:** dirty-state guard exists, but some tabs still lose edits on navigation (prior review P1-2); verify after refactor.
- **Catalog:** `/products/[slug]` is a category page, which confuses users and analytics; consider `/categories/[slug]` with redirects.
- **Language switcher:** visible in a German-only launch build because launch mode is build-time (P1-06).

### 12.4 i18n

- Locales: `de`, `en`; default `en` unless launch mode; `prefix_except_default`.
- Arabic remnants: ~750 branches/strings are dead code (P2-11).
- Content model: products/categories store AR/EN fields; DE uses EN; services are German-only (P2-11, P3-13).
- Dates: mixed `de-DE`/`en-US`/`ar-EG` formatting; server mail hardcodes Berlin (P2-05).
- Currency: `centsToEur` always uses `de-DE` grouping and appends `€`, then some templates append the currency code (P3-01).
- No pluralization/RTL support is needed for DE/EN, but `dir` is hardcoded `ltr` per locale (correct).

---

## 13. Reliability & Business Workflows

### 13.1 Booking lifecycle — verified behavior

| Stage | Behavior | Assessment |
|---|---|---|
| Availability | Salon hours, closures, staff schedule, time off, paid bookings, unexpired holds, legacy rows | Correct and indexed; no caching observed. |
| Create | Advisory day lock, salon open/hours/grid checks, horizon check, idempotency, hold TTL | Strong. |
| Pay | New provider session per attempt; PAID/non-PENDING rejected; amount from snapshot | Strong. |
| Confirm | Advisory lock, replay detection, amount/currency proof, PENDING flip, EXPIRED/FAILED refund path | Strong except PENDING `free === false` (P1-04). |
| Assign | Paid-only, needs-refund block, staff active/bookable/service/schedule/time-off checks, day lock | Strong; absence race (P2-02). |
| Reschedule | Day lock, overlap re-check, customer notification | Strong. |
| Cancel | Window check, status transition guard, refund decision, notifications | Strong. |
| Remind | Dedupe key, email only, sweeper | Good; delivery depends on mail provider (P2-01). |
| Complete | Staff/admin completion, audit | Adequate. |

### 13.2 Failure modes

| Failure | Current behavior | Risk |
|---|---|---|
| Mail provider down | Outbox retries up to 10, then marks failed | Good, but `log` provider never fails (P2-01). |
| Payment provider down | Booking stays PENDING until hold expiry; retry creates a new session | Acceptable. |
| Webhook delayed past hold expiry | EXPIRED path refunds if slot taken; PENDING gap can double-book (P1-04) | High. |
| Sweeper crash | Holds/reminders/mail stall; availability lazily expires holds | Medium; no alert. |
| DB unavailable | Health 503; requests 500; outbox/mail stop | Medium; no retry/backoff beyond outbox. |
| Migration failure | Container crashes before start | High; no rollback/backup gate (P2-14). |
| Disk full (uploads) | Upload fails; existing files served | Medium; no quota/monitoring. |
| Clock/timezone drift | Slot validation and mail times off | Medium; timezone centralization needed (P2-05). |

### 13.3 Concurrency

- Advisory locks: create, confirm, assign, reschedule, manual booking use `pg_advisory_xact_lock(hashtext('salon'), hashtext(day))`.
- Not covered: `recordAbsence` (P2-02), refunds, expense writes.
- Idempotency: booking UUID + provider refs + outbox dedupe keys.
- Lost-race handling: confirmation uses `updateMany` with `paymentStatus: PENDING` and treats `count = 0` as already-paid.
- Multi-instance sweeper is described as harmless (idempotent updates, outbox claims), but rate limiting and login-attempt tracking are process-local.

### 13.4 Data lifecycle

- Soft delete for expenses; hard delete for categories/products with relations guarded.
- No retention/erasure automation for bookings, contact messages, audit logs, outbox.
- No documented backup/restore cadence or RPO/RTO.
- Storage cleanup on entity deletion is partial (P3-06).

---

## 14. Deployment & Operations

### 14.1 Current deployment shape

- Multi-stage Dockerfile: deps → build → runner (`node:22-alpine`, non-root `appuser`).
- Runtime copies `.output`, `prisma`, `package.json`, and all `node_modules` (large image; Prisma CLI needed for boot migrations).
- Compose runs `app` + `postgres:16-alpine`, named volumes for DB, uploads, storage.
- App exposes 3000 only to the internal/proxy networks; DB publishes 5439 (P2-14).
- Healthcheck hits `/api/health` (exists, DB-aware) — correct.
- No reverse proxy/TLS configuration in the repo; assumed external.

### 14.2 Deployment risks

| Risk | Detail | Priority |
|---|---|---|
| Launch mode mismatch | Build-time i18n vs runtime env | P1-06 |
| Boot migrations | Race/crash-loop/no backup | P2-14 |
| DB port/credentials | Published port + defaults | P2-14 |
| Missing headers | No CSP/HSTS/etc. in repo | P2-06 |
| Image size | All `node_modules` copied, no prune | P3 |
| No CI/CD | Manual build/push/deploy | P2-10 |
| No observability | Console logs only; no error tracker/metrics | P3-18 |
| No backup automation | Manual dumps; dump in history | P3-10, P1-02 |
| Env validation | Fails at first use, not boot | P3-14 |

### 14.3 Operational runbooks missing

- Secret rotation (session, encryption, DB, gateways, Meta).
- Backup/restore and disaster recovery.
- Mail provider failover and outbox replay.
- Payment reconciliation (Stripe/PayPal vs bookings/refunds).
- Incident response for a leaked admin cookie or DB dump.
- Deployment rollback and migration rollback.

### 14.4 Recommended deployment target

1. Build image with explicit launch-mode build arg; tag immutably.
2. Run migrations as a one-shot job after an encrypted backup.
3. Deploy app replicas behind a proxy that terminates TLS, adds security headers, and enforces trusted-proxy IP handling.
4. Keep Postgres private; use a managed instance or at minimum no published port + strong secrets.
5. Add health/readiness probes, structured logs, error tracking, and alerts (5xx, outbox failures, mail failures, payment mismatches).
6. Schedule encrypted off-host backups with restore drills.

---

## 15. Strengths & Passed Checks

The following were explicitly verified and should not be regressed:

1. **Authorization coverage:** 115/115 admin handlers guarded; no unauthenticated admin mutation.
2. **Privilege boundaries:** salary masking, super-admin immutability, last-admin guard, self-modification guard.
3. **Booking serialization:** advisory locks across create/confirm/assign/reschedule/manual.
4. **Idempotency:** booking UUID, provider references, outbox dedupe keys.
5. **Payment proof:** Stripe signature + PayPal verification + amount/currency comparison.
6. **Refund safety:** unhonored money is flagged, never silently dropped (except the PENDING gap in P1-04).
7. **Exactly-once mail:** outbox claim/lease/retry semantics.
8. **Upload validation:** MIME allowlist, size caps, `sharp` re-encode, traversal guard.
9. **Secret handling:** AES-256-GCM at rest, masked admin responses, select whitelists.
10. **Seed hygiene:** no default credentials; env-required strong password.
11. **i18n parity:** 642/642 keys.
12. **Accessibility baseline:** skip link, alt coverage, aria labels, focus rings, reduced motion.
13. **SEO basics:** sitemap, robots, JSON-LD, per-page meta, canonical config.
14. **Error hygiene:** sanitized production errors; no stack traces in 404s.
15. **DB design:** integer cents, snapshots, unique constraints, booking indexes, audit log.
16. **Repository hygiene improved:** no `.env` in history; dumps/SQL/storage ignored going forward.

---

## 16. Metrics & Coverage

### 16.1 Codebase metrics

| Metric | Value |
|---|---:|
| Pages | 44 |
| Admin pages | 27 |
| Admin primary pages | ~10 |
| Legacy admin shims | 14 |
| Components | 73 (41 admin, 12 storefront, 20 shared) |
| Composables | 13 |
| API handlers | 147 |
| Server routes | 2 |
| Admin API handlers | 115 |
| Public/webhook handlers | 32 |
| Prisma models | 30 |
| Migrations | 38 |
| Zod schemas | 27 |
| i18n keys (per locale) | 642 |
| `<img>` tags / lazy / `NuxtImg` | 41 / 23 / 0 |
| `aria-label` occurrences | ~210 |
| Public image alt coverage | 41/41 |
| Server TypeScript files | ~177 |
| Tests / CI workflows | 0 / 0 |

### 16.2 Audit coverage

| Area | Coverage | Method |
|---|---|---|
| Routes/pages | 44/44 | Template + script review |
| API handlers | 149/149 inventoried; security-critical subset read in full | Static trace |
| Auth/authz utilities | Full | Read |
| Booking/payment/refund/outbox/reminder/absence flows | Full | Read + state trace |
| Prisma schema/migrations | Full schema; migration list | Read |
| Uploads/storage | Full | Read |
| Public pages | Full for booking/legal/catalog; template-level for others | Read |
| Admin pages | Full for schedule/settings/login; template-level for panels | Read |
| i18n | Key parity + locale branch sampling | Script + grep |
| Docker/deploy | Full | Read |
| Git history hygiene | Object-level checks | Git commands |
| Runtime behavior | **Not executed** | See §18 |

### 16.3 Findings by area

| Area | P1 | P2 | P3 |
|---|---:|---:|---:|
| Security | 2 | 5 | 2 |
| Compliance/legal | 1 | 0 | 1 |
| Payments/booking | 1 | 2 | 3 |
| Admin correctness | 1 | 0 | 2 |
| Deployment/ops | 1 | 2 | 4 |
| UX/a11y/i18n | 0 | 3 | 3 |
| Performance | 0 | 1 | 1 |
| Data/reporting | 0 | 2 | 1 |
| Quality/docs | 0 | 1 | 1 |

---

## 17. Prioritized Remediation Roadmap

### Phase 0 — Before any public launch (P1)

1. **Legal & consent (P1-01):** publish Impressum/Datenschutz/AGB/Stornierung; add footer links; add required AGB+privacy checkbox with version/timestamp; update consent policy version.
2. **Purge the dump and rotate (P1-02):** rewrite history, force-push, invalidate forks/caches, rotate DB/admin/session/encryption/gateway secrets; assess breach notification.
3. **Fix schedule overwrite (P1-03):** error state, loaded/dirty gate, disable Save until loaded, optimistic concurrency.
4. **Fix paid-slot race (P1-04):** `free === false` in the PENDING path must flag refund/notify or atomically reassign; never clear `needsRefund`.
5. **Fix private upload caching (P1-05):** `private, no-store` + `Vary: Cookie`; split permissions per scope.
6. **Make launch mode reproducible (P1-06):** Docker build arg or runtime locale config; add a smoke assertion.

### Phase 1 — First hardening sprint (P2)

1. Mail provider production guard + health badge (P2-01).
2. Absence advisory lock + overlap revalidation (P2-02).
3. Expense aggregates/pagination/export streaming (P2-03).
4. Booking date in salon timezone + min/max (P2-04).
5. Central date/time formatter using settings timezone (P2-05).
6. Security headers (CSP report-only first) (P2-06).
7. Password change/reset + MFA + lockout (P2-07).
8. Session version/revocation + logout-all (P2-08).
9. Trusted-proxy IP + shared rate-limit store (P2-09).
10. Test/CI foundation (P2-10).
11. Remove dead `ar` branches; add DE content fields/fallback policy (P2-11).
12. Dialog focus trap/restore (P2-12).
13. Meta CAPI token/header, IP/UA, production test-code guard (P2-13).
14. Compose prod overlay + migration job + backup gate (P2-14).
15. Settings singleton invariant (P2-15).
16. Image pipeline (`@nuxt/image`, dimensions, lazy, hero priority) (P2-16).

### Phase 2 — Quality & operations (P3)

- Currency formatting, hardcoded domain, dev page, legacy shims, dead status, orphan receipts, sitemap/robots, raw body validation, page permissions, backups, booking-number retry, WhatsApp labeling, EN service content, env validation, storage history purge, docs rewrite, health endpoint hardening, observability.

### Phase 3 — Continuous improvement

- OpenAPI/schema publication, load testing, DB retention jobs, Postgres pooling/replicas, CSP enforcement, dependency scanning, restore drills, accessibility audits, Core Web Vitals budgets.

---

## 18. Limitations & Requires Verification

### 18.1 Limitations of this audit

- **Static only.** No build, test, server, browser, Lighthouse, load test, migration, or runtime probe was executed.
- Runtime behavior depends on deployment topology (proxy, CDN, TLS, env, mail provider, payment mode) that is not in the repository.
- The production dump was identified by Git metadata and size; its contents were **not** inspected, by policy. The exact PII/secret exposure is therefore unconfirmed.
- No live Stripe/PayPal sandbox transactions were performed; payment correctness is inferred from code paths.
- No screen-reader or automated axe run; accessibility findings are code-level.
- No database `EXPLAIN`/profiling; performance findings are architectural.
- Component/page review depth varies: booking, legal, schedule, settings, and security utilities were read in full; some admin panels were reviewed at template/endpoint level.
- Prior reports in the repository may describe an older product (AR/EN e-commerce) and were not treated as current truth.

### 18.2 Requires runtime verification (approval required)

| # | Check | Why |
|---|---|---|
| 1 | Build with/without `NUXT_PUBLIC_LAUNCH_MODE` and inspect HTML `lang`, routes, switcher | Confirm P1-06 |
| 2 | Header scan at the edge (CSP/HSTS/nosniff/frame/referrer) | Confirm P2-06 and proxy behavior |
| 3 | Private upload request through the actual CDN/proxy, then unauthenticated replay | Confirm P1-05 impact |
| 4 | Stripe/PayPal sandbox: success, delayed webhook, duplicate webhook, amount mismatch, expired hold + competing booking | Confirm P1-04 and refund paths |
| 5 | Mail provider test: `log` vs HTTP, outbox failure/retry, reminder delivery | Confirm P2-01 |
| 6 | Concurrency: absence + assign/confirm in two DB sessions | Confirm P2-02 |
| 7 | Expense dataset >1,000/10,000 rows vs SQL aggregates | Confirm P2-03 |
| 8 | Clock at 00:30 Europe/Berlin; date default and slot list | Confirm P2-04 |
| 9 | Password change/logout-all/MFA/lockout flows | Confirm P2-07/P2-08 (once implemented) |
| 10 | Spoofed `X-Forwarded-For` against login/contact limits | Confirm P2-09 |
| 11 | Lighthouse/CWV on `/`, `/products`, `/p/[slug]`, `/booking/[slug]`, `/admin` | Quantify P2-16 |
| 12 | axe + keyboard walkthrough of drawer/consent/cancel | Confirm P2-12 |
| 13 | Git history scan after purge (`git rev-list --objects --all`) | Verify P1-02 remediation |
| 14 | Migration job on a restored backup; rollback drill | Verify P2-14 |

### 18.3 Confirmation of constraints observed

- No source, configuration, dependency, environment, database, or infrastructure files were modified.
- No packages were installed; no migrations, seeds, commits, branches, or pushes were made.
- No build, test suite, lint/typecheck, server, browser automation, Lighthouse, or load test was run.
- No secret, token, credential, or PII value is reproduced in this report.

---

*End of report.*
