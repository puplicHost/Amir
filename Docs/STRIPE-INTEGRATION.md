# Stripe Sandbox Integration

Status: implemented in code. **Test mode only.** End-to-end payment verification
requires Stripe Sandbox credentials and a publicly reachable webhook; those are
manual owner steps (section 6).

## 1. Scope and architecture

Stripe runs **alongside** PayPal. Customers choose a provider after the booking
hold is created:

| Step | File |
|---|---|
| Provider selection / order creation | `server/api/bookings/[token]/pay.post.ts` |
| Stripe Checkout Session | created server-side; amount and currency come from the booking snapshot (`depositCents`, `settings.currency`) |
| Success return | `server/api/bookings/stripe/return.get.ts` |
| Webhook | `server/api/webhooks/stripe.post.ts` |
| Confirmation core (shared with PayPal) | `server/utils/booking-payments.ts` → `confirmBookingPaid()` |
| Refunds | `server/utils/refunds.ts` (Stripe refund on the PaymentIntent) |
| Admin settings | `server/api/admin/settings/payment.get.ts` / `.put.ts`, `app/components/admin/AdminSettingsPayment.vue` |
| Customer UI | `app/pages/booking/[slug].vue`, `booking/failed.vue`, `booking/pay/[token].vue` |
| Admin finance | `app/components/admin/AdminPaymentsPanel.vue` (confirmed payments list + totals) |

Provider values: `stripe` and `paypal` (`shared/booking.ts` → `PAYMENT_PROVIDERS`).
`Booking.paymentProvider` is a free string; no schema change is required.

### Confirmation rules

A booking becomes `PAID` only after the server verifies the payment:

- **Return route:** retrieves the Checkout Session from Stripe, checks
  `payment_status === 'paid'`, `amount_total === booking.depositCents`,
  currency equality, `metadata.bookingId`, and `booking.providerRef === session.id`.
  The redirect query alone is never proof.
- **Webhook:** verifies the `stripe-signature` against the **raw body** using the
  webhook secret, then runs the same confirmation core.
- Both paths call `confirmBookingPaid(..., expectedProvider = 'stripe')`, which:
  - rejects a callback for a different provider or a manual booking,
  - validates exact cents + currency,
  - serializes on the salon/day advisory lock and re-checks the slot,
  - flips `PENDING → PAID` exactly once, stores `providerRef` (session id) and
    `providerPaymentId` (PaymentIntent id), and auto-assigns the chosen staff,
  - is idempotent for duplicate returns/webhooks; a second distinct charge is
    flagged `needsRefund` and admins are notified,
  - never marks a booking paid when the slot is gone (flags for refund instead).

`checkout.session.expired` marks a still-PENDING Stripe booking `EXPIRED` and
releases the hold. Failed/cancelled checkout returns go to `/booking/failed`,
where the customer can retry with Stripe or PayPal.

## 2. Environment variables

Add these to the deployment environment (or `.env` locally). `.env.example`
contains placeholders only; never commit real keys.

| Variable | Required | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes (or admin secret) | `sk_test_...` from the Stripe Dashboard in **Test mode**. `sk_live_...` is rejected unless `STRIPE_ALLOW_LIVE=true`. |
| `STRIPE_PUBLISHABLE_KEY` | optional | `pk_test_...`; hosted Checkout redirect does not need it. Displayed/saved for future Elements use. |
| `STRIPE_WEBHOOK_SECRET` | for webhooks | `whsec_...` shown when the webhook endpoint is created. Without it, `/api/webhooks/stripe` returns 400; the success-return route still verifies the session. |
| `STRIPE_ALLOW_LIVE` | no | Leave `false`/empty for Sandbox. Only set `true` for a deliberate live rollout. |

Credentials can also be entered in **Admin → Settings → Payment → Stripe**.
They are AES-256-GCM encrypted using the existing settings convention. Server
env credentials take precedence. If `STRIPE_SECRET_KEY` is set, Stripe is
treated as available without writing the admin switch.

## 3. Stripe Dashboard setup (manual owner step)

1. Open <https://dashboard.stripe.com/test/apikeys> and confirm the dashboard is
   in **Test mode**.
