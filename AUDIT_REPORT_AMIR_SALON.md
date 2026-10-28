# Audit Report — AMIR Frisur & Kosmetik Studio

**Date:** 2026-10-19
**Scope:** Nuxt 4 + Prisma/PostgreSQL salon booking site — public booking flow, Stripe/PayPal payments, background notifications (email/FCM/WhatsApp/Meta CAPI), role-based admin & staff panel.
**Mode:** Read-only. No files modified, no migrations run, no database writes, no destructive commands. The only artifact produced is this report.
**Method:** Static analysis of source + schema + git tree. No test/lint/typecheck scripts exist in `package.json`, so most control-flow claims are **NOT VERIFIED at runtime** (marked per finding). Secrets are referenced by field name only — no value is reproduced.

**Severity key:** critical · high · medium · low · info (info = verified-correct / pass).
**Confidence:** high · medium · low (how certain the finding is from static reading).

---

## 1. Executive Summary

The application is a well-structured, defensively-coded booking platform. Core money paths (server-computed deposit, half-open slot math, Stripe signature + amount verification, per-staff overlap, refund idempotency) are implemented correctly. There are **no critical findings**.

The material risks cluster in three areas:

1. **Credential exposure & repo hygiene** — `/api/admin/settings` returns encrypted gateway/mail secrets to *any* authenticated user, and a PostgreSQL dump containing admin password hashes + customer PII is committed to git.
2. **Customer-facing payment UX** — the deposit amount is not disclosed before redirect on single-gateway configs, and the success page renders a *failure* state for a genuinely successful payment while the webhook is still in flight.
3. **Operational sharp edges** — admin notification deep-links 404 (no detail page), German `wa.me` normalization is missing in admin WhatsApp links, and the hottest read endpoint runs a global write on every request.

### Findings at a glance

| Severity | Count |
|----------|-------|
| critical | 0 |
| high | 6 |
| medium | 11 |
| low | 11 |
| info (pass) | 16 |
| **Total** | **44** |

---

## 2. Methodology & Scope

- **In scope:** `prisma/schema.prisma`, all `server/api/**`, `server/middleware/**`, `server/routes/**`, `server/utils/**`, `shared/**`, `app/pages/**`, `app/components/**`, `app/composables/**`, `app/middleware/**`, `nuxt.config.ts`, `package.json`, `.gitignore`, git tree.
- **Out of scope:** runtime infrastructure (reverse proxy/TLS, Postgres tuning), third-party dashboard configuration (Stripe/PayPal/Meta consoles), penetration testing, load testing.
- **Limitations:** No runtime execution was permitted/possible. Findings marked **[static]** are from code reading; **[static, config-dependent]** additionally depend on deployment config that was not observable. Nothing was marked "confirmed" via execution — every finding is `test-confirmed: NO`.
- **Deduplication:** items that appeared in multiple lenses (e.g. `expireHolds`) are recorded once under their primary section and cross-referenced, not double-counted in the summary.

---

## 3. Architecture Overview

- **Runtime:** Nuxt 4 (Nitro server), SSR, TypeScript. `nuxt.config.ts:1`.
- **Data:** PostgreSQL via Prisma; single `SiteSettings` row (`id=1`) holds configuration + AES-GCM-encrypted gateway credentials. `prisma/schema.prisma:531`.
- **Auth:** Cookie session for admin/staff; signed public `publicToken` for customer booking status/manage. `server/utils/auth.ts`.
- **Payments:** Stripe (Checkout/intents) + PayPal (Orders v2), server-verified amounts, webhook-only confirmation for Stripe; PayPal additionally via client-return capture. `server/utils/booking-payments.ts`, `server/utils/paypal.ts`.
- **Background:** In-process sweeper plugin for hold expiry; FCM for admin push; SMTP outbox for mail. `server/plugins/booking-sweeper.ts`.
- **i18n:** `en`/`de` (`NUXT_PUBLIC_LAUNCH_MODE=true` ⇒ German-only, no prefix, toggle hidden). `.env.example`.

---

