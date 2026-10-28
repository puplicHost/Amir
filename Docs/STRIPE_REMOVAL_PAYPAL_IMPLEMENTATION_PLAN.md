# Stripe Removal & PayPal-Only Booking Payments — Implementation Plan

**Status:** Planning complete. No application code, config, dependency, schema, or migration has been changed by this task.
**Target:** PayPal is the only online payment provider; Stripe is removed from active behavior and dependencies.
**Audience:** A limited-capability coding agent executing phases in order.
**Repository:** AMIR salon platform (Nuxt 4 / Nitro / Prisma / PostgreSQL).

> Execution rules for the implementer are in section 5. Read section A and section C before touching files. Do not re-investigate decisions already fixed here. Do not use Git, migrations, production databases, or real payments.

---

## A. Repository Findings

### A.1 Confirmed payment and booking architecture

**Booking creation and holds**
- `server/api/bookings/index.post.ts` — guest booking creation. Validates the slot inside a `pg_advisory_xact_lock(hashtext('salon'), hashtext(dayStr))` transaction, computes `depositCents` server-side from the service snapshot, refuses creation when no gateway is configured (`getGatewayStatus()`), and creates the booking with `paymentStatus: 'PENDING'`, `paymentProvider: ''`, `holdExpiresAt`, `publicToken`, `manageToken`.
- `server/plugins/booking-sweeper.ts` → `expireHolds()` in `server/utils/booking-payments.ts` flips lapsed `PENDING` rows to `EXPIRED` every 60 s.
- `server/api/availability.get.ts` and `server/utils/booking-slots.ts` provide availability and timezone/DST helpers. Availability logic is independent of the provider.

**Pay-attempt endpoint**
- `server/api/bookings/[token]/pay.post.ts` — resolves the booking by `publicToken`, rejects `PAID` (409), rejects non-`PENDING` (409), expires an overdue hold (410), checks gateway availability, then creates a provider order and stores `paymentProvider` + `providerRef` with a guarded `updateMany({ where: { id, paymentStatus: 'PENDING' } })`.
  - Stripe branch: lines ~55–81 (`checkout.sessions.create`, `paymentProvider: 'stripe'`).
  - PayPal branch: lines ~83–105 (`paypalCreateOrder`, `paymentProvider: 'paypal'`, `providerRef: order.id`).

**Server-authoritative confirmation core**
- `server/utils/booking-payments.ts`:
  - `getBookingSettings()` (timezone, currency, deposit %, hold TTL, lead time, cancellation window).
  - `getGatewayStatus()` / `gatewayStatusFromSettings()` (lines 37–62).
  - `getStripeConfig()` / `StripeConfig` (lines 81–105) — Stripe SDK client.
  - `getPaypalConfig()` (lines 107–122) — decrypted client id / secret / webhook id / mode.
  - `confirmBookingPaid()` (lines ~226–408) — single idempotent confirmation core used by every provider callback. It:
    - returns `already-paid` for `PAID`,
    - flags terminal/cancelled bookings for refund,
    - validates amount/currency via `isExpectedAmount()` from `server/utils/booking-confirm.ts`,
    - serializes on the salon+day advisory lock,
    - re-checks slot overlap, flags `needsRefund` when the slot is gone,
    - performs a guarded `PENDING→PAID` (or `EXPIRED/FAILED→PAID` when the slot is still free) and auto-assigns a chosen staff member.
  - `finalizePaidBooking()` — post-confirmation side effects (Meta CAPI gated on consent, admin/staff notifications, confirmation mail via outbox). Never throws.
- `server/utils/booking-confirm.ts` — pure decision helpers: `decideConfirmation()`, `isExpectedAmount()`, `decideLatePayment()`.

**PayPal integration**
- `server/utils/paypal.ts` — dependency-free REST client:
  - `paypalAccessToken()` (`/v1/oauth2/token`, client credentials),
  - `paypalCreateOrder()` (`/v2/checkout/orders`, `intent: CAPTURE`, `custom_id = booking.id`, amount from server snapshot, returns `approveUrl`),
  - `paypalCaptureOrder()` (`/v2/checkout/orders/{id}/capture`, returns status, capture id, amount, currency),
  - `paypalVerifyWebhook()` (`/v1/notifications/verify-webhook-signature`).
- `server/api/bookings/paypal/return.get.ts` — browser return URL. Verifies `booking.providerRef === orderId`, captures server-side, builds proof (`amountCents`, `currency`, `paymentId = captureId`), calls `confirmBookingPaid(booking.id, orderId, proof)`, finalizes via `event.waitUntil`, redirects to success/failed.
- `server/api/webhooks/paypal.post.ts` — verifies signature, then:
  - `CHECKOUT.ORDER.APPROVED` → captures the order server-side (skip if `PAID` or `providerRef` mismatch), calls `confirmBookingPaid(customId, orderId, proof)`, finalizes.
  - `PAYMENT.CAPTURE.COMPLETED` → calls `confirmBookingPaid(customId, captureId, proof)`.
  - `PAYMENT.CAPTURE.REFUNDED` / `PAYMENT.CAPTURE.DENIED` → resolves `BookingRefund` rows by provider ref.
- `server/api/bookings/status/[token].get.ts` — public status poll used by the success page; returns `gateways` from `getGatewayStatus()`.

**Stripe integration**
- `server/api/webhooks/stripe.post.ts` (106 lines) — Stripe SDK, raw-body signature verification, `checkout.session.completed` / `async_payment_succeeded`, refund events, calls `confirmBookingPaid`.
- `server/utils/refunds.ts` — Stripe `refunds.create` branch (lines ~32–48) and PayPal refund branch.
- `server/utils/booking-cancel.ts:85` — auto-refund eligibility allows `stripe` or `paypal`.
- `package.json:46` — `"stripe": "^23.0.0"`; `package-lock.json:34`.

**Admin configuration and UI**
- `server/api/admin/settings/payment.get.ts` — returns Stripe and PayPal fields plus `has*` booleans.
- `server/api/admin/settings/payment.put.ts` — Zod-validated encrypted writes for Stripe and PayPal.
- `server/utils/validate.ts:224–234` — `paymentSettingsSchema` with Stripe + PayPal keys.
- `app/components/admin/AdminSettingsPayment.vue` — Stripe card (lines ~64–99), Stripe defaults/map/build (lines 13–34), `hasStripe*` (48–49), "both off" alert (57).
- `app/components/admin/AdminPaymentsPanel.vue:43–46` — `providerLabel()` branches on `STRIPE`/`PAYPAL`.
- `app/components/admin/AdminBookingsPanel.vue:818` — refund-note placeholder mentions the Stripe Dashboard.
- `app/pages/datenschutz.vue:65–66, 123–124` — privacy template names Stripe.

