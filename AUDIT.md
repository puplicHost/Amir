# AMIR Frisur & Kosmetik Studio — Audit Report

**Date:** 2026-10-19
**Scope:** Nuxt 4 + Prisma/PostgreSQL salon booking site (public booking flow, Stripe/PayPal, role-based admin/staff panel)
**Mode:** Read-only. No files were modified, no migrations run, no commands executed against a database.

**Coverage:** `prisma/schema.prisma`, all `server/api/bookings/*`, `server/api/webhooks/*`, `server/utils/*` (booking, staff, payments, notifications, storage, auth), `server/api/admin/*` (auth gate audit), and key public/admin pages. All five requested sections are covered.

**Severity key:** critical / high / medium / low / info (info = verified correct / pass).

---

## 1. Business-logic correctness

| # | Finding | Location | Severity |
|---|---------|----------|----------|
| 1.1 | Half-open interval is implemented correctly. `overlaps()` is `aStart < bEnd && bStart < aEnd`; a booking 09:00–09:30 does **not** block 09:30 and does block 09:15. No off-by-one. | `server/utils/booking-slots.ts:124`, `server/api/availability.get.ts:195` | info (pass) |
| 1.2 | Overlap is per-staff: busy check is `r.assignedStaffId === staffId …`, and `pickStaffForSlot` chooses among eligible staff. Two customers can book the same service/time with different staff. | `server/api/availability.get.ts:188-200`, `server/utils/staff-availability.ts:140-207` | info (pass) |
| 1.3 | Deposit is computed server-side from the `service.priceAbCents` snapshot (`depositCentsFor`), never from the client. `bookingCreateSchema` accepts no amount. | `server/api/bookings/index.post.ts:132`, `shared/booking.ts:49` | info (pass) |
| 1.4 | Stripe: signature verified over raw body; amount/currency (`isExpectedAmount`) enforced. **PayPal: confirmation is triggered by the client return URL** (`/api/bookings/paypal/return`) which performs a server-to-server capture. The capture is server-verified, so it is not "client-says-paid", but it deviates from the brief's "webhook only" and is browser-redirect-initiated. | `server/api/webhooks/stripe.post.ts:32`, `server/api/bookings/paypal/return.get.ts:24-49` | medium |
| 1.5 | Advisory lock key is `pg_advisory_xact_lock(hashtext('salon'), hashtext(dayStr))` — correct and consistently reused by create/confirm/assign/reschedule. Safe against races, but **coarse**: every slot on a salon day serializes on one lock. | `bookings/index.post.ts:142`, `booking-payments.ts:251,304`, `assign.put.ts` | low |
| 1.6 | `expireHolds()` runs a **global** `updateMany` (all PENDING/expired rows, no date filter) inside every booking-create transaction, again after it, and on **every** availability GET. Concurrent requests contend on the same rows. | `booking-payments.ts:100`, `availability.get.ts:26`, `bookings/index.post.ts:143,215` | medium |
| 1.7 | Staff cancellation correctly returns overlapping ASSIGNED bookings to `UNASSIGNED` and sends exactly one grouped admin notice; the slot stays reserved (legacy staff-less rule blocks all staff for that service/time). | `server/utils/staff-absence.ts:33-74`, `admin/bookings/staff-cancel.post.ts:37-60` | info (pass) |
| 1.8 | `wa.me` from the server (`waLink`) normalizes German `0171… → 49171…` correctly. **But the client-side reassignment template link and the manual reminders / pay-link build `wa.me` by stripping non-digits only** — a phone stored as `0171…` yields an invalid `wa.me/0171…` link (missing country code). Breaks brief item #9 for typical local-format numbers. | `app/pages/admin/calendar.vue:230,243,350`, `app/pages/admin/reminders.vue:33-36` vs `shared/booking.ts:75-89` | high |
| 1.9 | Staff permissions are enforced server-side on every admin endpoint (`requirePermission`/`requireAuth` present on all files under `server/api/admin`). STAFF reading another staff's booking → 404. STAFF cannot reach payment/users/refund endpoints (permission-gated). | `server/utils/auth.ts:80`, `admin/bookings/[id]/index.get.ts:26-29`, `admin/settings/payment.get.ts`, `admin/users/*` | info (pass) |
| 1.10 | Last-active-admin protection exists for demote, deactivate and delete (counts active non-super ADMINs, blocks if ≤1). Conservative: ignores super-admins in the count. | `admin/users/[id].put.ts:52-69`, `[id].delete.ts:15-30` | info (pass) |

