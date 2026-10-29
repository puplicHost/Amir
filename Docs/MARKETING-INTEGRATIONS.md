# Marketing & Advertising Integrations

AMIR supports consent-aware advertising integrations for Meta Ads, Google Ads,
TikTok Ads, Snapchat Ads and Pinterest Ads from the Super-Admin page
`/admin/marketing`.

A saved configuration is **not** a verified connection. The admin UI distinguishes
`Not configured`, `Incomplete`, `Configured but unverified`, `Verified`,
`Disabled` and `Needs attention`. Only Meta currently has a real, non-conversion
verification call; the other providers validate configuration locally and never
report a fake "Connected" state.

## Provider capabilities

| Provider | Browser tag/pixel | Server events | Verification |
| --- | --- | --- | --- |
| Meta Ads | Meta Pixel | Conversions API (Graph v19.0) | Pixel + token read check; optional Test Events page view |
| Google Ads | Google tag (`AW-…`) | Not implemented | Local configuration validation only |
| TikTok Ads | TikTok Pixel | Events API 1.3 | Local configuration validation only |
| Snapchat Ads | Snap Pixel | Conversions API v2 | Local configuration validation only |
| Pinterest Ads | Pinterest Tag | Conversions API v5 | Local configuration validation only |

### Meta Ads

Fields:

- **Pixel ID** — numeric only. Legacy placeholder values such as an email
  address are rejected and excluded from the public browser configuration.
- **Conversions API access token** — encrypted at rest, never returned by any
  API, and replaced only when a new value is entered. Leaving the field blank
  keeps the stored token; the explicit **Clear** checkbox removes it.
- **Test Event Code** (optional) — testing only. While it is set in production,
  server delivery is suppressed rather than sent as a real conversion unless
  `META_CAPI_ALLOW_TEST_EVENTS=true` is set explicitly.

Verification checks that the token can read the configured Pixel. If a Test
Event Code is configured (and allowed), it also sends a **PageView** to Meta
Test Events; it never sends a conversion. A successful local save is never
reported as a successful verification.

Docs: https://developers.facebook.com/docs/marketing-api/conversions-api/

### Google Ads

Fields:

- **Conversion ID** (`AW-…`) — public tag ID.
- **Conversion label** — required for the deposit conversion action.

Only `DepositPaid` is supported: the browser sends a Google Ads conversion for
the server-verified deposit. GA4 event names are intentionally not used because
an `AW-` tag does not prove GA4 is configured. Server-side upload is not
implemented: it requires OAuth credentials, a developer token, customer and
conversion IDs, and click-ID capture.

Docs: https://support.google.com/google-ads/answer/6095821

### TikTok Ads

Fields: Pixel ID and Events API access token. Browser events use the TikTok
Pixel; server events use Events API 1.3 with the same event ID for
deduplication. A live TikTok test requires a provider-issued test event code,
which this UI does not fabricate.

Docs: https://business-api.tiktok.com/portal/docs?id=1771101186666498

### Snapchat Ads

Fields: Snap Pixel ID and Conversions API token. Browser events use the Snap
Pixel; server events use the Conversions API with `client_dedup_id`.

Docs: https://businesshelp.snapchat.com/s/article/conversion-api

### Pinterest Ads

Fields: Tag ID, ad account ID and Conversions API token. Browser events use the
Pinterest Tag; server events use the Conversions API v5 for the ad account.

Docs: https://developers.pinterest.com/docs/api/v5/conversions/

## Events

| Normalized event | Browser | Server | Notes |
| --- | --- | --- | --- |
| `PageView` | Yes | No | Sent on pixel initialization and SPA navigation. |
| `ViewService` | Yes | No | Service catalog and service booking page. |
| `ViewProduct` | Yes | No | Product landing page. |
| `BookingStarted` | Yes | No | Fired after the booking is created and the authoritative deposit is known. |
| `BookingConfirmed` | No | Yes | Opt-in; sent only after authoritative confirmation. |
| `DepositPaid` | Yes | Yes | Sent only after the server reports a verified payment. |
| `BookingCancelled` | No | Yes | Opt-in; never counted as a conversion by default. |