## 4. Business-Logic Correctness

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| BE-01 | Half-open interval implemented correctly | info | high | `server/utils/booking-slots.ts:124`, `server/api/availability.get.ts:195` |
| BE-02 | Overlap enforced per-staff (concurrent bookings across staff OK) | info | high | `server/api/availability.get.ts:188`, `server/utils/staff-availability.ts:140` |
| BE-03 | Deposit computed server-side from snapshot, never from client | info | high | `server/api/bookings/index.post.ts:132`, `shared/booking.ts:49` |
| BE-04 | Staff cancellation returns overlaps to UNASSIGNED with one grouped notice | info | high | `server/utils/staff-absence.ts:33`, `server/api/admin/bookings/staff-cancel.post.ts:37` |
| BE-05 | Last-active-admin protection on demote/deactivate/delete | info | high | `server/api/admin/users/[id].put.ts:52`, `[id].delete.ts:15` |
| BE-06 | Advisory lock is coarse (per salon-day), serializing all bookings that day | low | high | `server/api/bookings/index.post.ts:142` |

**BE-06 — Coarse advisory lock.** `pg_advisory_xact_lock(hashtext('salon'), hashtext(dayStr))` is correct for race-safety and reused consistently by create/confirm/assign/reschedule, but keys on the whole salon-day, so every booking on the busiest days serializes on one lock.
- *Impact:* throughput ceiling under load.
- *Fix direction:* lock per `(serviceId, day)` or per `(staffId, day)`; keep the salon-day lock only where a whole-day invariant is needed.
- *test-confirmed: NO*

---

## 5. Public Booking Flow

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| UX-01 | Deposit amount not shown before payment redirect (single gateway) | high | high | `app/pages/booking/[slug].vue:190-196,380` |
| UX-04 | UI never sends `idempotencyKey`; fast double-submit can create a 2nd booking | medium | high | `app/pages/booking/[slug].vue:169`, `server/api/bookings/index.post.ts:47` |
| UX-06 | Email not format-validated client-side | low | high | `app/pages/booking/[slug].vue:154` |
| UX-07 | "Any staff" offered even when zero bookable staff exist (dead end) | low | high | `app/pages/booking/[slug].vue:260` |
| UX-04b | Cancellation window & duration are disclosed pre-payment | info | high | `app/pages/booking/[slug].vue:233,367` |

**UX-01 — Deposit hidden before redirect (high).**
- *Behaviour:* the "Anzahlung" section renders only when `gateways.stripe && gateways.paypal` (`:380`). With exactly one gateway enabled, `createBooking()` immediately redirects to checkout (`:190-195`) and the customer never sees the 50% amount.
- *Expected:* deposit disclosed on-screen before any redirect, regardless of gateway count.
- *Actual:* amount shown only in the two-gateway case.
- *Impact:* surprise charge / trust loss at the money moment.
- *Fix direction:* always render the deposit summary once `createdToken`/`depositCents` are known; treat gateway choice as a separate step.
- *test-confirmed: NO*

**UX-04 — No client idempotency key (medium).**
- *Behaviour:* endpoint supports an `idempotencyKey` retry path (`index.post.ts:47-64`) but the UI never sends one.
- *Impact:* double-click can yield two bookings (different staff when any).
- *Fix direction:* generate a per-attempt UUID in the page and send it.
- *test-confirmed: NO*

---

## 6. Availability & Slot Engine

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| PERF-01 | `expireHolds()` global `updateMany` runs on every availability GET | medium | high | `server/api/availability.get.ts:26`, `server/utils/booking-payments.ts:100` |
| PERF-03 | No N+1 in availability (batched schedules/time-offs/bookings) | info | high | `server/api/availability.get.ts:162` |
| PERF-07 | Query bounds present (calendar `take:2000`, time-off `500`, lists ≤50) | info | high | `server/api/admin/calendar/index.get.ts:42` |

**PERF-01 / DB-03 — Write on the read path (medium).** `expireHolds()` issues an unfiltered `updateMany` over all `PENDING` rows with `holdExpiresAt < now` (`booking-payments.ts:100-106`) and is invoked at the top of every availability request (`availability.get.ts:26`). Concurrent availability traffic contends on the same row set, and a background sweeper already performs this job (`plugins/booking-sweeper.ts:9`).
- *Fix direction:* drop the call from the read path (rely on sweeper + create-time expiry), or bound it by date/staff.
- *test-confirmed: NO*