---

## 2. UX and missing features

| # | Finding | Location | Severity |
|---|---------|----------|----------|
| 2.1 | **Deposit amount is not shown before the payment redirect when only one gateway is enabled.** The "Anzahlung" block renders only when both gateways are on; with a single gateway `createBooking()` immediately redirects. The customer never sees the 50% amount. | `app/pages/booking/[slug].vue:190-196,380-401` | high |
| 2.2 | **Success page can show "failed" for a successful Stripe payment**: it reads status once; if the webhook hasn't landed yet, `paymentStatus` is still PENDING → renders `failedTitle`. No polling/retry. | `app/pages/booking/success.vue:8-12,44-50` | high |
| 2.3 | **Admin notification deep links 404**: `resolveNotificationUrl` and refund flags build `/admin/bookings/<id>`, but there is no `app/pages/admin/bookings/[id].vue` (only `index.vue`). | `server/utils/admin-notifications.ts:48`, `booking-payments.ts:186`, `booking-cancel.ts` | high |
| 2.4 | Cancellation window **is** shown before payment (`manage.policyShort`), and duration **is** shown on the booking page. | `booking/[slug].vue:233,367` | info (pass) |
| 2.5 | Customers can self-cancel via `/booking/manage/<token>`, but the **success page never surfaces the manage link**; it is email-only. Poor discoverability post-payment. | `booking/success.vue`, `outbox.ts:76-80` | medium |
| 2.6 | Client validates only name + phone presence; email is not format-checked client-side (server rejects with a generic message). | `booking/[slug].vue:154-161` | low |
| 2.7 | No client `idempotencyKey` is sent from the UI, so the endpoint's idempotent-retry path is unused; a fast double-submit can create a second booking (different staff when "any"). | `booking/[slug].vue:169-185` vs `bookings/index.post.ts:47-64` | medium |
| 2.8 | "Any staff" is always offered even when zero bookable staff exist (all slots disabled → dead end). | `booking/[slug].vue:260-302` | low |
| 2.9 | Reassignment WhatsApp template configured in Studio is fetched with `settings.business`; STAFF get 403 → falls back to the built-in default. Works, but not configurable for staff. | `app/pages/admin/calendar.vue:224-226` | low |
| 2.10 | Reminder email is queued only for `PAID && ASSIGNED`; unassigned bookings get no reminder. WhatsApp reminders are manual only. | `server/utils/reminders.ts:26-29` | low |
| 2.11 | Admin calendar exists (day/week/month, staff columns, reassignment queue for PAID+UNASSIGNED, urgent <24h, WhatsApp button), and staff "I'm unavailable" exists in `my-bookings`. No dedicated reassignment page, but the status filter (`?status=UNASSIGNED`) covers it. | `admin/calendar.vue:57-70`, `admin/my-bookings.vue:140-193` | info (pass) |
| 2.12 | Mobile: admin tables use `min-w-[980px]` + horizontal scroll (acceptable); booking-page grids and `h-11` targets are fine. No overlaps observed. | `admin/bookings/index.vue:443` | info (pass) |

---

## 3. Performance risks

