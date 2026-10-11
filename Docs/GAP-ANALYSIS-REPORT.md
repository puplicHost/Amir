# Gap-Analysis Report: E-commerce → AMIR Frisur & Kosmetik Studio (booking site)

> READ-ONLY audit. No files changed. Every claim about existing code cites a path verified in the repo.

## 1. Current project summary

**What it is:** "Mango Electronics" — Nuxt full-stack e-commerce (Egypt, EGP, Arabic/English) with guest checkout, quotes, service-request forms, and a role-based admin panel.

| Area | Verified finding |
|---|---|
| Framework / language | Nuxt `^4.5.2`, Vue `^3.5.42`, TypeScript — `package.json:31,42,43`, `nuxt.config.ts:2` |
| DB + ORM | PostgreSQL 16 (`docker-compose.yml`), Prisma `^6.19.3` (`package.json:24,36`), schema `prisma/schema.prisma:7-10` |
| Backend/API layer | Nuxt server engine, file-based routes: `server/api/**`, `server/routes/sitemap.xml.ts`, `server/routes/uploads/[...path].get.ts`; shared logic `server/utils/*`; global rate limit `server/middleware/rate-limit.ts` |
| Auth + roles | Admin-only sessions (iron-seal cookie `mango_admin_session`, 7-day TTL) — `server/utils/auth.ts:26-44`. `AdminUser` + `AdminPermission` models — `prisma/schema.prisma:14-44`. `isSuper` gets all perms; others get explicit grants — `server/utils/auth.ts:59-67`. Guard helpers `requireAuth/requirePermission` — `server/utils/auth.ts:70-84`. Route guard `app/middleware/admin-auth.ts`. Permission catalog `shared/permissions.ts`. **No customer accounts** — public checkout/quotes are guest-only; PII gated by short-lived `CustomerAccessToken` — `prisma/schema.prisma:614-624` |
| Admin panel | Layout `app/layouts/admin.vue`, sidebar `app/components/admin/AdminSidebar.vue`, gate `app/components/admin/AdminPermissionGate.vue`, header/bells/toasts `AdminHeader.vue`, `AdminNotificationBell.vue`, `AdminActivityBell.vue`, `AdminToasts.vue`. Pages `app/pages/admin/*` (dashboard, products, categories, orders, quotes, services, inbox, banners, financials, invoices, users, settings, activity, notifications, login). Map doc `ADMIN-PANEL-MAP.md` |
| i18n | `@nuxtjs/i18n ^10.6.0` (`package.json:19`), config `i18n/i18n.config.ts` + `nuxt.config.ts:49-62`: locales `en` (default) + `ar` (RTL), files `i18n/locales/en.json`, `i18n/locales/ar.json` (7 top-level keys: brand, nav, contact, home, admin, common, products). Strategy `prefix_except_default` |
| Notifications | In-app `AdminNotification` + device tokens `AdminDeviceToken` — `prisma/schema.prisma:362-391`. Fan-out `server/utils/admin-notifications.ts` (permission-gated, never throws). Push `server/utils/fcm.ts` via `firebase-admin ^14.5.0` (`package.json:29`). Client `app/composables/useAdminPush.ts`, public config `server/api/fcm-config.get.ts`, background worker `public/firebase-messaging-sw.js`. Register/unregister `server/api/admin/notifications/register-token.post.ts` / `.delete.ts` |
| Payments (existing) | **Paymob + Fawry only, EGP-only, single-gateway model.** Creds AES-256-GCM encrypted in `SiteSettings.paymentGatewayCredentials` (`server/utils/encryption.ts`, `ENCRYPTION_KEY` in `.env.example:10-12`). Flags `paymentCodEnabled/paymentOnlineEnabled`, `paymentGatewayName/Mode` — `prisma/schema.prisma:507-511`. Logic `server/utils/payments.ts` (incl. `createOnlinePaymentUrl`, `confirmOnlineOrder`). Webhooks `server/api/payments/paymob-webhook.post.ts`, `server/api/payments/fawry-webhook.post.ts` (HMAC verified). Admin UI `app/components/admin/AdminSettingsPayment.vue` + endpoints `server/api/admin/settings/payment.get.ts` / `payment.put.ts`; public `server/api/settings/payment.get.ts` |
| Routing | Frontend file-based `app/pages/*` (public: `index.vue`, `products/`, `p/[slug].vue`, `cart.vue`, `checkout/`, `quote.vue`, `services/`, `contact.vue`, `about.vue`, `landing/[product].vue`; admin: `app/pages/admin/*`). Navbar `app/components/app/AppNavbar.vue` with category dropdown + search |
| State | Pinia (`package.json:33-34`) persisted stores: `app/stores/cart.ts`, `app/stores/quote.ts` |
| Styling/UI | Tailwind `^3.4.19` (`tailwind.config.ts`), `shadcn-vue ^2.8.2` + `radix-vue` (`package.json:37-38`, `components.json`), dark mode via `@nuxtjs/color-mode` (`nuxt.config.ts:42-47`), tokens in `app/assets/css/main.css` + `tailwind.config.ts:14-60`. Current brand: navy `#1C2940` / yellow `#F5CC07` / cream `#F5F0E8`; headings `Archive/Archivo`, body `Inter/Cairo` — `tailwind.config.ts:61-64`, `app/assets/css/main.css:1` |
| Media/storage | Local disk `storage/` via `server/utils/storage.ts` (sharp image processing, 5 MB images / 50 MB video / 10 MB PDFs), served by `server/routes/uploads/[...path].get.ts`. Docker volumes `uploads-data`, `app-storage` in `docker-compose.yml` |
| Other subsystems | Quotes (`QuoteRequest*`, `app/pages/quote.vue`, `server/api/quotes/*`, PDF via `server/utils/quote-pdf.ts` + `pdfmake-rtl`); Invoices (`Invoice*`, `server/api/admin/invoices/*`, `server/utils/invoice-pdf.ts`, `AdminInvoiceModal.vue`); Expenses/financials (`Expense`, `server/api/admin/financials/*`, `server/api/admin/expenses/*`); Banners/announcements/ticker (`Banner`, `AnnouncementItem`, `app/components/app/AppAnnouncementBar.vue`, `AppTicker.vue`, `AppHomeBanners.vue`); Contact inbox (`ContactMessage`, `app/pages/contact.vue`); Meta Pixel + CAPI (`app/components/app/MetaPixel.vue`, `server/utils/meta-capi.ts`, `AdminSettingsMeta.vue`); Audit log (`AuditLog`, `server/utils/audit.ts`); sitemap `server/routes/sitemap.xml.ts` |
| Validation | Zod schemas `server/utils/validate.ts` — **Egyptian phone regex `^01[0125][0-9]{8}$` hardcoded** in `orderCreateSchema`, `quoteCreateSchema`, `contactMessageSchema` |