**Customer UI**
- `app/pages/booking/[slug].vue` — `gateways = { stripe, paypal }` (line 50), `payFor(token, provider)` (line 151), response type (line 223), assignment (247), provider buttons and empty state (lines 460–490).
- `app/pages/booking/failed.vue` — `retrying: 'stripe' | 'paypal'` (15), `retry(provider)` (20), two retry buttons (52–78).
- `app/pages/booking/pay/[token].vue` — `gateways` fallback `{ stripe, paypal }` (15), `payFor(provider)` (30), two buttons (82–102).
- `app/pages/booking/success.vue:22` — response type includes `gateways: { stripe, paypal }` (field otherwise unused).

**Shared constants, CSP, i18n, docs**
- `shared/booking.ts:9` — `PAYMENT_PROVIDERS = ['stripe', 'paypal']`; `paymentProviderEnum` in `server/utils/validate.ts:17`; `bookingPaySchema` at `:102`.
- `server/middleware/security-headers.ts:19, 23, 24` — CSP allows `js.stripe.com`, `api.stripe.com`.
- `i18n/locales/en.json` and `de.json` — `payment.stripe` (line ~343), `booking.stripe` (line ~482), plus `payment.publishableKey` / `payment.webhookSecret` used only by the Stripe card.
- Docs naming Stripe as current behavior: `Docs/00-master-plan.md` (lines 8, 40, 64), `Docs/02-sitemap.md` (line 79), `Docs/FULL-WEBSITE-REMEDIATION.md`, `Docs/manual-qa/*`, `Docs/STRIPE-SANDBOX-VERIFICATION.md`.
- Verification scripts: `scripts/verify-stripe-webhook.mjs` (Stripe-only), `scripts/verify-booking-gateway.mjs` (asserts Stripe gateway status), `scripts/verify-2e.mjs` / `scripts/verify-duration-phase1.mjs` (fixtures with `paymentProvider: 'stripe'`), `scripts/verify-8.mjs` (comment), `scripts/verify-2c.mjs` (pure `cs_*` refs, Stripe-named but provider-agnostic).

**Schema (no migration required)**
- `prisma/schema.prisma:260` `Booking.paymentProvider String` (free string, comment lists `'stripe' | 'paypal'`).
- `prisma/schema.prisma:270` `Booking.providerPaymentId` (Stripe payment_intent or PayPal capture id).
- `prisma/schema.prisma:445` `BookingRefund.provider String` (`stripe | paypal | manual`).
- `prisma/schema.prisma:657–660` `SiteSettings.stripeEnabled`, `stripePublishableKey`, `stripeSecretKey`, `stripeWebhookSecret`.
- Historical migration `prisma/migrations/20261011124111_booking_system/migration.sql:65–68` created those columns.

### A.2 Confirmed defects and gaps that must be fixed for PayPal-only correctness

1. **CRITICAL — PayPal webhook passes the capture id where the code expects the order id.**
   `server/api/webhooks/paypal.post.ts` calls `confirmBookingPaid(customId, captureId, proof)`. `Booking.providerRef` stores the PayPal **order id** (set in `pay.post.ts:97`). In `confirmBookingPaid` the PENDING branch treats a differing `providerRef` as a superseded attempt and calls `flagForRefund()`. Therefore a normal `PAYMENT.CAPTURE.COMPLETED` webhook flags a successful payment for refund instead of confirming it. The browser return path passes `orderId` and works, masking the bug when the buyer returns.
2. **Second charge on an already-PAID booking is silently swallowed.**
   `confirmBookingPaid` returns `already-paid` before comparing `proof.paymentId` / `providerRef`. If a customer pays two different PayPal orders (e.g. retry after abandoning the first), the second capture is recorded nowhere and `needsRefund` stays false.
3. **Provider is not validated at confirmation.**
   `confirmBookingPaid` accepts any provider's callback. A legacy Stripe (`paymentProvider: 'stripe'`) or manual booking could be marked PAID by a PayPal capture. PayPal-only means confirmation must require the booking to be a PayPal booking (or still unset, for rows created before a pay attempt).
4. **Ambiguous capture race on the return path.**
   `return.get.ts` catches capture errors and redirects to `/booking/failed`. If PayPal already captured the order in a parallel webhook/retry (`ORDER_ALREADY_CAPTURED`), the customer sees a failure page while the webhook later confirms. The return handler should recognise "already captured" and redirect to the success page (which polls), not the failure page.
5. **Stripe is entangled across types, API contracts, UI, CSP, deps, scripts, docs.**
   `GatewayStatus`/`GatewaySettings` include `stripe`; API responses expose `gateways.stripe`; four pages type/use it; admin settings API and UI expose Stripe credentials; CSP allows Stripe; `stripe` dependency installed.

### A.3 Not verifiable in this task

- Actual PayPal Sandbox order creation, approval, capture, webhook signature verification, refunds, and duplicate-webhook behavior require Sandbox credentials and a running server. No live or Sandbox API call was made. Source reading alone does not prove runtime correctness.

---

## B. Target Behavior

### B.1 Checkout and confirmation lifecycle (PayPal only)

1. Customer selects a slot; `POST /api/bookings` creates a `PENDING` booking with an unguessable `publicToken`, a `holdExpiresAt`, and `paymentProvider: ''`. Creation is refused if PayPal is not enabled+configured.
2. Customer clicks the single "Pay deposit with PayPal" button → `POST /api/bookings/{publicToken}/pay` with `{ provider: 'paypal' }`.
3. Server validates: booking exists, `paymentStatus === 'PENDING'`, hold not expired, PayPal gateway available. It creates a PayPal CAPTURE order with `custom_id = booking.id`, amount = `booking.depositCents`, currency = salon currency, and stores `paymentProvider: 'paypal'`, `providerRef: order.id` (guarded on `PENDING`). Returns `approveUrl`; the browser redirects to PayPal.
4. Customer approves at PayPal. Two independent server paths may confirm:
   - **Browser return:** `GET /api/bookings/paypal/return?b=<publicToken>&token=<orderId>` — checks `providerRef === orderId`, captures server-side, builds proof, calls `confirmBookingPaid`.
   - **Webhook:** `CHECKOUT.ORDER.APPROVED` captures if needed; `PAYMENT.CAPTURE.COMPLETED` confirms. Signature is verified through PayPal's verify endpoint.