| # | Finding | Location | Severity |
|---|---------|----------|----------|
| 3.1 | **No index supports the availability day query.** Availability/calendar/confirm/assign/reschedule filter `Booking` by a `startsAt` range only (no leading `serviceId`/`assignedStaffId`). Existing indexes are `(serviceId,startsAt)`, `(assignedStaffId,startsAt)`, `paymentStatus`, `status`, `holdExpiresAt` — none usable as a plain `startsAt` range scan. Seq/bitmap-scan risk on the hottest public endpoint. | `prisma/schema.prisma:253-257`, `staff-availability.ts:118-130` | medium/high |
| 3.2 | Requested composite indexes missing: `Booking(paymentStatus, holdExpiresAt)` and `Booking(status, startsAt)`. Only single-column versions exist. | `prisma/schema.prisma:255,256,257` | medium |
| 3.3 | `expireHolds` global write on every availability request (see 1.6) — write amplification on a read endpoint; the sweeper already covers this. | `availability.get.ts:26` | medium |
| 3.4 | Coarse per-day advisory lock serializes all bookings for a day under load. | `bookings/index.post.ts:142` | medium |
| 3.5 | Webhook path does synchronous heavy work: Meta CAPI HTTP call + admin fan-out + mail queue inside `finalizePaidBooking` (awaited). Could delay webhook ACK; Stripe may retry. | `booking-payments.ts:369-419` | medium |
| 3.6 | No significant N+1s: availability batches schedules/time-offs/bookings; lists use `include`; FCM fan-out uses a single token query + `sendEach`. | `availability.get.ts:162`, `fcm.ts:84-98` | info (pass) |
| 3.7 | Unbounded queries: calendar `take:2000`, time-off `500`, reminders `200`, list `limit≤50` — all capped. | `calendar/index.get.ts:42,57`, `reminders/index.get.ts:24` | info (pass) |
| 3.8 | Uploads served `cache-control: public, max-age=86400` (no `immutable`); several `<img>` lack `width/height` (CLS mitigated by fixed containers elsewhere). | `routes/uploads/[...path].get.ts:50`, `ServiceSectionCard.vue:38` | low |

---

## 4. Security and data risks

| # | Finding | Location | Severity |
|---|---------|----------|----------|
| 4.1 | **`GET /api/admin/settings` returns the whole `SiteSettings` row to any authenticated user and only nulls `metaCapiToken`.** `stripeSecretKey`, `stripeWebhookSecret`, `paypalSecret`, `paypalWebhookId`, `mailHttpKey` (AES-GCM ciphertext) are returned — contrary to the file's own comment and the "booleans only" pattern used by `settings/payment.get.ts`. Ciphertext, not plaintext, but a least-privilege / credential-exposure defect. | `server/api/admin/settings/index.get.ts:6-13` | high |
| 4.2 | **A PostgreSQL custom dump is committed to git**: `backups/clean-slate-20261009-190917.dump` contains `COPY` data for `AdminUser` (password hashes), `SiteSettings`, `ContactMessage` / quote / service-request PII. Exposure persists in git history. [uncertain] whether the repo is public/remote; the file is tracked regardless. | `backups/clean-slate-20261009-190917.dump`, `.gitignore` | high |
| 4.3 | **Self-cancel rate-limit rule never fires.** The rule matches `p.includes('/booking/manage/')`, but the route is `/api/bookings/manage/:token/cancel` → `/bookings/manage/`. Endpoint is effectively unrate-limited. | `server/middleware/rate-limit.ts:20` | medium |
| 4.4 | Staff photos are stored under scope `staff` (`/uploads/staff/...`), but `PUBLIC_SCOPES` excludes `staff` → requires an admin session. The public booking page renders `st.imagePath` → **avatars 403 for anonymous visitors**. | `storage.ts` (`storeFile('staff')`), `routes/uploads/[...path].get.ts:22`, `booking/[slug].vue:288-295` | medium |
| 4.5 | Logo, favicon and banner uploads use raw `storeFile` with **no size/type/content validation**, and both `settings` and `banners` are public scopes → arbitrary bytes can be published. | `settings/logo.post.ts`, `settings/favicon.post.ts`, `banners/upload.post.ts` | medium |
| 4.6 | Staff photo and expense receipt validate by filename extension only (no content sniffing); staff photos are not re-encoded (unlike product/category/service covers, which pass through `sharp`). | `staff/[id]/photo.post.ts:20-31`, `expenses/[id]/receipt.post.ts:23-28` | low |
| 4.7 | Public status endpoint returns `bookingNumber` and `eventId` (= `purchase-<bookingId>`), exposing the internal booking id. No name/phone/email (good). | `bookings/status/[token].get.ts:16,25` | low |
| 4.8 | Admin cookie is `httpOnly`, `sameSite=lax`, but `secure` depends on `NODE_ENV==='production' && isHttps` (relies on `x-forwarded-proto`). A misconfigured proxy → cookie without `Secure`. | `server/utils/auth.ts:37-43` | low |
| 4.9 | Meta CAPI `Purchase` is **not gated on `marketingConsent`** and passes no user data at all; `fbp`/`fbc` are stored but never used. No PII leaves — but consent gating and attribution improvement are missing. Hashing infra already exists. | `booking-payments.ts:375-380`, `meta-capi.ts:37-65`, `bookings/index.post.ts:202-203` | low |
| 4.10 | FCM push payloads and in-app notification bodies contain service + time only — no customer PII. `ENCRYPTION_KEY` is loaded from env and never logged/returned. Availability returns booleans + public staff profile only. | `fcm.ts`, `admin-notifications.ts`, `server/utils/encryption.ts`, `availability.get.ts` | info (pass) |

