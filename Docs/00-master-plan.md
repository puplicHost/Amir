# Amir — Master Implementation Plan

## 1. Executive Summary

**Project:** AMIR Frisur & Kosmetik Studio — German hair & beauty salon platform
**Locations:** Peine & Salzgitter, Germany
**Stack:** Nuxt 4, Nitro, Prisma, PostgreSQL 16, Tailwind CSS, Docker Compose,
PayPal deposit payments, FCM push, transactional mail outbox.

The application has two surfaces:

1. **Public salon site** — services, prices, team, gallery, contact, legal pages,
   and a guest booking flow with an online deposit. No customer accounts exist.
   Bookings are managed through unguessable links sent by mail.
2. **Admin panel** — appointments/calendar, salon configuration (services,
   team, opening hours, absences), catalogue (products/categories), expenses
   and finance, website content (banners, announcements, inbox), settings
   (business, booking, payments, mail, Meta CAPI), activity log, and account
   security.

Production is German-first (`NUXT_PUBLIC_LAUNCH_MODE=production` → locale `de`,
no URL prefix). Development exposes English (`/`) and German (`/de`) with
`prefix_except_default`. Locale content falls back `de → en` (catalogue also
keeps legacy Arabic columns, which are not a configured locale).

**Audit remediation:** `Docs/FULL-WEBSITE-AUDIT.md` lists 52 findings
(P0 0, P1 6, P2 16, P3 18, INFO 12). Their implementation status, migration and
operator follow-ups are tracked in `Docs/FULL-WEBSITE-REMEDIATION.md`. The
remediation assumes the prepared Prisma migration
`20261028120000_audit_remediation` is applied by an authorized operator before
the updated code runs.

## 2. Locked Decisions

- **Guest-only booking.** No customer accounts, carts, or order history. The
  booking reference plus emailed manage/pay tokens are the only customer
  credentials.
- **Deposit model.** The salon defines a deposit percentage per service price.
  Online payment is optional per booking; unpaid holds expire. PayPal is the
  sole provider, verified server-side via capture + webhook.
- **Status catalog.** `UNASSIGNED → ASSIGNED → COMPLETED` plus `CANCELLED`.
  `CANCELLED_BY_STAFF` is legacy-only and never written. Terminal states cannot
  be reassigned or completed; refunds are flagged, never auto-issued.
- **Timezone.** All wall-clock scheduling is done in the salon timezone
  (`SiteSettings.bookingTimezone`, default `Europe/Berlin`); storage is UTC.
- **Localization.** DE/EN content columns plus explicit fallback. Prices are EUR
  formatted with `de-DE`.
- **Storage.** Uploads live outside `public/` and are served by Nitro with
  authentication and `private, no-store` for customer/payment documents.
- **Auth.** Admin-only, bcrypt passwords, DB-backed revocable sessions with
  hashed tokens, persisted lockout, granular RBAC permissions. MFA is not
  implemented (operator/architecture decision, see remediation report).
- **Mail.** SMTP in production. The `log` provider is a simulation mode: it
  records `SIMULATED` results and never counts as delivered.
- **Deployment.** Docker image is built with an explicit launch mode build arg;
  database migrations run as a one-shot Compose job, never on app boot.

## 3. Current Implementation Status

| Area | Status |
|---|---|
| Public site (home, services, products, about, contact, legal) | Implemented |
| Guest booking, availability, holds, manage/cancel, pay links | Implemented |
| PayPal deposits + webhooks | Implemented; sandbox verification pending |
| Admin appointments, calendar, schedule, team, absences | Implemented |
| Catalogue, product media/documents, categories | Implemented |
| Expenses, finance overview, CSV export | Implemented |
| Website content, banners, announcements, inbox | Implemented |
| Settings, payment/mail/Meta configuration, activity log | Implemented |
| DB-backed sessions, lockout, password rotation | Implemented in source (migration pending) |
| Rate limiting, security headers, CSP report-only | Implemented in source |
| Consent evidence, legal page templates | Implemented in source; legal review pending |
| Unit tests + CI build pipeline | Implemented for pure logic; lint/typecheck/E2E pending |
| Backups | Scripts + runbook added; schedule and restore drill pending |

## 4. Roadmap

### Phase A — Deployment readiness (blocking)

1. Review and apply the prepared Prisma migration with a verified backup.
2. Rotate database credentials and any credentials present in historical Git
   artifacts (see remediation report; requires an authorized operator).
3. Configure production secrets: `POSTGRES_PASSWORD`, `NUXT_SESSION_PASSWORD`,
   `ENCRYPTION_KEY`, payment provider keys/webhook secrets, SMTP, Meta CAPI
   token, optional `METRICS_TOKEN`/`HEALTH_TOKEN`.
4. Build the image with `NUXT_PUBLIC_LAUNCH_MODE=production`; confirm the
   runtime/build launch-mode marker matches.
5. Publish counsel-approved Impressum, AGB, Datenschutz, and Stornierung text;
   set `NUXT_PUBLIC_LEGAL_REVIEWED=true` only after review. Until then legal
   pages stay draft-marked and `noindex`.

### Phase B — Operational hardening

1. Enable the backup schedule and complete a restore drill into a scratch DB.
2. Verify security headers and CSP in report-only mode against staging; tighten
   to enforcing once violations are resolved.
3. Decide and implement MFA for admin accounts (TOTP or passkey), then document
   recovery.
4. Add `@nuxt/image`/sharp or a CDN image pipeline and migrate public images.
5. Add lint/typecheck/Playwright to CI; extend unit tests to payment state
   transitions and API contracts.

### Phase C — Content and cleanup

1. Populate German service/product/category copy (`nameEn`/`descriptionEn`,
   `nameDe`/`descriptionDe`) and review fallbacks.
2. Remove legacy Arabic-only branches and columns after a data export, in a
   dedicated migration.
3. Remove legacy admin redirect routes after the 2027-04-30 deprecation date
   documented in `Docs/LEGACY-ROUTES.md`.
4. Review SEO metadata, structured data, sitemap and robots output against the
   production domain.

### Phase D — Continuous improvement

1. Quarterly access review of admin users, permissions, and device tokens.
2. Quarterly restore drill and credential rotation.
3. Review audit log/activity coverage for every destructive admin action.
4. Re-run the full audit after material feature work.

## 5. Verification Policy

- Static inspection is not runtime verification. No build, test, migration,
  server start, browser run, or payment check is performed without explicit
  human approval.
- One batched verification per phase, proportional to the change size.
- A finding is only "fixed" when source changes exist; runtime behavior remains
  "unverified" until the approved checks pass.
- After implementation, report: `Implementation complete. Verification not run —
  awaiting human approval.`