---

## 7. Database Schema & Indexing

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| DB-01 | No index supports plain `startsAt`-range scans (hottest endpoint) | medium/high | high | `prisma/schema.prisma:253-257` |
| DB-02 | Composite `(paymentStatus, holdExpiresAt)` and `(status, startsAt)` missing | medium | high | `prisma/schema.prisma:255-257` |

**DB-01 — Missing range index (medium/high).** Existing `Booking` indexes are `(serviceId, startsAt)`, `(assignedStaffId, startsAt)`, and single-column `paymentStatus`, `status`, `holdExpiresAt` (`schema.prisma:253-257`). Availability/confirm/assign/reschedule filter by a bare `startsAt` range, for which none of these is usable as a leading range scan.
- *Impact:* seq/bitmap scans on the busiest endpoint as data grows.
- *Fix direction:* add `@@index([startsAt])` and `@@index([status, startsAt])`; add `@@index([paymentStatus, holdExpiresAt])` for the sweeper/expiry job.
- *test-confirmed: NO*

---

## 8. Payments — Stripe

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| PAY-01 | Stripe signature verified over raw body; amount/currency enforced | info | high | `server/api/webhooks/stripe.post.ts:32`, `server/utils/booking-payments.ts` |
| PAY-05 | Webhook handler performs heavy synchronous work before ACK | medium | medium | `server/utils/booking-payments.ts:369` |

**PAY-05 — Slow webhook ACK (medium).** `finalizePaidBooking` awaits Meta CAPI HTTP, admin fan-out, and mail queueing inside the Stripe webhook path (`booking-payments.ts:369-419`).
- *Impact:* webhook latency; Stripe retries; possible duplicate-processing pressure.
- *Fix direction:* ACK immediately after signature + state transition; move fan-out/CAPI/mail to a queued/async post-step that is idempotent.
- *test-confirmed: NO*

---

## 9. Payments — PayPal

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| PAY-02 | Confirmation is client-return-initiated, not webhook-only | medium | high | `server/api/bookings/paypal/return.get.ts:24-49` |

**PAY-02 — Browser-redirect-initiated capture (medium).** `/api/bookings/paypal/return` (GET) performs the server-to-server capture and then `confirmBookingPaid` + `finalizePaidBooking` (`return.get.ts:28-44`). The capture is server-verified (amount from PayPal, not the client) so this is *not* "client-says-paid", but it deviates from the stated design goal of webhook-only confirmation and makes confirmation contingent on the user's browser returning.
- *Impact:* a user who closes the tab after approving may not trigger confirmation until the PayPal webhook (if configured) or a reconciliation job runs.
- *Fix direction:* make the webhook authoritative; keep the return purely presentational (redirect to status page which polls).
- *test-confirmed: NO*

---

## 10. Webhooks & Booking Confirmation

- Stripe webhook: signature + amount validation present (PAY-01). Confirmation path is shared with PayPal return.
- Idempotency: `confirmBookingPaid` returns a `decision` (`confirm` / `already-paid` / …), and refunds carry idempotency keys (`server/utils/refunds.ts:33`). **Info — pass.**

---

## 11. Refunds & Cancellation

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| PAY-03 | Refunds carry idempotency keys; amount not exceeding deposit-refunded | info | high | `server/utils/refunds.ts:1-60` |
| SEC-03 | Self-cancel rate-limit rule never matches the real route | medium | high | `server/middleware/rate-limit.ts:20` |

**SEC-03 — Dead rate-limit rule (medium).** The rule matches `p.includes('/booking/manage/')` (`rate-limit.ts:20`) but the actual route is `/api/bookings/manage/:token/cancel` (containing `/bookings/manage/`). The rule never fires, leaving self-cancel unthrottled.
- *Fix direction:* match `/bookings/manage/` (or a regexp on the final path segment).
- *test-confirmed: NO*

---