5. `confirmBookingPaid`:
   - rejects non-PayPal providers,
   - validates `amountCents === booking.depositCents` and currency equality,
   - takes the salon+day advisory lock,
   - re-checks slot overlap against other PAID/unexpired-PENDING bookings,
   - if the slot is free: guarded `paymentStatus → PAID`, stores `providerPaymentId = captureId`, clears `holdExpiresAt`, clears `needsRefund`, auto-assigns the chosen staff member when applicable;
   - if the slot is taken: `paymentStatus → EXPIRED`, `needsRefund = true`, `providerRef`/`providerPaymentId` retained, admins notified; the booking is never confirmed;
   - if the booking is terminal/cancelled: flag for refund, never confirm.
6. On `confirm`, `finalizePaidBooking` sends the confirmation mail, admin/staff notifications, and consent-gated Meta CAPI Purchase (deduplicated by `purchase-<bookingId>`).
7. Success page polls `GET /api/bookings/status/{publicToken}` until `PAID` or timeout. Payments are never confirmed from client state.

### B.2 State transitions actually used by the schema

- `Booking.paymentStatus`: `PENDING → PAID`, `PENDING → EXPIRED` (hold lapse or lost slot), `PENDING → FAILED` (provider failure, reserved), `EXPIRED/FAILED → PAID` only when the slot is still free and an authoritative capture arrives.
- `Booking.status`: `UNASSIGNED → ASSIGNED` (staff chosen and payment confirmed) or `UNASSIGNED` (any-staff, admin assigns later); `→ COMPLETED` only from `ASSIGNED`; `→ CANCELLED` for cancellations.
- `Booking.needsRefund`: set when verified money cannot be honoured (slot taken, terminal booking, amount/currency mismatch, duplicate charge). Never cleared by a failed path.
- `BookingRefund.provider`: `'paypal'` for automatic refunds; legacy `'stripe'` rows stay readable but are refunded manually (`OUTSIDE`).

### B.3 Invariants that must remain true

- The client cannot mark a booking paid; only server-verified PayPal capture proof can.
- Amount and currency must exactly equal the server-side deposit snapshot.
- Duplicate delivery of the same capture is idempotent (`already-paid`).
- A second, distinct capture is flagged (`needsRefund`), never silently ignored.
- Concurrent bookings still serialize on the salon+day advisory lock; availability logic is untouched.
- Stripe code paths, UI, CSP allowances, dependency, and credential fields are absent from active behavior.

---

## C. Ordered Implementation Phases

Execute strictly in order. Each phase must compile (`tsc --noEmit`) before the next. Do not skip phases.

### Phase 0 — Baseline capture (no edits)

**Objective:** Record the pre-change state so regressions are attributable.

**Commands (safe, local):**
```bash
npx prisma validate
node_modules/.bin/tsc --noEmit
npm test
```
Record exit codes. Known pre-existing test failures in this container: `booking-slots.test.ts` DST fall-back disambiguation and `format.test.ts` whole-euro ICU rendering. They are environment-dependent and must not be "fixed" by changing application logic in this task.

**Acceptance:** Baseline recorded; no files modified.

---

### Phase 1 — Narrow the shared provider contract

**Objective:** Make `paypal` the only valid provider value for new payment requests.

**Files/changes:**
1. `shared/booking.ts:9`
   - Change `PAYMENT_PROVIDERS = ['stripe', 'paypal'] as const` → `['paypal'] as const`.
   - Keep `PaymentProvider` type derivation unchanged.
   - Do not change `PAYMENT_STATUSES`, `REFUND_STATUSES`, or any other constant.
2. `server/utils/validate.ts`
   - Leave `paymentProviderEnum` and `bookingPaySchema` as-is (they derive from the narrowed list, so only `'paypal'` validates).
   - Do **not** change `paymentSettingsSchema` yet (Phase 5).

**Dependencies:** None.
**Safety:** No DB change; `Booking.paymentProvider` remains a free string, so legacy `'stripe'`/`'manual'` rows stay readable.
**Acceptance:**
- `tsc --noEmit` passes.
- `bookingPaySchema.safeParse({ provider: 'stripe' }).success === false` and `{ provider: 'paypal' }` succeeds (verify by inspection; no runtime script required).

---

### Phase 2 — Remove Stripe from the server payment core

**Objective:** Delete Stripe client/refund/confirmation code while preserving PayPal and all booking logic.

**Files/changes:**

1. `server/utils/booking-payments.ts`
   - Delete `import Stripe from 'stripe'` (line 3).
   - `GatewayStatus` → `{ paypal: boolean }`.
   - `GatewaySettings` → remove `stripeEnabled` and `stripeSecretKey`; keep PayPal fields.
   - `gatewayStatusFromSettings()` → return `{ paypal: !!s?.paypalEnabled && !!s?.paypalClientId && !!s?.paypalSecret }`. Remove the Stripe paragraph from its doc comment.
   - Delete `StripeConfig` (lines ~81–86) and `getStripeConfig()` (lines ~88–105).
   - `PaymentProof.paymentId` comment → "PayPal capture id".
   - Update the `confirmBookingPaid` doc comment: replace "Stripe webhook, PayPal return and PayPal webhook" with "PayPal return and PayPal webhook".
   - **Add provider guard** near the top of `confirmBookingPaid`, after the `PAID` handling and before the terminal-state guard:
     ```ts
     if (booking.paymentProvider && booking.paymentProvider !== 'paypal') {
       await flagForRefund(booking.id, providerRef, booking.bookingNumber, booking.depositCents)
       return { decision: 'flag-refund', booking: null }
     }
     ```
   - **Add duplicate-charge detection** to the `PAID` short-circuit. Replace
     `if (booking.paymentStatus === 'PAID') return { decision: 'already-paid', booking: null }`
     with logic that flags when the incoming order/capture differs from the stored one:
     ```ts
     if (booking.paymentStatus === 'PAID') {
       const refDiffers = Boolean(providerRef && booking.providerRef && providerRef !== booking.providerRef)
       const captureDiffers = Boolean(
         proof?.paymentId
         && (booking as any).providerPaymentId
         && proof.paymentId !== (booking as any).providerPaymentId,
       )
       if (refDiffers || captureDiffers) {
         await flagForRefund(booking.id, null, booking.bookingNumber, booking.depositCents)
         return { decision: 'flag-refund', booking: null }
       }
       return { decision: 'already-paid', booking: null }
     }
     ```
   - Do **not** alter lock, overlap, amount, terminal, or assignment logic.

