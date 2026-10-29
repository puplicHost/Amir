# 02 — Sitemap

Current route inventory for the AMIR salon platform. The canonical admin
navigation lives in `app/components/admin/AdminSidebar.vue`; legacy admin routes
are documented in `Docs/LEGACY-ROUTES.md`.

## Locale and URL policy

- **Production (`NUXT_PUBLIC_LAUNCH_MODE=production`):** German only, no locale
  prefix. `/` is German.
- **Development/staging:** English is the default (`/`), German is prefixed
  (`/de/...`); browser-language detection sets `i18n_redirected`.
- SEO origin comes from `NUXT_PUBLIC_SITE_URL` via `useSiteUrl()`.
  `/robots.txt` and `/sitemap.xml` are generated at request time and therefore
  follow that origin. The static `public/robots.txt` is a fallback only.
- Guest booking, payment, and manage-token routes are excluded from
  `sitemap.xml` and are not indexable content.
- Legal pages remain `noindex` and draft-marked until
  `NUXT_PUBLIC_LEGAL_REVIEWED=true`.

## Public area

| Route | Purpose | Notes |
|---|---|---|
| `/` | Home | Hero, services, featured categories/products, banners, contact, footer |
| `/services` | Service catalogue | Active services grouped by section, prices, booking CTA |
| `/booking/[slug]` | Guest booking | Service, staff choice, date/slot, customer data, consent, deposit checkout |
| `/booking/success` | Post-payment confirmation | Reads booking status; shows manage link |
| `/booking/failed` | Payment failure | Retry mints a new attempt on the same booking |
| `/booking/pay/[token]` | Pay-link checkout | Staff-shared link for unpaid bookings |
| `/booking/manage/[token]` | Customer self-service | View/cancel within policy; token is unguessable |
| `/products` | Product catalogue | Category/price/attribute filters, search, pagination |
| `/products/[slug]` | Category page | Category hero and filtered product grid |
| `/p/[slug]` | Product page | Server-rendered detail, images, documents, JSON-LD |
| `/about` | Studio/about | Brand, team, story |
| `/contact` | Contact | Address, phone, map, social links, contact form |
| `/impressum` | Legal notice | Template until counsel-approved text is published |
| `/agb` | Terms and conditions | Template; required booking acknowledgement |
| `/datenschutz` | Privacy policy | Template; required booking acknowledgement |
| `/stornierung` | Cancellation policy | Template; linked from booking/confirmation |
| `/dev/styleguide` | Developer styleguide | 404 outside `import.meta.dev` |

## Admin area

All admin routes use `layout: 'admin'`, `middleware: 'admin-auth'`, and declare
required permissions.

| Route | Tabs / purpose |
|---|---|
| `/admin/login` | Admin sign-in (public) |
| `/admin` | Dashboard: KPIs, recent activity, quick links |
| `/admin/appointments` | `calendar`, `reminders`, `my-bookings`, `bookings` |
| `/admin/bookings/[id]` | Booking detail, assignment, status, payments, documents |
| `/admin/salon` | `services`, `team` (users + staff), `hours` (working hours/absences) |
| `/admin/catalog` | `products`, `categories` |
| `/admin/products/new` | Create product |
| `/admin/products/[id]/edit` | Edit product, media, documents, SEO |
| `/admin/website` | `inbox`, `banners` |
| `/admin/finance` | `expenses`, `payments` (payments/refunds) |
| `/admin/settings` | `general`, `contact`, `seo`, `store`, `payment`, `booking`, `mail`, `meta`, `website` |
| `/admin/activity` | Audit/activity log (permission-scoped) |
| `/admin/account` | Own profile, password change, sessions |
| `/admin/notifications` | Push notification registration/status |

### Legacy admin redirects

`/admin/banners`, `/admin/bookings`, `/admin/calendar`, `/admin/categories`,
`/admin/expenses`, `/admin/inbox`, `/admin/my-bookings`, `/admin/products`,
`/admin/reminders`, `/admin/schedule`, `/admin/services`, `/admin/staff`,
`/admin/team`, `/admin/users` are thin `replace: true` redirects. Targets and
the deprecation date are in `Docs/LEGACY-ROUTES.md`.

## API surface (grouped)

- Public: `/api/availability`, `/api/services`, `/api/products`,
  `/api/categories`, `/api/staff`, `/api/settings/*`, `/api/announcements`,
  `/api/banners`, `/api/contact`, `/api/bookings/*` (create, status, manage,
  pay), `/api/fcm-config`, `/api/health`.
- Webhooks: `/api/webhooks/stripe`, `/api/webhooks/paypal`.
- Admin: `/api/admin/{auth,bookings,products,categories,services,staff,
  schedule,absences,expenses,payments,banners,announcements,settings,users,
  activity,notifications,upload,...}` — every handler enforces permissions and
  validates its payload.
- Internal: `/api/metrics` (token-gated; 404 when no token is configured).

## Non-indexed / operational

| Route | Purpose |
|---|---|
| `/robots.txt` | Runtime-generated crawl policy |
| `/sitemap.xml` | Runtime-generated sitemap (static pages + active categories/products) |
| `/api/health` | Liveness/readiness; DB detail only with `x-health-token` |
| `/api/metrics` | In-process counters; requires `x-metrics-token` |
| `/booking/manage/[token]`, `/booking/pay/[token]` | Tokenised; never indexed or cached publicly |