## 12. Authentication & Session Security

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| SEC-01 | `/api/admin/settings` leaks encrypted gateway/mail secrets to any authenticated user | high | high | `server/api/admin/settings/index.get.ts:6-13` |
| SEC-08 | Admin cookie `Secure` depends on `NODE_ENV && isHttps` (proxy-dependent) | low | medium | `server/utils/auth.ts:37` |
| SEC-11 | Login rate-limit present (30/min) | info | high | `server/middleware/rate-limit.ts:13` |

**SEC-01 — Settings credential exposure (high).**
- *Behaviour:* the handler calls `requireAuth(event)` (not a settings permission) and returns `{ ...settings }` after nulling **only** `metaCapiToken`. Fields `stripeSecretKey`, `stripeWebhookSecret`, `paypalSecret`, `paypalWebhookId`, `mailHttpKey` (AES-GCM ciphertext) are returned (`index.get.ts:6-13`), contradicting the file's own comment and the boolean-only pattern used by `settings/payment.get.ts`.
- *Impact:* any authenticated staff/admin session can exfiltrate encrypted gateway/mail credentials for offline decryption attempts; least-privilege violation.
- *Fix direction:* sanitize every secret field server-side; return `has*` booleans only; gate with `requirePermission('settings.view')` (or stricter).
- *test-confirmed: NO*

**SEC-08 — Cookie Secure flag (low).** `secure` relies on `NODE_ENV==='production' && isHttps` derived from `x-forwarded-proto` (`auth.ts:37-43`). A misconfigured proxy yields a session cookie without `Secure`.
- *Fix direction:* force `Secure` when the public origin is HTTPS; pin trusted proxy headers.
- *test-confirmed: NO*

---

## 13. Authorization & RBAC (Admin/Staff)

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| SEC-12 | Server-side permission enforcement on admin endpoints | info | high | `server/utils/auth.ts:80`, `server/api/admin/**` |
| SEC-13 | STAFF cross-booking access returns 404; payment/users/refund gated | info | high | `server/api/admin/bookings/[id]/index.get.ts:26` |
| SEC-14 | Client route permission gate exists (`admin-auth` middleware) | info | high | `app/middleware/admin-auth.ts` |

All `server/api/admin/**` handlers observed call `requireAuth` or `requirePermission`; staff cannot reach payment/user/refund endpoints. `app/middleware/admin-auth.ts` additionally enforces `requiredPermission` on navigation.

---

## 14. File Uploads & Storage

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| SEC-04 | Staff photos under non-public `staff` scope → avatars 403 for anonymous visitors | medium | high | `server/routes/uploads/[...path].get.ts:22`, `server/utils/storage.ts` |
| SEC-05 | Logo/favicon/banner uploads store raw bytes with no size/type/content validation | medium | high | `server/api/admin/settings/logo.post.ts:14`, `favicon.post.ts:14`, `banners/upload.post.ts:14` |
| SEC-06 | Staff photo & expense receipt validate by filename extension only | low | high | `server/api/admin/staff/[id]/photo.post.ts:20`, `expenses/[id]/receipt.post.ts:23` |
| PERF-04 | Uploads cached `max-age=86400` without `immutable`; some `<img>` lack width/height | low | medium | `server/routes/uploads/[...path].get.ts:50`, `app/components/ServiceSectionCard.vue:38` |

**SEC-04 — Staff photo visibility (medium).** `storeFile('staff')` writes to `/uploads/staff/...`, but `PUBLIC_SCOPES` excludes `staff` (`[...path].get.ts:22`), so serving requires an admin session with `services.view/manage`. The public booking page renders `st.imagePath` in the staff picker (`app/pages/booking/[slug].vue:288-295`) → **avatars 403 for anonymous customers**.
- *Fix direction:* either add a purpose-built public staff-avatar route/scope, or store avatars under a public scope with validation.
- *test-confirmed: NO*

**SEC-05 — Unvalidated public uploads (medium).** `logo.post.ts`, `favicon.post.ts`, `banners/upload.post.ts` call `storeFile(...)` directly (no `sharp` re-encode, no MIME/size allow-list), and both `settings` and `banners` are public scopes → arbitrary bytes can be published to a public URL.
- *Fix direction:* enforce size + content-type allow-list and re-encode via `sharp` like product/category/service covers.
- *test-confirmed: NO*