2. `server/utils/refunds.ts`
   - Remove `import Stripe from 'stripe'` (line 5) and `getStripeConfig` from the `booking-payments` import.
   - Delete the entire `if (input.paymentProvider === 'stripe') { ... }` branch (lines ~32–48).
   - Update the header comment to "PayPal refunds" only.
   - Keep the PayPal branch and the final unsupported-provider fallback exactly as-is.

3. `server/utils/booking-cancel.ts:85`
   - Change `(booking.paymentProvider === 'stripe' || booking.paymentProvider === 'paypal')` → `booking.paymentProvider === 'paypal'`.
   - Consequence (intended): legacy Stripe-paid bookings get `refundStatus = 'OUTSIDE'` and the existing manual-refund admin notification.

4. `server/api/bookings/[token]/pay.post.ts`
   - Remove `getStripeConfig` from the `booking-payments` import.
   - Replace the gateway checks with:
     ```ts
     if (!gateways.paypal) {
       throw createError({ statusCode: 409, statusMessage: 'Online payment is currently unavailable — please contact the salon' })
     }
     ```
   - Delete the entire `if (body.provider === 'stripe') { ... }` block.
   - Keep the PayPal block; it must continue to:
     - call `paypalCreateOrder` with `customId: booking.id`, server-side `depositCents`, `settings.currency`, return URL `${origin}/api/bookings/paypal/return?b=${booking.publicToken}`, cancel URL `${origin}/booking/failed?token=${booking.publicToken}`;
     - update `{ paymentProvider: 'paypal', providerRef: order.id }` with the guarded `updateMany`;
     - return `{ redirectUrl: order.approveUrl }`.
   - Keep the `PAID`/non-`PENDING`/hold-expiry checks unchanged.

**Dependencies:** Phase 1.
**Safety:** No schema change. Do not touch `prisma/schema.prisma`.
**Acceptance:**
- `grep -rn "from 'stripe'" server/utils` returns nothing.
- `tsc --noEmit` passes.
- `server/utils/booking-payments.ts` still exports `getPaypalConfig`, `getGatewayStatus`, `confirmBookingPaid`, `finalizePaidBooking`, `expireHolds`, `purchaseEventId`, `getBookingSettings`.

---

### Phase 3 — Repair PayPal confirmation identity and race handling

**Objective:** Make PayPal webhook and return confirmations match the stored order reference; handle ambiguous capture errors.

**Files/changes:**

1. `server/api/webhooks/paypal.post.ts`
   - Update the header comment (line ~9) that says "see Stripe webhook" → "see PayPal return handler".
   - In the `PAYMENT.CAPTURE.COMPLETED` block:
     - Keep `customId`, `captureId`, amount/currency proof.
     - Derive the order reference:
       ```ts
       const relatedOrderId = body?.resource?.supplementary_data?.related_ids?.order_id as string | undefined
       const existing = customId
         ? await prisma.booking.findUnique({ where: { id: customId }, select: { providerRef: true } })
         : null
       const expectedRef = relatedOrderId || existing?.providerRef || null
       ```
     - Call `confirmBookingPaid(customId, expectedRef, proof)` instead of `confirmBookingPaid(customId, captureId || null, proof)`.
     - Keep `proof.paymentId = captureId || null` so the capture id is persisted in `providerPaymentId`.
   - Leave the `CHECKOUT.ORDER.APPROVED` block unchanged (it already passes `orderId`).
   - Leave signature verification and refund-event handling unchanged.

2. `server/api/bookings/paypal/return.get.ts`
   - In the `catch` block, before redirecting to `failed`, detect an already-captured order:
     ```ts
     const message = String((e as Error)?.message || '')
     if (fresh?.paymentStatus === 'PAID' || /already captured|ORDER_ALREADY_CAPTURED/i.test(message)) {
       return sendRedirect(event, done(ours))
     }
     ```
   - Keep the existing `fresh?.paymentStatus === 'PAID'` redirect and logging.

**Dependencies:** Phase 2 (provider guard is in place).
**Safety:** No schema change. This phase changes only which reference is compared and which page a race redirects to.
**Acceptance:**
- Static: `PAYMENT.CAPTURE.COMPLETED` no longer passes `captureId` as the second argument.
- `tsc --noEmit` passes.
- `confirmBookingPaid` still receives `proof.paymentId` for capture persistence.

---

### Phase 4 — Update gateway API shape and customer booking UI to PayPal-only

**Objective:** Remove `gateways.stripe` from server responses and all customer pages; single PayPal action.

**Server changes:**
1. `server/api/bookings/index.post.ts`
   - Line ~149–150: `if (!gateways.paypal) { ... throw 503 ... }` (remove `!gateways.stripe &&`).
   - Lines 59–69 and 257 return the `gateways` object from `getGatewayStatus()`; it now naturally has only `paypal`. No manual shape change needed.
2. `server/api/bookings/status/[token].get.ts` — no code change; it returns `gateways` from `getGatewayStatus()`.

**Frontend changes:**
3. `app/pages/booking/[slug].vue`
   - Line 50: `const gateways = ref({ paypal: false })`.
   - Line 151: `async function payFor(token: string)`; body stays `{ provider: 'paypal' }`.
   - Line 223 response type: `gateways: { paypal: boolean }`.
   - Template lines 460–490:
     - Section condition → `v-if="createdToken && gateways.paypal"`.
     - Delete the Stripe `<button>`.
     - Keep exactly one PayPal button calling `payFor(createdToken)`.
     - Empty state → `v-if="createdToken && !gateways.paypal"`.
   - Leave `trackInitiateCheckout`, error handling, and navigation unchanged.
4. `app/pages/booking/failed.vue`
   - Line 15: `const retrying = ref(false)`.
   - `retry()` takes no provider; body `{ provider: 'paypal' }`.
   - Delete the Stripe button; keep one PayPal retry button with `:aria-busy="retrying"` and `:disabled="retrying"`.
5. `app/pages/booking/pay/[token].vue`
   - Line 15: fallback → `{ paypal: false }`.
   - `payFor()` takes no provider; body `{ provider: 'paypal' }`.
   - Delete the Stripe button and its spinner; keep one PayPal button.
   - Gate the block on `v-if="gateways?.paypal"`; the `v-else` blocked message stays.