---

## 5. Missing / broken features vs. the brief

These are launch-readiness items; most overlap with findings above and are **not** double-counted in the summary.

| # | Missing or broken | Where | Urgency |
|---|-------------------|-------|---------|
| 5.1 | Admin booking **detail page** (`/admin/bookings/[id]`) — all admin "needs review / refund" notifications deep-link here and 404. | `app/pages/admin/bookings/[id].vue` | blocks launch |
| 5.2 | Correct **German `wa.me` normalization** in the admin reassignment template link and reminder / pay-link buttons (leading `0` not converted to `49`). | `app/pages/admin/calendar.vue`, `reminders.vue` (use `normalizePhoneForWa`) | blocks launch |
| 5.3 | **Deposit amount disclosed before payment** for single-gateway configs. | `app/pages/booking/[slug].vue` | needed soon |
| 5.4 | **Success-page robustness** (poll/retry while webhook pending) so paid customers don't see a failure page. | `app/pages/booking/success.vue` | needed soon |
| 5.5 | Staff **photo public visibility** (scope/serving) so the staff picker shows avatars. | `routes/uploads/[...path].get.ts` / storage scope | needed soon |
| 5.6 | PayPal confirmation strictly via webhook (remove capture from the client return path, or make the return non-authoritative). | `server/api/bookings/paypal/return.get.ts` | nice to have |
| 5.7 | Surface the customer **manage/cancel link** on the success page (currently email-only). | `booking/success.vue` | nice to have |
| 5.8 | Reminders for unassigned paid bookings (currently skipped). | `server/utils/reminders.ts` | nice to have |
| 5.9 | Use stored `fbp`/`fbc` + `marketingConsent` gating in CAPI Purchase for attribution. | `booking-payments.ts`, `meta-capi.ts` | nice to have |
| 5.10 | Fix the dead `manage-cancel` rate-limit matcher. | `server/middleware/rate-limit.ts` | nice to have |

---

## Summary table

| Severity | Count |
|----------|-------|
| critical | 0 |
| high | 6 |
| medium | 12 |
| low | 10 |
| info (pass) | 12 |
| **Total** | **40** |

### Top 5 by priority

1. **4.1** — `/api/admin/settings` leaks encrypted Stripe/PayPal/Meta/mail credentials to any authenticated user (only `metaCapiToken` is nulled). *Fix: sanitize every secret field server-side; return `has*` booleans only.*
2. **4.2** — Committed PostgreSQL dump `backups/clean-slate-*.dump` with admin password hashes and PII in git. *Fix: purge from history; keep dumps out of the repo.*
3. **1.8 / 5.2** — Reassignment/reminder `wa.me` links break for German local numbers (no `0 → 49` normalization). *Fix: reuse `normalizePhoneForWa` / `waLink`.*
4. **2.1 + 2.2** — Customer-facing payment UX: deposit not shown before redirect (single gateway) and success page can show "failed" after a successful Stripe payment. *Fix: always display the deposit pre-payment; poll status on success.*
5. **3.1** — Availability (hottest endpoint) filters `Booking` only by a `startsAt` range with no supporting index → scan risk under load. *Fix: add `@@index([startsAt])` / `(status, startsAt)` and `(paymentStatus, holdExpiresAt)`.*