---

## 15. Notifications & Marketing Integrations

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| UX-08 | Reminder emails queued only for `PAID && ASSIGNED` | low | high | `server/utils/reminders.ts:26` |
| FE-01 | German `wa.me` normalization missing in admin WhatsApp links | high | high | `app/pages/admin/calendar.vue:230,243,350`, `app/pages/admin/reminders.vue:31` |
| SEC-09 | Meta CAPI `Purchase` not consent-gated; stored `fbp`/`fbc` unused | low | high | `server/utils/booking-payments.ts:375`, `server/utils/meta-capi.ts:37` |
| SEC-10 | Push/in-app notification bodies contain no customer PII; encryption key not logged | info | high | `server/utils/fcm.ts`, `server/utils/admin-notifications.ts` |

**FE-01 — Broken WhatsApp links for German local numbers (high).**
- *Behaviour:* the admin reassignment template link and reminder/pay-link buttons build `https://wa.me/${phone.replace(/\D/g,'')}` (`calendar.vue:243,350`, `reminders.vue:36`). A number stored as `0171 1234567` yields `wa.me/01711234567` — invalid without the country code.
- *Server behaviour for contrast:* `shared/booking.ts:75-89` (`normalizePhoneForWa`/`waLink`) correctly rewrites `0171… → 49171…`, and the server uses it (`meta-capi.ts:40`). The client/admin code bypasses it.
- *Note:* `app/composables/useWhatsApp.ts:1-16` implements an **Egyptian** normalization (`01… → 20…`) — inconsistent with the German business.
- *Fix direction:* route all `wa.me` construction through `normalizePhoneForWa`/`waLink`; remove or re-scope the Egypt-specific composable.
- *test-confirmed: NO*

**SEC-09 — CAPI not consent-gated (low).** `Purchase` is sent with no user data and without checking `marketingConsent`; stored `fbp`/`fbc` are never used, so attribution is degraded and consent gating is absent (no PII leaves, so impact is privacy/attribution, not leak).
- *Fix direction:* gate on `marketingConsent`; pass stored `fbp`/`fbc` + hashed identifiers via existing hashing infra.
- *test-confirmed: NO*

---

## 16. Admin Panel

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| UX-03 | Admin booking **detail page** missing → notification deep-links 404 | high | high | `app/pages/admin/bookings/` (only `index.vue`) |
| ADM-01 | Dashboard stats show only products/categories/services (no booking metrics) | medium | high | `server/api/admin/dashboard/stats.get.ts`, `app/pages/admin/index.vue:19` |
| ADM-02 | Reassignment WhatsApp template fetch is 403 for STAFF → silent fallback | low | medium | `app/pages/admin/calendar.vue:224` |
| UX-05 | Customer manage/cancel link not surfaced on success page (email-only) | medium | high | `app/pages/booking/success.vue`, `server/utils/outbox.ts:76` |
| ADM-03 | Admin calendar exists (day/week/month, reassignment queue, urgent, WhatsApp) | info | high | `app/pages/admin/calendar.vue:57` |

**UX-03 — Missing booking detail page (high).** `resolveNotificationUrl` and refund flags build `/admin/bookings/<id>` (`server/utils/admin-notifications.ts:48`, `booking-payments.ts:186`, `booking-cancel.ts`), but `app/pages/admin/bookings/` contains only `index.vue` — there is no `[id].vue`. Every "needs review / refund" notification deep-links to a 404.
- *Fix direction:* add the detail page (or repoint deep-links to a working route/filter).
- *test-confirmed: NO*

**ADM-01 — Thin dashboard (medium).** `dashboard/stats.get.ts` returns only `totalProducts`, `totalCategories`, `activeServices`; `app/pages/admin/index.vue` renders those three. No bookings, revenue, pending-refunds, or today's-appointments metrics — the operational heart of the product is invisible on the landing screen.
- *Fix direction:* add booking-centric aggregates (today/upcoming, PAID+UNASSIGNED, pending refunds).
- *test-confirmed: NO*

---

## 17. Performance & Scalability