6. `app/pages/booking/success.vue:22`
   - Type → `gateways: { paypal: boolean }` (field is unused; keep for contract accuracy).

**Dependencies:** Phases 1–3.
**Safety:** No availability or booking-creation logic changes. Do not alter the `POST /api/bookings` request body or idempotency behavior.
**Acceptance:**
- `grep -rn "gateways.stripe\|gateways?.stripe\|stripe: boolean\|'stripe' | 'paypal'" app server` returns nothing.
- `tsc --noEmit` passes.
- `npm run build` passes after this phase (or defer to Phase 9 if batching; do not skip the final build).

---

### Phase 5 — Remove Stripe from admin configuration, i18n, and legal template

**Objective:** Admin can configure PayPal only; no Stripe credentials or labels remain in active UI/API.

**Files/changes:**
1. `server/api/admin/settings/payment.get.ts`
   - Delete `stripeEnabled`, `stripePublishableKey`, `hasStripeSecret`, `hasStripeWebhookSecret`.
   - Keep PayPal fields exactly as-is.
2. `server/api/admin/settings/payment.put.ts`
   - Delete the four Stripe `if` blocks (lines ~11–20).
   - Keep PayPal encryption writes and `upsertSiteSettings`.
3. `server/utils/validate.ts:224–234`
   - Remove `stripeEnabled`, `stripePublishableKey`, `stripeSecretKey`, `stripeWebhookSecret` from `paymentSettingsSchema`.
   - Keep PayPal keys and `paypalMode` enum.
4. `app/components/admin/AdminSettingsPayment.vue`
   - Remove `CreditCard` from the lucide import (line 2); keep `KeyRound`, `Power`, `Wallet`.
   - Remove Stripe defaults (`stripeEnabled`, `stripePublishableKey`, `stripeSecretKey`, `stripeWebhookSecret`) from `defaults` (lines 13–16).
   - Remove Stripe entries from `mapData` (24–25) and `buildBody` (31–34).
   - Remove `hasStripeSecret` and `hasStripeWebhookSecret` computed (48–49).
   - Change the "both off" alert condition (57) to `v-if="!form.paypalEnabled"`.
   - Delete the entire `<!-- Stripe -->` card (lines ~64–99).
   - Keep the PayPal card, feedback banner, and save bar unchanged.
5. `app/components/admin/AdminPaymentsPanel.vue:43–46`
   - Remove the `STRIPE` branch. Keep `if (provider === 'PAYPAL') return 'PayPal'` (optionally make it case-insensitive) and the raw fallback for legacy rows.
6. `app/components/admin/AdminBookingsPanel.vue:818`
   - Change the placeholder to reference the PayPal Dashboard, e.g. "e.g. Refunded 23.00 EUR via PayPal Dashboard refund ID …".
7. `i18n/locales/en.json` and `i18n/locales/de.json` (must stay key-parity identical)
   - Remove `payment.stripe`, `payment.publishableKey`, `payment.webhookSecret`, `booking.stripe`.
   - Update `payment.description` to PayPal-only (remove "Stripe and PayPal").
   - Update `payment.bothOff` to a PayPal-only message (e.g. "PayPal is disabled: online booking is blocked until it is enabled.").
   - Do not remove `booking.paypal`, `payment.paypal`, `payment.secretKey`, `payment.clientId`, `payment.webhookId`, `payment.mode*`, `payment.enabled`, `payment.stored`, `payment.notStored`, `payment.title`, `payment.saved`.
8. `app/pages/datenschutz.vue:65–66, 123–124`
   - Replace "Stripe oder PayPal" / "Stripe and/or PayPal" with PayPal-only wording in both language branches.
   - This is a legal template; add no new legal claims. Flag for legal review in section H.

**Dependencies:** Phases 1–4.
**Safety:** Do not delete encrypted Stripe values from the database. They remain dormant; removal would require a human-approved migration and is out of scope.
**Acceptance:**
- `grep -rn "stripe\|Stripe" server/api/admin/settings app/components/admin/AdminSettingsPayment.vue app/components/admin/AdminPaymentsPanel.vue i18n app/pages/datenschutz.vue` returns nothing (case-insensitive).
- i18n key counts in `de.json` and `en.json` remain equal (`node -e` count or a diff of sorted keys).
- `tsc --noEmit` passes.

---

### Phase 6 — Delete Stripe route, CSP allowances, dependency, and stale scripts

**Objective:** Remove executable Stripe surface and the unused package.

**Files/changes:**
1. Delete `server/api/webhooks/stripe.post.ts`.
2. `server/middleware/security-headers.ts`
   - Remove `https://js.stripe.com` from `script-src` and `frame-src`.
   - Remove `https://api.stripe.com` from `connect-src`.
   - Keep PayPal, Meta, Firebase, Google entries and report-only mode.
3. `package.json`
   - Remove the `stripe` dependency (line 46).
   - Run `npm uninstall stripe --no-audit --no-fund` (updates `package-lock.json` and `node_modules`; no registry call is required for removal). Do not hand-edit the lockfile.
   - If `npm uninstall` fails offline, stop and report a blocker; do not leave `package.json` and the lockfile inconsistent.
4. Scripts:
   - Delete `scripts/verify-stripe-webhook.mjs`.
   - `scripts/verify-booking-gateway.mjs`: replace the three Stripe assertions with PayPal-only assertions on `gatewayStatusFromSettings` (`{ paypalEnabled: true, paypalClientId: 'x', paypalSecret: 'enc' }` → `paypal === true`; missing secret/client → false; disabled → false). Keep the rest of the script.
   - `scripts/verify-2e.mjs` (lines 162, 182, 202) and `scripts/verify-duration-phase1.mjs` (line 90): change fixture `paymentProvider: 'stripe'` → `'paypal'`.
   - `scripts/verify-8.mjs:4`: update the comment to "PayPal sandbox paths require sandbox keys."
   - `scripts/verify-2c.mjs`: leave as-is (pure provider-agnostic helper tests). Optional cleanup of `cs_*` names is not required.

**Dependencies:** Phases 1–5.
**Safety:** Deleting the Stripe webhook removes the route; any external Stripe webhook configuration becomes inert. Do not touch historical migrations or DB columns.
**Acceptance:**
- `test ! -f server/api/webhooks/stripe.post.ts`.
- `grep -rn "from 'stripe'" server app scripts` returns nothing.
- `grep -n '"stripe"' package.json package-lock.json` returns nothing.
- `npm ls stripe` reports empty (not installed).

