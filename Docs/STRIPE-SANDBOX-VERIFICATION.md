# Stripe SANDBOX Readiness — Verification Report

> Historical document. Stripe has been removed; PayPal is the sole provider. See `Docs/STRIPE_REMOVAL_PAYPAL_IMPLEMENTATION_PLAN.md`.

Date: 2026-10-21 · Scope: TEST mode only — no live keys, no live API calls, no secret values printed anywhere.

## Final verdict

`SANDBOX WEBHOOK PATH: VERIFIED (20/20 automated checks) — FULL HOSTED-CHECKOUT E2E: BLOCKED ON 2 USER ACTIONS`

The webhook→booking confirmation pipeline (`POST /api/webhooks/stripe`) is proven
end-to-end against the real Nitro route with locally signed Stripe-style events.
What remains unverified requires a valid TEST-mode secret key and an
authenticated Stripe CLI session, which only the user can provide (see
"User actions required").

## What ran (all green)

1. `node --env-file=.env scripts/verify-stripe-webhook.mjs` — **20 passed, 0 failed**
   Real route, real DB, per-run locally generated `whsec_*` (installed for the
   run, restored afterwards; never printed/persisted).
2. `scripts/verify-race.mjs` — all scenarios pass (slot races, half-open
   intervals, availability privacy, time-off exclusion).
3. `scripts/verify-5.mjs` — 9/9 (manual bookings, pay links, reschedule, calendar).
4. `scripts/verify-booking-gateway.mjs` — **20/20** (now self-contained:
   creates its own STAFF fixture + widens hours, restores both afterwards).

Cleanup in every run: test bookings/notifications deleted, hours restored,
webhook secret restored to its previous state (currently **not set**).

## Webhook checks covered (scripts/verify-stripe-webhook.mjs)

| Check | Result |
|---|---|
| T4a/b missing + invalid signature → 400 before any state change | ok |
| T6 session without bookingId / unrelated event type → ack, untouched | ok |
| T1 completed+paid → PENDING→PAID, hold cleared, providerRef + paymentIntent persisted | ok |
| T1d confirmation side effect: customer mail queued in notificationOutbox | ok |
| T5 duplicate (replayed) delivery → no new write, no extra mail | ok |
| T10 3 concurrent identical deliveries → exactly one PAID, all acked | ok |
| T9a wrong `amount_total` → stays PENDING + `needsRefund`, never confirmed | ok |
| T9b wrong `currency` → stays PENDING + `needsRefund` | ok |
| T-unpaid `completed` with `payment_status: unpaid` (delayed methods) → no-op | ok |
| T-async-ok `checkout.session.async_payment_succeeded` → confirmed PAID | ok |
| T-async-fail `checkout.session.async_payment_failed` → deliberate no-op | ok |
| T7 late payment after hold expiry, slot still free → honored PAID | ok |
| T7-TAKEN slot taken meanwhile → never confirmed, flagged for review | ok |
| T-stale event for superseded attempt (providerRef mismatch) → flagged | ok |

## Code change in this task (server/api/webhooks/stripe.post.ts)

Confirmed-defect fix only, no business-rule changes:

- `checkout.session.completed` now refuses to confirm unless
  `session.payment_status === 'paid'` — previously a `completed` event from a
  delayed-payment method (giropay/sofort-style) could confirm an unpaid booking.
- Added `checkout.session.async_payment_succeeded` → confirm (validates paid
  status, amount, currency, providerRef).
- `checkout.session.async_payment_failed` → deliberate no-op (the existing
  hold-expiry sweeper already handles the failure path).
- Shared `confirmPaidSession` helper extracted; header comments updated.

### Honest correction

An earlier harness run reported 7 failures suspected to be app defects on the
refund-flag / late-payment paths. Root cause was a **harness bug** (double-nested
session overrides produced `bookingId: missing`). After fixing the payload
shapes, the same scenarios pass with correct state transitions — no app defect
on those paths. Hypothesis withdrawn.

## Environment facts (A: confirmed, not assumptions)

- Stripe CLI **not installed / not authenticated**.
- `stripeEnabled=true`; `defaultCurrency=EUR`; `ENCRYPTION_KEY` present; stored
  secret decrypts cleanly.
- Stored secret key exists but is **invalid in shape** (~13 printable chars, no
  `sk_test_`/`rk_test_` prefix) → any real Stripe call would 401. This is the
  **primary blocker** for hosted Checkout.
- `stripeWebhookSecret` (stored) is currently **empty** — safe fallback state;
  webhook route 400s unsigned/invalid-signature traffic.
- Pre-existing, unrelated: migration `20261019000000_booking_range_indexes`
  not applied.

## User actions required (in order)

1. Install + authenticate Stripe CLI:
   `brew install stripe/stripe-cli/stripe` (macOS) or download release; then
   `stripe login` (interactive browser pairing).
2. Get a valid TEST key from Dashboard → Developers → API keys and paste it in
   Admin → Settings → Payment (replaces the invalid stored key).
3. Start forwarding:
   `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   → copy the printed `whsec_...` into Admin → Settings → Payment.
4. Full E2E: book a service → Chrome to `/booking/pay/<token>` → Success:
   `4242 4242 4242 4242` (any future expiry/CVC); Insufficient funds:
   `4000 0000 0000 9995`; cancel at Checkout (T3). Watch bookings turn PAID /
   stay PENDING + EXPIRE after ~20 min hold.
5. Delayed-method path (T8): trigger `checkout.session.async_payment_succeeded`
   via the CLI to re-confirm the async path with real Stripe payloads.

## giropay / girocard assessment (Stage F)

- **Cannot be verified from code alone** — eligibility is account-level and must
  be confirmed in Dashboard → Settings → Payment methods (EUR currency required).
- girocard support via Checkout is **not** generic card-network support; the
  automated `sk_*`-key + test-card flow above does NOT prove girocard.
- Untested assumption until the user confirms Dashboard availability: giropay
  placeholder will not appear in Checkout for EUR sessions.

## Artifacts

- `scripts/verify-stripe-webhook.mjs` (new harness, kept as regression suite)
- `scripts/verify-booking-gateway.mjs` (self-contained fixture fix)
- `server/api/webhooks/stripe.post.ts` (deferred-payment + async fixes)
- `.env.bak` (gitignored backup of `.env` created before this task; `.env` content unchanged practically)