- PERF-01 (write-on-read), PAY-05 (webhook latency), BE-06 (coarse lock), DB-01/DB-02 (indexes) — see respective sections.
- **PERF-03 — Pass:** availability batches schedule/time-off/booking lookups; list queries use `include`; FCM uses a single token query + `sendEach` (`server/utils/fcm.ts:84`).
- **PERF-04 — Low:** cached media lacks `immutable`; a few `<img>` omit `width/height` (CLS largely mitigated by fixed containers).

---

## 18. UX / Accessibility / i18n

- UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07 — see respective sections.
- **A11y — Pass:** interactive targets use `h-11` (44px); skeletons expose `role="status"`; decorative icons are `aria-hidden`. `app/pages/booking/success.vue:29`.
- **i18n — Pass:** 50/50 `en`/`de`; `success.vue` date formatting honors `ar`/`de` locales. `app/pages/booking/success.vue:22`.

---

## 19. Success-Callback UX (Payment Return)

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| UX-02 | Success page shows "failed" for a successful payment while webhook is pending | high | high | `app/pages/booking/success.vue:8-12,44-50` |

**UX-02 — No polling on success page (high).** `success.vue` fetches `/api/bookings/status/:token` **once** via `useAsyncData`. If the Stripe webhook has not yet landed, `paymentStatus` is still `PENDING`, so the `v-else` branch renders `failedTitle`.
- *Expected:* treat non-terminal status as "processing" and poll/retry until PAID or a timeout.
- *Actual:* a paid customer can be shown a failure screen.
- *Fix direction:* poll every few seconds up to N attempts; show a "confirming…" state for PENDING.
- *test-confirmed: NO*

---

## 20. Repo Hygiene, Config & Compliance

| ID | Title | Sev | Conf | Location |
|----|-------|-----|------|----------|
| SEC-02 | PostgreSQL dump with admin password hashes + customer PII committed to git | high | high | `backups/clean-slate-20261009-190917.dump` |
| SEC-15 | Uploaded/generated media committed to git (56 files under `storage/`) | low | high | `storage/**` (git-tracked) |
| SEC-16 | Default seed admin credential documented in `.env.example` | low | high | `.env.example` |

**SEC-02 — Committed database dump (high).** `backups/clean-slate-20261009-190917.dump` (122 KB) is **tracked** (`git ls-files`). It contains `COPY` data including `AdminUser` password hashes, `SiteSettings`, and customer PII (`ContactMessage`, quotes, service requests). `.gitignore` does not exclude `backups/`. Exposure persists in git history even after deletion.
- *Impact:* credential/PII exposure if the repo is or becomes remote/public; irreversibly in history.
- *Fix direction:* purge from history (`git filter-repo`), rotate affected credentials + admin passwords, add `backups/` and `storage/` to `.gitignore`.
- *test-confirmed: NO (file presence verified; content sensitivity inferred from schema)*

**SEC-15 — Media committed (low).** 56 files under `storage/` are tracked, coupling user-uploaded content to source history.
- *Fix direction:* gitignore `storage/`, keep a placeholder `.gitkeep`.
- *test-confirmed: VERIFIED (git ls-files)*

**SEC-16 — Default seed password (low).** `.env.example` documents `SEED_ADMIN_PASSWORD="AmirAdmin123!"`.
- *Fix direction:* replace with an obvious placeholder; document rotation steps.
- *test-confirmed: VERIFIED (file read)*

---

## 21. Passed Checks (Verified Correct)

| ID | Check | Location |
|----|-------|----------|
| BE-01 | Half-open slot interval (no off-by-one) | `booking-slots.ts:124` |
| BE-02 | Per-staff overlap; multi-staff concurrency allowed | `availability.get.ts:188` |
| BE-03 | Server-computed deposit from price snapshot | `bookings/index.post.ts:132` |
| BE-04 | Staff cancel re-opens overlaps + single grouped notice | `staff-absence.ts:33` |
| BE-05 | Last-active-admin protection | `users/[id].put.ts:52` |
| PAY-01 | Stripe signature + amount/currency verification | `webhooks/stripe.post.ts:32` |
| PAY-03 | Refund idempotency keys; capped amounts | `refunds.ts:33` |
| SEC-10 | No customer PII in push/notification bodies; key not logged | `fcm.ts`, `encryption.ts` |
| SEC-11 | Login rate-limit (30/min) | `rate-limit.ts:13` |
| SEC-12/13/14 | Server RBAC on all admin endpoints; 404 cross-staff; client route gate | `auth.ts:80`, `admin-auth.ts` |
| PERF-03 | No N+1 in availability/lists/FCM | `availability.get.ts:162`, `fcm.ts:84` |
| ADM-03 | Full admin calendar (views, reassignment queue, urgent, WhatsApp) | `calendar.vue:57` |