---

### Phase 7 — Documentation alignment

**Objective:** Documentation describes PayPal-only behavior and marks historical Stripe material as superseded.

**Files/changes:**
1. `Docs/00-master-plan.md`
   - Line 8: replace "Stripe + PayPal deposit payments" with "PayPal deposit payments".
   - Line 40: "Stripe and PayPal, verified server-side via webhooks" → "PayPal, verified server-side via capture + webhook".
   - Line 64: "Stripe/PayPal deposits + webhooks" → "PayPal deposits + webhooks"; note sandbox verification pending.
2. `Docs/02-sitemap.md:79`
   - Webhooks line → `/api/webhooks/paypal` only.
3. `Docs/STRIPE-SANDBOX-VERIFICATION.md`
   - Add a one-line banner at the top: `> Historical document. Stripe has been removed; PayPal is the sole provider. See Docs/STRIPE_REMOVAL_PAYPAL_IMPLEMENTATION_PLAN.md.` Do not delete the file.
4. `Docs/FULL-WEBSITE-REMEDIATION.md`
   - Update current-state references (platform line 3, P1-04 files line 91, P2-06 CSP line 220, INFO-04 line 686, verification lines 751/815) from "Stripe/PayPal" to "PayPal". Do not rewrite unrelated audit findings.
5. `Docs/manual-qa/01-public-customer-journey.md`, `02-admin-staff-operations.md`, `03-manual-test-cases.md`
   - Replace Stripe/PayPal choice language with PayPal-only. Keep test IDs; change TC-037's "Disable both Stripe and PayPal" to "Disable PayPal".
6. Add this plan to the documentation index only if the repo has one (no index file found; skip).

**Dependencies:** Phases 1–6.
**Safety:** Documentation only.
**Acceptance:** `grep -rn "Stripe" Docs` returns only `Docs/STRIPE-SANDBOX-VERIFICATION.md` (banner + historical body) and historical audit/report files explicitly marked historical. No current-behavior doc claims Stripe support.

---

### Phase 8 — Focused tests

**Objective:** Add cheap, credential-free regression coverage for the confirmation invariants.

**Files/changes:**
1. Add `tests/booking-confirm.test.ts` using `node:test` + `node:assert/strict`, importing `../server/utils/booking-confirm.ts` (pure, no Prisma). Cover:
   - `isExpectedAmount(2300, 'EUR', 2300, 'EUR') === true`.
   - `isExpectedAmount(2299, 'EUR', 2300, 'EUR') === false` (cents differ).
   - `isExpectedAmount(2300, 'USD', 2300, 'EUR') === false` (currency differs).
   - `isExpectedAmount(null, 'EUR', 2300, 'EUR') === false`.
   - `decideConfirmation(PAID, same ref) === 'already-paid'`.
   - `decideConfirmation(PENDING, different ref) === 'mismatch'`.
   - `decideConfirmation(EXPIRED, same ref) === 'mismatch'`.
   - `decideLatePayment(EXPIRED, correct amount, slotFree=true) === 'confirm'`.
   - `decideLatePayment(EXPIRED, correct amount, slotFree=false) === 'flag-refund'`.
2. `tests/booking-domain.test.ts`
   - Add one assertion: `assert.deepEqual([...PAYMENT_PROVIDERS], ['paypal'])`.
   - Import `PAYMENT_PROVIDERS` from `../shared/booking.ts`.
3. `package.json` `test` script
   - Append `tests/booking-confirm.test.ts` to the explicit file list (the script lists files, it does not glob).

**Dependencies:** Phase 1 (narrowed constant) and Phase 3 (confirmation semantics unchanged in the pure helper).
**Safety:** No DB, no network, no credentials.
**Acceptance:** `npm test` runs the new file; only the two documented environment-dependent failures remain (if the same container/ICU is used). New assertions pass.

---

### Phase 9 — Final static and targeted verification

**Objective:** Prove Stripe removal is complete and PayPal wiring is internally consistent.

**Commands (run in order, record exit codes):**
```bash
npx prisma validate
node_modules/.bin/tsc --noEmit
npm test
npm run build
```
Then static audits:
```bash
grep -rn "from 'stripe'" server app scripts || echo "OK: no stripe imports"
grep -rn "stripe" server app shared i18n package.json || echo "OK: no stripe references"
test ! -f server/api/webhooks/stripe.post.ts && echo "OK: stripe webhook deleted"
grep -n "stripe" prisma/schema.prisma prisma/migrations/20261011124111_booking_system/migration.sql
```
The last grep is expected to show the dormant columns and the historical migration; this is the only permitted residual. Do not remove them.

**Runtime smoke (local dev only, no payments):**
- Start the dev server against the local dev DB.
- `GET /api/bookings/status/<invalid>` → 404.
- `POST /api/bookings/<invalid>/pay` with `{ provider: 'paypal' }` → 404 (not a 500).
- `POST /api/bookings/<invalid>/pay` with `{ provider: 'stripe' }` → 400 validation error.
- `GET /api/webhooks/stripe` → 404 (route deleted).
- `GET /api/admin/settings/payment` (authenticated) → no `stripe*` keys.
- Do not create a booking or call PayPal unless Sandbox credentials are configured and the human explicitly approves.

**Acceptance:**
- All commands exit 0 (except the documented pre-existing test failures).
- No Stripe imports, routes, UI labels, CSP entries, or dependency.
- `prisma/schema.prisma` unchanged from baseline.

---

## D. File-Level Change Inventory