Folder structure (top level): `app/` (pages, components, layouts, middleware, stores, composables, assets, plugins), `server/` (api, middleware, routes, utils), `prisma/` (schema, migrations, seeds), `shared/` (permissions, slug, constants), `i18n/`, `public/`, `storage/`, `Docs/`, `docker-compose.yml`, `Dockerfile` (Node 22-alpine; local runtime reported v26.5.1 [uncertain — canonical is `Dockerfile`).

## 2. KEEP — reusable as-is

| Module | Path(s) | Why |
|---|---|---|
| Category system (data + public/admin APIs) | `prisma/schema.prisma:47-64` (Category), `server/api/categories/*`, `server/api/admin/categories/*` | Target reuses categories as navbar pages; only locale/field changes needed |
| Product display core (model minus commerce fields, card/grid, detail route) | `prisma/schema.prisma:66-99` (subset), `app/components/app/ProductCard.vue`, `ProductGrid.vue`, `app/pages/products/index.vue`, `app/pages/products/[slug].vue`, `server/api/products/[slug].get.ts`, `server/api/products/index.get.ts` | Showcase needs image/name/desc/price/brand — presentation already exists |
| Product media pipeline | `server/utils/storage.ts`, `server/routes/uploads/[...path].get.ts`, `server/api/admin/products/[id]/images*`, `.../images.post.ts`, `.../video.post.ts`, `.../documents*` | Image upload/serve reusable |
| Auth/session/RBAC skeleton | `server/utils/auth.ts`, `app/middleware/admin-auth.ts`, `shared/permissions.ts`, `server/api/admin/auth/*`, `server/api/admin/users/*`, `prisma/seed-admin.mjs` | Fixed roles + permission-builder builds on this; only permission set changes |
| Settings singleton pattern | `prisma/schema.prisma:436-514` (SiteSettings), `server/api/admin/settings/*`, `app/pages/admin/settings.vue`, `app/components/admin/AdminSettings*.vue`, `app/composables/useSettingsForm.ts` | Working-hours/payment/business-info settings extend this |
| FCM push skeleton | `server/utils/fcm.ts`, `server/utils/admin-notifications.ts`, `server/api/fcm-config.get.ts`, `app/composables/useAdminPush.ts`, `public/firebase-messaging-sw.js`, `prisma/schema.prisma:362-391` | Needed for booking/assignment/cancel alerts; only event types + audience change |
| In-app notification center | `server/api/admin/notifications/*`, `app/pages/admin/notifications.vue`, `app/components/admin/AdminNotificationBell.vue`, `AdminToasts.vue` | Reusable |
| Encryption helper for gateway secrets | `server/utils/encryption.ts`, `ENCRYPTION_KEY` in `.env.example:10-12` | Reuse for Stripe/PayPal keys |
| Rate limiting | `server/middleware/rate-limit.ts`, `server/utils/rate-limit.ts` | Add booking/payment rules |
| Contact inbox | `prisma/schema.prisma:626-637`, `server/api/contact/index.post.ts`, `server/api/admin/inbox/*`, `app/pages/admin/inbox.vue`, `app/pages/contact.vue` | Keep as salon contact channel |
| Audit log | `prisma/schema.prisma:518-531`, `server/utils/audit.ts` | Keep; extend entity types |

## 3. CHANGE — modify existing

| Module | Path(s) | Change + reason |
|---|---|---|
| i18n locales | `nuxt.config.ts:49-62`, `i18n/i18n.config.ts`, `i18n/locales/en.json`, `i18n/locales/ar.json` | Replace `ar` with `de`; default `en` during dev, `de` at launch; add toggle slated for removal; translate static UI strings EN+DE; product/service content entry becomes German-only |
| Design tokens + fonts | `tailwind.config.ts`, `app/assets/css/main.css` | Replace navy/yellow/cream with Black `#050808` / White `#FFFFFF` / Gray `#808080` token system (bg, surface, border, text, muted, accent, hover, focus); headings serif (Cormorant/EB Garamond), body clean sans; keep light+dark surfaces and `darkMode:'class'` |
| Category model usage | `prisma/schema.prisma:47-64` | Add `nameDe/descriptionDe` (or rename strategy); navbar renders categories as pages; seed salon product categories |
| Product model + forms | `prisma/schema.prisma:66-99`, `app/components/admin/ProductForm.vue`, `server/api/admin/products/*`, `server/utils/validate.ts` | Add `brand` field; keep name/desc/price/image; German-only content entry; hide/remove commerce fields from UI (see §5) |
| Services domain (exists but wrong shape) | `prisma/schema.prisma:283-358` (`Service`, `ServiceFormField`, `ServiceRequest*`), `app/pages/services/*`, `server/api/services/*`, `server/api/admin/services/*` | Reshape to salon model: section enum (Damen/Herren/Kinder/Kosmetik), `price` (ab-price), `durationMin` (admin-set), active/featured/sort; replace generic form-builder booking with fixed guest form (name/phone/email/datetime/note); keep file structure, change fields + flows |
| Payment settings + logic | `prisma/schema.prisma:507-511`, `server/utils/payments.ts`, `server/api/admin/settings/payment.*`, `app/components/admin/AdminSettingsPayment.vue`, `server/api/settings/payment.get.ts` | Replace Paymob/Fawry/COD with Stripe + PayPal, per-gateway keys + on/off switches, auto-redirect/selection/blocked-booking logic; currency EGP→EUR |
| Webhooks | `server/api/payments/paymob-webhook.post.ts`, `fawry-webhook.post.ts`, `server/utils/payments.ts:143-162` | Replace with Stripe webhook (signature via endpoint secret) + PayPal webhook/capture verification; server-side-only confirmation; idempotency |
| Phone validation | `server/utils/validate.ts` (egyptPhone regex), `app/pages/checkout/index.vue`, `server/api/orders/index.post.ts` | Replace Egyptian regex with German/international validation + WhatsApp-reachability requirement |
| Governorate/address | `shared/constants/governorates.ts`, `app/pages/checkout/index.vue`, `server/api/orders/index.post.ts`, `Order.customerGovernorat` in `prisma/schema.prisma:175` | Remove Egypt-specific field from booking flow |
| Admin sidebar/dashboard | `app/components/admin/AdminSidebar.vue`, `app/pages/admin/index.vue`, `server/api/admin/dashboard/stats.get.ts` | Remove orders/quotes/financial commerce entries; add Bookings, Services, Schedule/Staff, Settings sections; permission-gated staff view |
| Users/roles | `shared/permissions.ts`, `server/api/admin/users/*`, `app/pages/admin/users.vue`, `prisma/schema.prisma:14-44` | Replace commerce permission groups with Admin/Manager/Staff defaults + per-user extra-grant builder (see §4) |
| Notifications events | `server/utils/admin-notifications.ts:3-18`, `server/utils/fcm.ts:43-51` | Add `new_booking`, `booking_assigned`, `staff_cancelled_booking` types + staff audience (currently admin-only via `findEligibleAdminIds`) |
| Currency/locale formatting | `prisma/schema.prisma:482` (`defaultCurrency`), `AdminSettingsStore.vue`, price renders in `ProductCard.vue`, `app/pages/products/*`, `server/utils/invoice-pdf.ts`, `quote-pdf.ts` | EGP→EUR, `de-DE`/`Europe/Berlin` formatting |
| SEO/meta | `AdminSettingsSeo.vue`, `app/composables/useSiteSeo.ts`, `server/api/settings/seo-public.get.ts`, `server/routes/sitemap.xml.ts`, `app/components/app/MetaPixel.vue`, `server/utils/meta-capi.ts` | Retarget to salon; Meta Pixel/CAPI likely out of scope — confirm removal (see §8) |

## 4. ADD — new work

**New pages (public):**

- `app/pages/services.vue` (grouped Damen/Herren/Kinder/Kosmetik) — new grouped view (current `app/pages/services/index.vue` is ungrouped engineering list)
- `app/pages/booking/[serviceSlug].vue` (guest form: name/phone/email/datetime/note + gateway choice/redirect)
- `app/pages/booking/success.vue` + `booking/failed.vue` (success = "paid, salon confirms via WhatsApp"; failure = message + retry)
- Legal placeholders `app/pages/impressum.vue`, `datenschutz.vue`, `agb.vue`, `stornierung.vue` (routes only, EMPTY content)
- Navbar links to service sections + legal footer (`AppNavbar.vue`, `AppFooter.vue`)

**Admin screens:** Bookings list/detail (`app/pages/admin/bookings/index.vue`, `[id].vue`) with staff-assignment picker (overlap-filtered); Services CRUD with section+price+duration (`app/pages/admin/services/*` rework); Working-hours editor in Settings; Payment settings rework (Stripe/PayPal keys + toggles); Staff list is existing users page filtered by role.

**API endpoints (new):**

- `POST /api/bookings` (create PENDING + 50% deposit intent)
- `GET /api/bookings/:id` (public status, no PII leak)
- `POST /api/bookings/:id/pay` (create Stripe/PayPal checkout)
- `POST /api/webhooks/stripe`, `POST /api/webhooks/paypal` (verify → confirm)
- `GET /api/services-grouped`
- `GET /api/availability?serviceId&date` (slots from working-hours minus overlapping confirmed bookings)
- `PUT /api/admin/bookings/:id/assign`
- `POST /api/admin/bookings/:id/cancel-by-staff`
- `POST /api/admin/bookings/:id/reassign`
- Plus slot-hold handling (see risks)

**Background jobs:** payment-expiry sweeper (release held slots for unpaid PENDING bookings after TTL); FCM stale-token cleanup exists (`server/utils/fcm.ts:99-107`) — reuse; no other cron exists today.

**Third-party setup:** Stripe (publishable + secret + webhook secret in Settings-encrypted storage; Checkout or Payment Links for 50% deposit); PayPal (client-id + secret + webhook-id; Orders API + capture); FCM already wired — add staff audience + new event templates; timezone fixed `Europe/Berlin` everywhere.

**Proposed data model (Prisma-style):**

| Model | Key fields |
|---|---|
| `ServiceSection` (enum) | `DAMEN, HERREN, KINDER, KOSMETIK` |
| `Service` (rework) | `id, slug@unique, section, nameDe, priceAbCents Int (EUR), durationMin Int, isActive, sortOrder, createdAt/updatedAt` |
| `Booking` | `id, bookingNumber@unique, serviceId→Service, customerName, customerPhone, customerEmail, preferredAt DateTime, durationMinSnapshot, priceSnapshotCents, depositCents (=50%), paymentProvider (stripe\|paypal\|none), paymentStatus (PENDING\|PAID\|FAILED\|EXPIRED\|CANCELLED), providerRef@unique?, idempotencyKey@unique, status (UNASSIGNED\|ASSIGNED\|CANCELLED_BY_STAFF\|COMPLETED), assignedStaffId?, notes?, createdAt/updatedAt` + indexes `(preferredAt, status)`, `(assignedStaffId, preferredAt)` |
| `BookingAssignment` (history) | `id, bookingId, staffId→AdminUser, assignedById, assignedAt, unassignedAt?, reason?` |
| `WorkingHours` | `id, weekday Int 0-6, openMin Int, closeMin Int, isClosed Bool` (+ optional `validFrom/validTo`, breaks) |
| `SiteSettings` (extend) | `stripeEnabled, stripePublishable, stripeSecret(enc), stripeWebhookSecret(enc), paypalEnabled, paypalClientId, paypalSecret(enc), paypalWebhookId(enc), paypalMode, currency='EUR', timezone='Europe/Berlin', whatsappNumber, businessName/address/hours-contact fields, bookingSlotStepMin, bookingHoldTtlMin, depositPercent=50` |
| Roles/permissions | `AdminUser.role: ADMIN\|MANAGER\|STAFF` (new) + existing `AdminPermission` as extra-grant table; `ALL_PERMISSIONS` rebuilt around `bookings.*, services.*, schedule.*, staff.*, products.view, settings.*` |
| Notifications | extend `AdminNotification.type` with `new_booking, booking_assigned, booking_cancelled_by_staff, booking_reassigned`; `AdminDeviceToken` reused for staff (all staff are AdminUsers) |
| `FcmToken` | reuse `AdminDeviceToken` (`prisma/schema.prisma:362-372`) — no new table |

**Seed:** 26 services from brief (EUR ab-prices) with placeholder `durationMin` + `needsDurationReview=true` flag; note "Haarwaschen oder Föhnen 6 [verify — printed 06]" and "Augenbrauen … 15 (je)" ambiguity (see §8).

## 5. REMOVE — commerce deletion map

| Remove | Paths | Dependents to fix |
|---|---|---|
| Cart (store + page + navbar badge) | `app/stores/cart.ts`, `app/pages/cart.vue`, `AppNavbar.vue` (cart icon/search-count) | `app/pages/checkout/index.vue` (redirects to `/cart`), `app/layouts/default.vue` if it references cart |
| Checkout | `app/pages/checkout/index.vue`, `app/pages/checkout/success.vue` | `server/api/orders/*`, `server/api/settings/payment.get.ts` (methods shape), `AppNavbar.vue` checkout links |
| Orders (public + admin) | `server/api/orders/index.post.ts`, `server/api/orders/[orderNumber].get.ts`, `server/api/admin/orders/*`, `app/pages/admin/orders/*`, `prisma/schema.prisma:168-220` (`Order`, `OrderItem`, `OrderStatusHistory`) | `server/utils/payments.ts:34-41,135-162` (`ChargeOrder`, `confirmOnlineOrder`), both webhook handlers, `server/utils/admin-notifications.ts` (`new_order`), `server/api/admin/dashboard/stats.get.ts`, `server/api/admin/financials/*`, `AdminOrderStatusSelect.vue`, invoice `from-order` endpoints |
| Shipping/governorate | `shared/constants/governorates.ts`, `GOVERNORATES` imports in checkout/invoices, `Order.customerGovernorat/customerAddress`, `orderCreateSchema` governorate/address | `server/utils/validate.ts`, `server/api/orders/index.post.ts`, invoice PDFs |
| Stock/inventory | `Product.stock/minStock`, `StockMovement`, `server/api/admin/inventory/*`, `app/pages/admin/products/index.vue` stock filters, `ProductForm.vue:219-226,808-820` stock inputs, low-stock dashboard cards | `server/api/admin/dashboard/stats.get.ts`, `server/api/admin/products/*` sort/filter params, `ADMIN-PANEL-MAP.md` §Low Stock |
| Quotes | `app/stores/quote.ts`, `app/pages/quote.vue`, `server/api/quotes/*`, `server/api/admin/quotes/*`, `app/pages/admin/quotes/*`, `QuoteRequest*` models, `server/utils/quote-pdf.ts` | Dashboard stats, `canQuotesView` in `AdminSidebar.vue`, notification type `new_quote`, rate-limit `quotes-create` rule, `AdminSettingsQuotes.vue` + `quotes.*` settings endpoints |
| Invoices/financials/expenses | `server/api/admin/invoices/*`, `server/api/invoices/*`, `app/pages/admin/invoices/*`, `AdminInvoiceModal.vue`, `AdminInvoicePreview.vue`, `server/utils/invoice-pdf.ts`, `invoices.ts`, `server/api/admin/financials/*`, `server/api/admin/expenses/*`, `app/pages/admin/financials.vue`, `Expense/Invoice*` models | Dashboard financial cards, sidebar Financials entry, `financials.*` permissions |
| Online-purchase product fields | `compareAtPrice/costPrice`, offers page `app/pages/products/offers.vue`, landing `app/pages/landing/[product].vue`, facets/autocomplete `server/api/products/facets.get.ts`, `autocomplete.get.ts` (if sales-oriented) | `ProductForm.vue:204-213,460-461`, financial margin reports |
| Paymob/Fawry + COD + Meta commerce | `server/utils/payments.ts` (full rewrite), `server/api/payments/*`, `AdminSettingsPayment.vue`, `paymentCodEnabled/paymentOnlineEnabled/paymentGateway*` settings, `app/components/app/MetaPixel.vue`, `server/utils/meta-capi.ts`, `AdminSettingsMeta.vue` | Checkout `paymentMethod`, `sendMetaCapiEvent` call in `server/api/orders/index.post.ts`, settings tabs in `app/pages/admin/settings.vue` |
| PII token flow for orders/quotes | `CustomerAccessToken` model, `server/utils/access-tokens.ts` | Order/quote PII endpoints being deleted; re-evaluate for booking PII |

Deletion order matters: remove UI references first (cart/checkout/admin pages/sidebar), then public APIs, then models/migrations last, running `prisma validate` per step.

## 6. Risks and edge cases

1. **Double booking / overlap:** assignment picker must filter staff with overlapping ASSIGNED/PAID bookings (`preferredAt` + duration snapshot); also enforce a DB exclusion or transactional check at assign-time — current schema has no such guard.
2. **Slot holding during payment:** PENDING booking must hold the slot (TTL e.g. 20–30 min, configurable `bookingHoldTtlMin`); availability query must treat unexpired PENDING as occupied; need expiry sweeper — no cron exists today.
3. **Abandoned payments:** Stripe/PayPal session expiry → `EXPIRED`; failure/cancel redirect → `FAILED` + retry creates a *new* payment intent, never mutates a PAID booking.
4. **Webhook idempotency:** unique `providerRef`/`idempotencyKey`; confirm handler must be safe to receive twice (current `confirmOnlineOrder` in `server/utils/payments.ts:143-162` is not idempotent by gateway ref — fix in rewrite). Never trust client redirect — only webhook/verified callback flips `PENDING→PAID`.
5. **Timezone:** store UTC, render `Europe/Berlin` (DST!); working-hours + slots + staff overlap all in salon local time; existing code uses `new Date()` naively (e.g. order numbering) — must not copy that pattern.
6. **FCM limits:** web-push requires HTTPS + granted permission; `firebase-messaging-sw.js` scope is site-root (fine); token churn handled by existing stale-token purge (`server/utils/fcm.ts:99-107`); staff browsers closed = background path only — test denied-permission and unconfigured graceful-off paths (`useAdminPush.ts`, `fcm-config.get.ts`).
7. **Secret storage:** Stripe/PayPal secrets must use the existing AES-256-GCM pattern (`server/utils/encryption.ts`) in `SiteSettings`, never `public` runtimeConfig (`nuxt.config.ts:20-31`); admin GET must return `hasCredentials` booleans only (as `payment.get.ts` does today).
8. **Deposit math:** 50% of odd-cent EUR ab-prices — define rounding (e.g. round-half-up to cents) and display "ab X € / Anzahlung Y €" consistently.
9. **WhatsApp reachability:** validate phone (German/intl) + require at least WhatsApp-capable phone *or* email; `wa.me` link needs salon number in Settings + per-booking customer link for admin reassignment contact.
10. **i18n residue:** hardcoded Arabic/English strings and Egyptian phone error copy in checkout/services will leak into DE UI unless locale sweep is a dedicated phase; `ar`↔`de` swap touches `nuxt.config.ts` strategy, RTL CSS (`dir` handling in layouts), and all `locale.value === 'ar'` branches.
11. **Migration blast radius:** dropping Order/Quote/Invoice/Stock tables is destructive — backup + staged migrations; `Category Restrict` FK (`prisma/schema.prisma:83`) blocks category deletes with products (keep behavior).

## 7. Proposed implementation order (small, testable phases)

1. **Freeze + backup:** DB dump, branch, record migration baseline. Test: restore dry-run.
2. **i18n swap (en↔de):** config, locales skeleton, language toggle (dev-only flag), remove RTL/`ar` branches. Test: page renders EN + DE, no hardcoded Arabic.
3. **Theme + fonts + legal shells:** token system (#050808/#FFF/#808080), serif/sans fonts, empty Impressum/Datenschutz/AGB/Storno routes. Test: visual review light/dark, routes return empty placeholders.
4. **Product showcase slim-down:** add `brand`, German-only content, remove cart/checkout UI + stores. Test: browse product list/detail, no purchase path reachable (route + link audit).
5. **Services + working-hours + availability:** reworked Service model, section grouping, admin CRUD, hours editor, availability endpoint, seed 26 services with placeholder durations. Test: CRUD + slot math unit checks.
6. **Booking + deposit payments:** guest form, PENDING + hold TTL, Stripe + PayPal with toggles, webhooks (idempotent, server-side confirm), success/fail pages with retry. Test: sandbox pay/cancel/fail, webhook replay, redirect-spoof rejected.
7. **Assignment lifecycle + notifications:** unassigned queue, overlap-filtered picker, staff panel scoping, cancel/reassign, WhatsApp links, in-app+FCM events. Test: overlap filter, cancel→unassigned→reassign, push received closed-browser.
8. **Roles/permissions builder:** ADMIN/MANAGER/STAFF defaults + extra grants, staff panel gating. Test: permission matrix walkthrough.
9. **Commerce removal + migration:** delete orders/quotes/invoices/stock/governorate/Meta-commerce code + tables. Test: full regression, dead-link/API scan, `prisma migrate` clean.
10. **Hardening + launch prep:** rate limits, Berlin-TZ audit, secret audit, expiry sweeper cron, remove EN toggle (DE default). Test: security/TZ/E2E pass.

## 8. Open questions

1. Confirm product `brand` — free text or predefined brand list with filter?
2. Should products keep compare-at/discount badges, videos, documents, attributes, SEO fields — or strip to image/name/desc/price/brand only?
3. Keep contact inbox, banners/announcements/ticker, about page, product search/facets? Which survive?
4. Stripe + PayPal both in EUR, sandbox-first — whose API accounts/keys, and who configures webhooks?
5. Deposit rounding rule for odd cents + exact German wording ("ab", "Anzahlung") on service/booking/success screens?
6. Slot granularity (e.g. 15 min?) and buffer/cleanup time between bookings — or back-to-back?
7. Booking horizon (how far ahead) + cancellation policy link target (empty placeholder OK for launch)?
8. Staff identity: are staff existing AdminUsers with role=STAFF, and should staff see customer email/phone or phone-only?
9. "Augenbrauen … 15 (je)" — per treatment or combined price? And confirm "Haarwaschen oder Föhnen 6 (not 06)"?
10. Placeholder service durations — what values to seed, and who provides real ones before launch?
11. Keep Meta Pixel/CAPI, quotes, invoices/financials/expenses in any form — or delete all?
12. WhatsApp number for salon contact + wa.me link format; is email alone acceptable if no WhatsApp?
13. FCM: which browsers must work, and is denied-permission graceful-off acceptable for staff?
14. Launch: exact date to remove EN toggle and default to DE; any SEO/redirect needs from old shop URLs?