---

## Prioritized Remediation Roadmap

### P0 — Fix before launch (security / money / broken UX)

| Order | ID | Action |
|-------|----|--------|
| 1 | SEC-01 | Sanitize **all** secret fields in `GET /api/admin/settings`; return `has*` booleans; tighten to `settings.view` permission. |
| 2 | SEC-02 | Purge `backups/*.dump` from git history; rotate gateway creds + admin passwords; gitignore `backups/`. |
| 3 | UX-02 | Add polling/"confirming" state to the success page so pending webhooks don't render a failure. |
| 4 | UX-01 | Always disclose the deposit before payment, regardless of gateway count. |
| 5 | UX-03 | Add `app/pages/admin/bookings/[id].vue` (or repoint notification deep-links). |
| 6 | FE-01 | Route admin `wa.me` links through `normalizePhoneForWa`/`waLink`; reconcile the Egypt-specific `useWhatsApp`. |

### P1 — Fix soon (correctness / reliability / medium security)

| Order | ID | Action |
|-------|----|--------|
| 7 | DB-01/DB-02 | Add `@@index([startsAt])`, `@@index([status, startsAt])`, `@@index([paymentStatus, holdExpiresAt])`. |
| 8 | PERF-01/DB-03 | Remove `expireHolds()` from the availability read path (rely on sweeper). |
| 9 | SEC-04 | Make staff avatars publicly servable (dedicated route/scope) so the picker works. |
| 10 | SEC-05 | Validate + re-encode logo/favicon/banner uploads (`sharp`, size/MIME allow-list). |
| 11 | SEC-03 | Fix the dead `manage-cancel` rate-limit matcher. |
| 12 | PAY-05 | Move CAPI/mail/fan-out off the webhook critical path; keep handler idempotent. |
| 13 | UX-04 | Send a client `idempotencyKey` on booking create. |
| 14 | ADM-01 | Add booking/revenue/pending-refund metrics to the dashboard. |

### P2 — Should fix (operational / attribution / polish)

| Order | ID | Action |
|-------|----|--------|
| 15 | PAY-02 | Make PayPal confirmation webhook-authoritative; return page presentational. |
| 16 | UX-05 | Surface the customer manage/cancel link on the success page. |
| 17 | SEC-09 | Gate CAPI on `marketingConsent`; pass stored `fbp`/`fbc`. |
| 18 | BE-06 | Narrow the advisory lock scope (service/staff per day). |
| 19 | UX-08 | Queue reminders for unassigned paid bookings. |
| 20 | SEC-08 | Force `Secure` on the admin cookie when the public origin is HTTPS. |

### P3 — Nice to have (hygiene / minor UX)

| Order | ID | Action |
|-------|----|--------|
| 21 | SEC-06 | Content-sniff staff photo / expense receipt uploads. |
| 22 | SEC-15/SEC-16 | Gitignore `storage/`; replace default seed password in `.env.example`. |
| 23 | UX-06/UX-07 | Client-side email validation; hide "any staff" when none bookable. |
| 24 | ADM-02 | Make the reassignment template readable by STAFF (or document the fallback). |
| 25 | PERF-04 | Add `immutable` to media cache headers; supply `<img>` width/height. |

---

### Notes
- All findings are `test-confirmed: NO`; no runtime/lint/typecheck/test execution was performed (no such scripts exist in `package.json`, and verification was out of scope for a read-only pass).
- Severity reflects impact × likelihood under the stated design goals; re-rank once Stripe/PayPal/Meta console behavior and the deployment (public repo? proxy config?) are known.