2. Copy the **Secret key** (`sk_test_...`) and optionally the **Publishable key**.
3. Create the webhook endpoint:
   - Developers → Webhooks → **Add endpoint**
   - Endpoint URL: `https://<your-public-host>/api/webhooks/stripe`
   - Localhost is not reachable by Stripe. For local testing use a tunnel
     (e.g. Stripe CLI `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
     or an HTTPS tunnel) and never hardcode the tunnel host in the app.
   - Events to subscribe:
     - `checkout.session.completed` (required)
     - `checkout.session.async_payment_succeeded` (delayed payment methods)
     - `checkout.session.expired` (releases the hold early)
     - `charge.refunded`, `refund.created`, `refund.updated` (refund tracking)
4. Copy the endpoint's **Signing secret** (`whsec_...`) into
   `STRIPE_WEBHOOK_SECRET` (or the admin field).
5. Confirm the webhook belongs to the same Stripe account/mode as the API keys.

## 4. Test payment methods

Use Stripe's official test cards (Test mode only):

| Scenario | Card number |
|---|---|
| Successful payment | `4242 4242 4242 4242` |
| Decline | `4000 0000 0000 9995` |
| 3-D Secure required | `4000 0025 0000 3155` |

Use any future expiry, any 3-digit CVC, and any postal code. Reference:
<https://docs.stripe.com/testing>.

## 5. How to verify a test payment

1. Create a booking and choose **Stripe**.
2. Pay with a test card on the Stripe Checkout page.
3. You are redirected to `/api/bookings/stripe/return?b=...&session_id=...`,
   which verifies the session server-side and then redirects to the success page.
4. Confirm in the database / Admin → Finance:
   - `Booking.paymentStatus = 'PAID'`
   - `paymentProvider = 'stripe'`
   - `providerRef` starts with `cs_` (Checkout Session id)
   - `providerPaymentId` starts with `pi_` (PaymentIntent id)
   - amount equals the deposit snapshot (EUR cents)
5. Admin → Finance → Payments shows the row in **Confirmed payments** and
   includes it once in **Collected deposits** / **Paid bookings**.
6. Replay the webhook from the Stripe Dashboard (or re-open the return URL):
   no duplicate confirmation, no duplicate mail/notification, no second charge.

## 6. Manual steps still required

- Provide Sandbox credentials (env or admin UI).
- Register the public webhook endpoint and copy its signing secret.
- Run one Sandbox end-to-end payment (section 5). Until then the integration is
  **not** end-to-end verified.
- Legal review of the Stripe/PayPal payment-provider wording in
  `app/pages/datenschutz.vue` before publication.

## 7. Troubleshooting

| Symptom | Cause / action |
|---|---|
| `Stripe is currently unavailable` | No secret configured, or Stripe disabled. Set `STRIPE_SECRET_KEY` or enable Stripe in admin and save a `sk_test_...` secret. |
| `Stripe live keys are disabled` | A `sk_live_...` key was supplied. Use test keys, or set `STRIPE_ALLOW_LIVE=true` only for a deliberate live rollout. |
| Webhook returns `400 Missing webhook signature` | The request did not come from Stripe or the `stripe-signature` header was stripped by a proxy. |
| Webhook returns `400 Stripe webhook not configured` | `STRIPE_WEBHOOK_SECRET` (or the admin webhook secret) is missing. |
| Webhook returns `400 Invalid webhook signature` | Wrong signing secret, wrong mode/account, or the raw body was modified before verification. |
| Payment succeeds at Stripe but booking stays `PENDING` | The return route was not reached and the webhook is not configured/reachable. Configure the webhook; check server logs for `[stripe-return]`. Do not mark the booking paid manually. |
| Return shows Payment Incomplete | Session not `paid`, amount/currency mismatch, metadata mismatch, or `providerRef` mismatch. Check `[stripe-return]` logs; the booking is never confirmed on a failed check. |

## 8. Notes

- No database migration was applied or required. The Stripe settings columns
  (`SiteSettings.stripe*`) already exist in the schema; `Booking.paymentProvider`
  is a free string and accepts `stripe`.
- PayPal behavior is unchanged; both providers share the same confirmation,
  slot-race, refund, and notification logic.
- Live Stripe payments are intentionally disabled by default.