| # | Path | Current responsibility | Action | Required behavior | Dependencies / risks |
|---|---|---|---|---|---|
| 1 | `shared/booking.ts` | Provider constant | Modify (line 9) | `PAYMENT_PROVIDERS = ['paypal']` | Phase 1; legacy DB strings unaffected |
| 2 | `server/utils/validate.ts` | Zod payment schemas | Modify (`paymentSettingsSchema`) | No Stripe keys; `bookingPaySchema` now PayPal-only via constant | Phase 1/5; unknown keys stripped |
| 3 | `server/utils/booking-payments.ts` | Gateway config + confirmation core | Modify | Remove Stripe import/config; PayPal-only gateway; provider guard; duplicate-charge flag | Phase 2; preserve lock/overlap logic |
| 4 | `server/utils/refunds.ts` | Deposit refunds | Modify | Remove Stripe branch/import; PayPal-only | Phase 2; legacy Stripe refunds become OUTSIDE |
| 5 | `server/utils/booking-cancel.ts` | Cancellation + auto-refund | Modify (line 85) | Auto-refund only for `paypal` | Phase 2 |
| 6 | `server/api/bookings/[token]/pay.post.ts` | Payment attempt creation | Modify | Remove Stripe branch/config; PayPal-only; keep guarded providerRef write | Phase 2 |
| 7 | `server/api/webhooks/paypal.post.ts` | PayPal webhook | Modify | Pass stored/related **order** id; keep capture id as `providerPaymentId`; update comment | Phase 3; critical bug fix |
| 8 | `server/api/bookings/paypal/return.get.ts` | PayPal return capture | Modify | Treat already-captured as success (poll), not failure | Phase 3 |
| 9 | `server/api/bookings/index.post.ts` | Booking creation | Modify (gateway check) | Refuse only when `!gateways.paypal` | Phase 4; availability untouched |
| 10 | `server/api/bookings/status/[token].get.ts` | Public status | No change | Returns gateway status | Phase 4 |
| 11 | `app/pages/booking/[slug].vue` | Booking form + pay choice | Modify | Single PayPal button; `{paypal}` type/state | Phase 4 |
| 12 | `app/pages/booking/failed.vue` | Retry UI | Modify | Single PayPal retry | Phase 4 |
| 13 | `app/pages/booking/pay/[token].vue` | Pay-link page | Modify | Single PayPal action | Phase 4 |
| 14 | `app/pages/booking/success.vue` | Success/poll | Modify (type only) | `gateways: { paypal: boolean }` | Phase 4 |
| 15 | `server/api/admin/settings/payment.get.ts` | Admin gateway config read | Modify | PayPal fields only | Phase 5 |
| 16 | `server/api/admin/settings/payment.put.ts` | Admin gateway config write | Modify | PayPal writes only | Phase 5 |
| 17 | `app/components/admin/AdminSettingsPayment.vue` | Admin payment UI | Modify | Remove Stripe card/defaults/computeds/import | Phase 5 |
| 18 | `app/components/admin/AdminPaymentsPanel.vue` | Refund queue labels | Modify | Remove Stripe label branch | Phase 5 |
| 19 | `app/components/admin/AdminBookingsPanel.vue` | Refund note placeholder | Modify (line 818) | PayPal wording | Phase 5 |
| 20 | `i18n/locales/en.json` | UI strings | Modify | Remove Stripe keys; PayPal-only copy; keep parity | Phase 5 |
| 21 | `i18n/locales/de.json` | UI strings | Modify | Same keys as EN | Phase 5 |
| 22 | `app/pages/datenschutz.vue` | Privacy template | Modify | PayPal-only wording; legal review flag | Phase 5 |
| 23 | `server/api/webhooks/stripe.post.ts` | Stripe webhook | **Delete** | Route absent | Phase 6 |
| 24 | `server/middleware/security-headers.ts` | CSP | Modify | Remove Stripe hosts | Phase 6 |
| 25 | `package.json` | Dependencies | Modify | Remove `stripe` | Phase 6; use `npm uninstall` |
| 26 | `package-lock.json` | Lockfile | Modify via npm only | No `stripe` | Phase 6; never hand-edit |
| 27 | `scripts/verify-stripe-webhook.mjs` | Stripe webhook test | **Delete** | Removed | Phase 6 |
| 28 | `scripts/verify-booking-gateway.mjs` | Gateway assertions | Modify | PayPal-only assertions | Phase 6 |
| 29 | `scripts/verify-2e.mjs` | Fixtures | Modify (3 lines) | `paymentProvider: 'paypal'` | Phase 6 |
| 30 | `scripts/verify-duration-phase1.mjs` | Fixture | Modify (1 line) | `paymentProvider: 'paypal'` | Phase 6 |
| 31 | `scripts/verify-8.mjs` | Comment | Modify (line 4) | PayPal wording | Phase 6 |
| 32 | `tests/booking-confirm.test.ts` | New unit tests | **Add** | Amount/currency/replay/late-payment | Phase 8 |
| 33 | `tests/booking-domain.test.ts` | Domain tests | Modify | Assert `PAYMENT_PROVIDERS === ['paypal']` | Phase 8 |
| 34 | `package.json` `test` script | Test file list | Modify | Include new test file | Phase 8 |
| 35 | `Docs/00-master-plan.md` | Current plan | Modify | PayPal-only | Phase 7 |
| 36 | `Docs/02-sitemap.md` | Route inventory | Modify | Remove Stripe webhook | Phase 7 |
| 37 | `Docs/STRIPE-SANDBOX-VERIFICATION.md` | Historical Stripe report | Modify (banner) | Mark superseded | Phase 7 |
| 38 | `Docs/FULL-WEBSITE-REMEDIATION.md` | Remediation report | Modify (targeted) | Current-state PayPal-only | Phase 7 |
| 39 | `Docs/manual-qa/01-public-customer-journey.md` | Manual QA | Modify | PayPal-only | Phase 7 |
| 40 | `Docs/manual-qa/02-admin-staff-operations.md` | Manual QA | Modify | PayPal-only | Phase 7 |
| 41 | `Docs/manual-qa/03-manual-test-cases.md` | Manual QA | Modify | PayPal-only; TC-037 | Phase 7 |
| 42 | `prisma/schema.prisma` | DB schema | **No change** | Dormant Stripe columns retained | Do not migrate/drop |
| 43 | `prisma/migrations/**` | History | **No change** | Historical | Never edit |

---

## E. Database and Migration Decision

**Decision: no migration.**

- `Booking.paymentProvider` and `BookingRefund.provider` are free-form `String` columns; `'paypal'`, `'manual'`, and legacy `'stripe'` values remain storable/readable. Narrowing the application enum does not require DDL.
- `SiteSettings.stripe*` columns become dormant. Removing them would be a destructive schema change, is not required for PayPal-only behavior, and risks data loss. Do not remove them.
- `Booking.providerPaymentId`, `providerRef`, `needsRefund`, `refundStatus` already support the target lifecycle.
- No `prisma db push`, `migrate dev`, `migrate reset`, or `migrate deploy` is permitted in this task.
- If a future cleanup of Stripe columns is desired, it requires a separate human-approved migration with a verified backup; out of scope here.
- Existing booking/payment/refund records must not be deleted or rewritten.

---

## F. Verification Plan

### F.1 Local checks (no external credentials, no payments)