Per-platform event toggles are stored in the integration row. Event name
translation is defined in `shared/marketing.ts`; adding a provider means adding
a definition there plus an adapter in `server/utils/marketing/adapters.ts`.

## Consent and privacy

- Provider scripts are injected only after the existing cookie-consent banner
  records explicit marketing consent.
- Withdrawing marketing consent stops all browser event dispatch, revokes Meta
  consent, and clears known advertising cookies on this origin.
- Server events require the booking's stored `marketingConsent` flag, which is
  captured when the booking is created.
- No access tokens, authorization headers, payment credentials, full booking
  details or raw customer payloads are returned by admin APIs or written to
  delivery diagnostics.
- Public configuration contains only public tag/pixel IDs and enabled browser
  event flags.

## Deduplication

- Browser events use `sessionStorage` keyed by the stable event ID.
- Meta browser/server deduplication uses the same `event_id`
  (`purchase-<bookingId>` for `DepositPaid`).
- Server delivery rows use a unique `(platform, eventName, eventId)` key, so a
  replayed webhook cannot create a second delivery record.
- Other event IDs: `booking-confirmed-<bookingId>`,
  `booking-cancelled-<bookingId>`, `booking-started-<bookingToken>`.

## Failure isolation

Server conversion dispatch runs after the booking is authoritatively confirmed
and is fire-and-forget. A provider timeout or error is recorded in
`MarketingDelivery` and never changes the payment, booking or confirmation
result. Provider requests have an 8-second timeout and responses are truncated
before diagnostics are stored.

There is intentionally no automatic retry queue. A failed delivery is visible
in the admin overview and is not silently marked as sent. Delivery diagnostics
are pruned after 30 days.

## Environment

| Variable | Purpose |
| --- | --- |
| `ENCRYPTION_KEY` | 64 hex characters (32 bytes). Required to encrypt/decrypt provider tokens. |
| `NUXT_PUBLIC_SITE_URL` | Canonical public origin used for event source URLs and domain-dependent verification. Must be `https://` in production. |
| `META_CAPI_ALLOW_TEST_EVENTS` | Set to `true` only when Meta Test Events should be allowed in a production deployment. |

Never commit real provider credentials. If `NUXT_PUBLIC_SITE_URL` is unset,
domain-dependent verification remains incomplete; the application falls back to
the request origin where available.

## Database

The additive migration is
`prisma/migrations/20261029120000_marketing_integrations/migration.sql`. It adds
`MarketingIntegration` and `MarketingDelivery` and does not modify or remove
existing Meta settings.

Deploy with:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Testing checklist

1. Save a Meta Pixel ID and token; confirm the API returns `hasSecrets` but
   never the token value.
2. Leave the token field blank and save again; the stored token must remain.
3. Enter an invalid Pixel ID (for example an email address); the save must be
   rejected.
4. Run **Test connection** for Meta and check the reported result is based on
   the real Graph API response, not a local save.
5. Disable an integration and confirm `/api/marketing/public-config` no longer
   exposes it and no browser events are sent.
6. Reject marketing consent and confirm no provider scripts are injected.
7. Grant consent and confirm eligible browser events fire with one `event_id`.
8. Complete a verified Stripe/PayPal test payment and confirm `DepositPaid` is
   recorded only after the server reports `PAID`.
9. Replay a webhook or reload the success page; confirm no duplicate delivery
   row is created for the same event ID.
10. Force a provider failure and confirm the booking/payment result is unchanged.

## Known limitations

- Google Ads server-side conversion upload is not implemented.
- No live provider verification is possible without real credentials and, for
  TikTok, a provider-issued test event code.
- Meta Test Events are blocked in production unless explicitly enabled; a
  configured test code suppresses server delivery instead of silently sending
  a production conversion.
- There is no automatic delivery retry queue; diagnostics are bounded and
  manually visible.
- `NUXT_PUBLIC_SITE_URL` must be configured for complete domain verification.
- Browser pixel scripts load from the providers' official CDNs; a blocked CDN
  degrades tracking only.