| Check | Command | Pass criterion |
|---|---|---|
| Schema valid | `npx prisma validate` | exit 0 |
| Types | `node_modules/.bin/tsc --noEmit` | exit 0 |
| Unit tests | `npm test` | new tests pass; only the two documented ICU/TZ failures may remain |
| Build | `npm run build` | exit 0 |
| No Stripe imports | `grep -rn "from 'stripe'" server app scripts` | no output |
| No Stripe runtime refs | `grep -rni "stripe" server app shared i18n package.json` | no output |
| Stripe route gone | `test ! -f server/api/webhooks/stripe.post.ts` | true |
| Dependency gone | `npm ls stripe` | empty |
| Schema untouched | compare `prisma/schema.prisma` to baseline | identical |
| i18n parity | count keys in `de.json`/`en.json` | equal |
| Route smoke (dev server, no payment) | `POST /api/bookings/x/pay` `{provider:'stripe'}` → 400; `{provider:'paypal'}` → 404; `GET /api/webhooks/stripe` → 404 | as stated |

### F.2 PayPal Sandbox checks (require explicit configuration + human approval)

These cannot be claimed as passed without credentials and a running isolated dev/staging server.

1. **Order creation:** configure Sandbox client id/secret, enable PayPal. Create a booking, click PayPal, confirm redirect to `sandbox.paypal.com` and that the order amount equals `depositCents` and currency equals salon currency.
2. **Approval + capture:** approve with a Sandbox buyer. Verify return: booking becomes `PAID`, `providerRef` = PayPal order id, `providerPaymentId` = capture id, `holdExpiresAt` cleared, `needsRefund` false, staff auto-assigned when chosen, confirmation mail queued, success page shows PAID.
3. **Webhook confirmation without browser return:** close the browser at PayPal after approval. Verify `CHECKOUT.ORDER.APPROVED` or `PAYMENT.CAPTURE.COMPLETED` confirms the booking.
4. **Duplicate webhook:** replay the same `PAYMENT.CAPTURE.COMPLETED` event. Verify 200, no state change, no duplicate mail/notification, no second CAPI Purchase.
5. **Duplicate charge:** create two orders (two pay attempts), pay both. Verify the second capture sets `needsRefund = true` and notifies admins; booking stays PAID for the first.
6. **Amount/currency mismatch:** use a Sandbox order with a different amount (or unit-test `isExpectedAmount`). Verify `needsRefund` and no confirmation.
7. **Cancelled/abandoned:** cancel at PayPal. Verify booking stays `PENDING` until hold expiry → `EXPIRED`; slot becomes available; retry creates a new order.
8. **Slot conflict:** create a competing booking for the same slot while the first is PENDING (hold lapsed or cancelled), then complete the first payment. Verify `needsRefund = true`, `paymentStatus = EXPIRED`, admin notification, no overlap.
9. **Refund:** cancel a PAID booking within policy. Verify PayPal refund succeeds, `BookingRefund.status = SUCCEEDED`, `refundStatus = SUCCEEDED`, one refund row (idempotency key).
10. **Refund failure:** use a capture id that cannot be refunded. Verify `FAILED`, admin notification, booking remains flagged.
11. **Concurrency (local, non-destructive):** run `node scripts/verify-race.mjs` only with explicit approval; it creates and cleans up marked test data. Do not run against production.
12. **Legacy Stripe booking:** a `PAID` booking with `paymentProvider = 'stripe'` must still render; cancelling it must produce `refundStatus = 'OUTSIDE'` and a manual-refund notification, with no Stripe API call.

### F.3 Explicitly out of scope for automated runs

- No real payments, no live keys, no production webhook endpoints.
- No migration execution.
- No browser automation unless the repo's existing setup is used and the human approves.

---

## G. Execution Checklist

- [ ] Phase 0: record `prisma validate`, `tsc --noEmit`, `npm test` baselines.
- [ ] Phase 1: narrow `PAYMENT_PROVIDERS` to `['paypal']`.
- [ ] Phase 2: remove Stripe from `booking-payments.ts`, `refunds.ts`, `booking-cancel.ts`, `pay.post.ts`; add provider + duplicate-charge guards.
- [ ] Phase 3: fix PayPal webhook order/capture reference; handle already-captured on return.
- [ ] Phase 4: PayPal-only gateway shape in `bookings/index.post.ts`; update 4 customer pages.
- [ ] Phase 5: remove Stripe from admin payment API/UI, i18n (both locales), legal template.
- [ ] Phase 6: delete Stripe webhook; remove Stripe CSP hosts; `npm uninstall stripe`; update/delete scripts.
- [ ] Phase 7: update master plan, sitemap, remediation, manual QA, Stripe sandbox banner.
- [ ] Phase 8: add `tests/booking-confirm.test.ts`; update `booking-domain.test.ts`; add to `test` script.
- [ ] Phase 9: run `prisma validate`, `tsc --noEmit`, `npm test`, `npm run build`, static greps, local route smoke.
- [ ] Do not modify `prisma/schema.prisma` or migrations.
- [ ] Do not run migrations, Git commands, or real payments.
- [ ] Report any command that fails with its exact output.

---

## H. Final Handoff

**Plan path:** `Docs/STRIPE_REMOVAL_PAYPAL_IMPLEMENTATION_PLAN.md`

**Required execution order:** Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Do not reorder. Re-run `tsc --noEmit` after each phase.

**Blockers requiring human input:**
1. **PayPal Sandbox credentials and webhook ID** are required to execute section F.2. Without them, PayPal runtime behavior remains unverified. Configure them in Admin → Settings → Payment (Sandbox mode) and never commit or print them.
2. **Legal review** of `app/pages/datenschutz.vue` payment-provider wording (PayPal-only) before publication.
3. **Product decision:** legacy Stripe-paid bookings will no longer be auto-refundable; they become manual (`OUTSIDE`). Confirm this is acceptable.
4. **Dependency removal:** if `npm uninstall stripe` cannot update `package-lock.json` in the environment, stop and report; do not hand-edit the lockfile.

**Checks that must be performed manually:**
- PayPal Sandbox order/approval/capture/webhook/replay/double-charge/refund scenarios (F.2).
- Visual confirmation that admin payment settings show PayPal only and that no Stripe labels remain.
- Legal text review.
- Confirmation that existing legacy Stripe bookings still render and can be manually refunded.

**Verification honesty:** Passing static checks and `npm run build` does not prove PayPal works. Do not claim PayPal is verified until section F.2 has actually been executed with Sandbox evidence.
