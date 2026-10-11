# PROJECT STATUS REPORT — Amir

Date: 2026-10-06 · Source: read-only audit of `app/pages/`, `server/api/`, components, Prisma schema, Dockerfile/compose.

## Section 1 — Public Frontend Pages

| Page Path | Has Real Data Connected | Loading State | Empty State | Error Handling | Mobile Responsive | Complete or Incomplete |
|---|---|---|---|---|---|---|
| `/` (`app/pages/index.vue`) | Yes — `/api/categories/featured`, `/api/products`, `/api/services`, `/api/settings/contact`, `/api/settings/general` (+ JSON-LD) | No | Partial (hardcoded services fallback masks outages) | No | Yes | Complete |
| `/about` (`app/pages/about.vue`) | Yes — `/api/settings/contact` | No | n/a | No | Yes | Complete |
| `/cart` (`app/pages/cart.vue`) | Yes — Pinia cart store (persisted) | n/a (store) | Yes | n/a | Yes | Complete |
| `/checkout` (`app/pages/checkout/index.vue`) | Yes — POST `/api/orders`, `/api/settings/payment` | Yes (spinner) | n/a | Yes | Yes | Complete |
| `/checkout/success` (`app/pages/checkout/success.vue`) | Yes — token-gated `GET /api/orders/:orderNumber`, `/api/settings/contact` | Yes | n/a (access-gate notice when token invalid) | Yes | Yes | Complete |
| `/landing/[product]` (`app/pages/landing/[product].vue`) | Yes — `GET /api/products/:slug`, POST `/api/orders` | Yes (spinner) | n/a | Yes | Yes | Complete |
| `/products` (`app/pages/products/index.vue` via `AppProductGrid`) | Yes — `/api/products` (filters/sort/pagination), `/api/products/facets`, `/api/categories`, `/api/settings/store` | Yes (skeleton, inside grid) | Yes (inside grid) | Partial | Yes | Complete |
| `/products/offers` (`app/pages/products/offers.vue`) | Yes — real API + timer | No | Via grid | No | Yes | Complete (fallback countdown shows even with no end date) |
| `/products/[slug]` (`app/pages/products/[slug].vue`, category page) | Yes — `/api/categories/:slug` (hero image + video) | No | Via grid | Yes (fatal 404) | Yes | Complete |
| `/p/[slug]` (`app/pages/p/[slug].vue`, product page) | Yes — `/api/products/:slug` (gallery, JSON-LD) + cart store add | Yes | n/a | Yes (fatal 404) | Yes | Complete |
| `/quote` (`app/pages/quote.vue`) | Yes — quote store + POST `/api/quotes`, tokenized PDF download | Yes (spinner) | Yes | Yes | Yes | Complete |
| `/services` (`app/pages/services/index.vue`) | Yes — `GET /api/services` | No | Yes | No | Yes | Complete |
| `/services/[id]` (`app/pages/services/[id].vue`) | Yes — `GET /api/services/:id` (dynamic form) + POST request | Yes (spinner) | n/a | Yes | Yes | Complete |
| `/services/success` (`app/pages/services/success.vue`) | n/a (static) | n/a | n/a | n/a | Yes | Complete |

## Section 2 — Admin Panel Pages

| Page Path | Has Real Data Connected | Loading State | Empty State | Error Handling | Mobile Responsive | Complete or Incomplete | Auth Protected | Permission Checked |
|---|---|---|---|---|---|---|---|---|
| `/admin/login` | Yes — POST `/api/admin/auth/login` | Yes (spinner) | n/a | Yes | Yes | Complete | No (public) | n/a |
| `/admin` (dashboard) | Yes — `/api/admin/dashboard/stats` (real counts/aggregates) | Yes (skeleton) | Yes | Silent fail | Yes | Complete | Yes (`admin-auth`) | No (any admin; revenue gated server-side) |
| `/admin/products` | Yes — `/api/admin/products` (paginated) | Yes | Yes | Partial | Yes | Complete | Yes | Yes (`products.view`) |
| `/admin/products/new` | Yes — `ProductForm` POST `/api/admin/products` | No (form shell) | n/a | Partial | Partial (few responsive classes) | Complete | Yes | Yes (`products.create`) |
| `/admin/products/[id]/edit` | Yes — GET/PUT `/api/admin/products/:id` | Yes (skeleton) | n/a | Yes | Partial (may overflow mobile) | Complete | Yes | Yes (`products.edit`) |
| `/admin/categories` | Yes — list via public `/api/categories`; mutations via `/api/admin/categories*` | Partial (text) | Yes | Yes | Yes | Complete | Yes | Yes (`categories.manage`) |
| `/admin/banners` | Yes — `/api/admin/banners*` (5 calls) | Partial (text) | Custom (not shared component) | Yes | Yes | Complete | Yes | Yes (`banners.manage`) |
| `/admin/orders` | Yes — `/api/admin/orders` (paginated, amounts masked w/o financial perm) | Pending unused | Yes | No | Yes | Complete | Yes | Yes (`orders.view`) |
| `/admin/orders/[id]` | Yes — GET + status PUT `/api/admin/orders/:id*`, invoice modal | No | Partial | Yes | Yes | Complete | Yes | Yes (`orders.view`) |
| `/admin/quotes` | Yes — `/api/admin/quotes` (paginated) | Pending unused | Yes | No | Yes | Complete | Yes | Broad (`quotes/services/orders.view`) |
| `/admin/quotes/new` | Yes — search + POST `/api/admin/quotes` | Yes (spinner) | Yes | Yes | Yes | Complete | Yes | No (any admin; API requires `quotes.manage`) |
| `/admin/quotes/[id]` | Yes — GET/PUT/status + invoice modal | No | n/a | Yes | Yes | Complete | Yes | Broad (`quotes/services/orders.view`; API requires `quotes.manage`) |
| `/admin/quotations` | Yes — `/api/admin/quotes` (duplicate system, native `fetch`) | Yes (skeleton) | Yes | Yes | Yes | Complete (orphan duplicate of `/admin/quotes`) | Yes | Yes (`quotes.view`) |
| `/admin/invoices` | Yes — `/api/admin/invoices` (paginated) | No | Yes | Partial | Yes | Complete | Yes | Yes (`invoices.view`) |
| `/admin/invoices/[id]` | Yes — invoice GET ×3 + PDF (print-intentional) | No | n/a | Yes | Yes | Complete | Yes | Yes (`invoices.view`) |
| `/admin/services` | Yes — `/api/admin/services*` (unbounded list) | No | Yes (×2) | Partial | Yes | Complete | Yes | Yes (`services.view` + `services.config`) |
| `/admin/services/[id]/form` | Yes — form fields CRUD + order PUT | No | Yes | Partial | Yes | Complete | Yes | Yes (`services.config`) |
| `/admin/services/requests/[id]` | Yes — request GET + status PUT + attachments | No | Partial | Partial (toast) | Yes | Complete | Yes | No (any admin; API enforces `services.view/manage`) |
| `/admin/users` | Yes — `/api/admin/users` (salary masked for non-super) | Pending unused | Yes | Yes | Yes | Complete | Yes | Yes (`users.manage`) |
| `/admin/financials` | Yes — summary/sales/costs/chart/export (all real, audited) | Yes (skeleton) | Yes | Partial (summary silent) | Yes | Complete | Yes | Yes (`financials.view`) |
| `/admin/inventory` | Yes — `/api/admin/inventory` (paginated) + stock movements | Yes (skeleton) | Yes | Silent fail | Yes | Complete | Yes | Yes (`products.view` or `inventory.view`) |
| `/admin/notifications` | Yes — `/api/admin/notifications*` | Yes (skeleton) | Yes (custom) | No | Yes | Complete | Yes | No (any-auth server-side) |
| `/admin/settings` | Yes — children fetch settings APIs (dirty-guard) | Delegated | n/a | Partial | Yes | Complete | Yes | Per-tab (`settings.view/manage`) |

## Section 3 — API Endpoints

| Endpoint | Method | Auth | Pagination | Connected to Frontend | Working or Not |
|---|---|---|---|---|---|
| `/api/admin/announcements` | GET | `settings.view` | No | Yes (announcements settings UI) | Working |
| `/api/admin/announcements` | POST | `settings.manage` | n/a | Yes | Working |
| `/api/admin/announcements/:id` | PUT | `settings.manage` | n/a | Yes | Working |
| `/api/admin/announcements/:id` | DELETE | `settings.manage` | n/a | Yes | Working |
| `/api/admin/announcements/settings` | PUT | `settings.manage` | n/a | Yes | Working |
| `/api/admin/auth/login` | POST | Public (5 req/min middleware) | n/a | Yes (login page) | Working |
| `/api/admin/auth/logout` | POST | Session | n/a | Yes | Working |
| `/api/admin/auth/session` | GET | Session | n/a | Yes (auth middleware) | Working |
| `/api/admin/banners` | GET | `banners.manage` | No | Yes (banners page) | Working |
| `/api/admin/banners` | POST | `banners.manage` | n/a | Yes | Working |
| `/api/admin/banners/upload` | POST | `banners.manage` | n/a | Yes | Working |
| `/api/admin/banners/:id` | PUT | `banners.manage` | n/a | Yes | Working |
| `/api/admin/banners/:id` | DELETE | `banners.manage` | n/a | Yes | Working |
| `/api/admin/categories` | POST | `categories.manage` | n/a | Yes (categories page) | Working |
| `/api/admin/categories/:id` | PUT | `categories.manage` | n/a | Yes | Working |
| `/api/admin/categories/:id` | DELETE | `categories.manage` | n/a | Yes | Working |
| `/api/admin/categories/:id/cover` | POST | `categories.manage` | n/a | Yes | Working |
| `/api/admin/dashboard/stats` | GET | Any admin (revenue gated) | n/a | Yes (dashboard) | Working |
| `/api/admin/employees` | GET | `financials.view` | No | No (orphaned) | Working (unused) |
| `/api/admin/employees` | POST | `financials.manage` | n/a | No (orphaned) | Working (unused) |
| `/api/admin/employees/:id` | PUT | `financials.manage` | n/a | No (orphaned) | Working (unused) |
| `/api/admin/employees/:id` | DELETE | `financials.manage` | n/a | No (orphaned) | Working (unused) |
| `/api/admin/expenses` | GET | `financials.view` | No | Yes (financials expenses tab) | Working |
| `/api/admin/expenses` | POST | `financials.manage` | n/a | Yes | Working |
| `/api/admin/expenses/:id` | PUT | `financials.manage` | n/a | Yes | Working |
| `/api/admin/expenses/:id` | DELETE | `financials.manage` | n/a | Yes | Working |
| `/api/admin/financials/summary` | GET | `financials.view` | n/a (single row) | Yes (financials page) | Working |
| `/api/admin/financials/sales` | GET | `financials.view` | Yes (10/20/50) | Yes | Working |
| `/api/admin/financials/costs` | GET | `financials.view` | Yes (10/20/50) | Yes | Working |
| `/api/admin/financials/chart` | GET | `financials.view` | n/a (12 pts) | Yes | Working |
| `/api/admin/financials/export` | GET | `financials.view` | Guarded (`take: 5000`) | Yes (export button) | Working |
| `/api/admin/inventory` | GET | `inventory.view` OR `products.view` | Yes | Yes (inventory page) | Working |
| `/api/admin/invoices` | GET | `invoices.view` | Yes (max 50) | Yes (invoices page) | Working |
| `/api/admin/invoices` | POST | `invoices.manage` | n/a | Yes (invoice modal) | Working |
| `/api/admin/invoices/:id` | GET | `invoices.view` | n/a | Yes | Working |
| `/api/admin/invoices/:id/status` | PUT | `invoices.manage` | n/a | Yes | Working |
| `/api/admin/invoices/by-order/:orderId` | GET | `invoices.view` | n/a | Yes (order modal) | Working |
| `/api/admin/invoices/by-quote/:quoteId` | GET | `invoices.view` | n/a | Yes (quote modal) | Working |
| `/api/admin/invoices/from-order/:orderId` | POST | `invoices.manage` | n/a | Yes | Working |
| `/api/admin/invoices/from-quote/:quoteId` | POST | `invoices.manage` | n/a | Yes | Working |
| `/api/admin/notifications` | GET | Any-auth (scoped by user) | Yes (max 50) | Yes (bell + page) | Working |
| `/api/admin/notifications/:id/read` | PUT | Session (scoped) | n/a | Yes | Working |
| `/api/admin/notifications/read-all` | PUT | Session | n/a | Yes | Working |
| `/api/admin/notifications/register-token` | POST | Session | n/a | Yes (FCM) | Working |
| `/api/admin/notifications/register-token` | DELETE | Session | n/a | Yes | Working |
| `/api/admin/orders` | GET | `orders.view` | Yes (max 50) | Yes (orders page) | Working |
| `/api/admin/orders/:id` | GET | `orders.view` | n/a | Yes | Working |
| `/api/admin/orders/:id/status` | PUT | `orders.manage` | n/a | Yes (status select) | Working |
| `/api/admin/products` | GET | `products.view` | Yes (max 50) | Yes (products page) | Working |
| `/api/admin/products` | POST | `products.create` | n/a | Yes (product form) | Working |
| `/api/admin/products/:id` | GET | `products.view` | n/a | Yes | Working |
| `/api/admin/products/:id` | PUT | `products.edit` | n/a | Yes | Working |
| `/api/admin/products/:id` | DELETE | `products.delete` | n/a | Yes | Working |
| `/api/admin/products/:id/audit` | GET | `products.view` | Yes (max 20) | Yes (audit tab) | Working |
| `/api/admin/products/:id/images` | POST | `products.edit` | n/a | Yes | Working |
| `/api/admin/products/:id/images/:imageId` | DELETE | `products.edit` | n/a | Yes | Working |
| `/api/admin/products/:id/images/order` | PUT | `products.edit` | n/a | Yes | Working |
| `/api/admin/products/:id/video` | POST | `products.edit` | n/a | Yes | Working |
| `/api/admin/products/:id/video` | DELETE | `products.edit` | n/a | Yes | Working |
| `/api/admin/products/:id/documents` | POST | `products.edit` | n/a | Yes | Working |
| `/api/admin/products/:id/documents/:docId` | DELETE | `products.edit` | n/a | Yes | Working |
| `/api/admin/products/upload-inline-image` | POST | `products.edit` | n/a | Yes (rich editor) | Working |
| `/api/admin/quotes` | GET | `quotes.view/manage` | Yes (max 50) | Yes (quotes pages) | Working |
| `/api/admin/quotes` | POST | `quotes.manage` | n/a | Yes (quotes/new) | Working |
| `/api/admin/quotes/upload-image` | POST | `quotes.manage` | n/a | Yes (custom items) | Working |
| `/api/admin/quotes/:id` | GET | `quotes.view/manage` | n/a | Yes | Working |
| `/api/admin/quotes/:id` | PUT | `quotes.manage` | n/a | Yes | Working |
| `/api/admin/quotes/:id` | DELETE | `quotes.manage` | n/a | Yes | Working |
| `/api/admin/quotes/:id/status` | PUT | `quotes.manage` | n/a | Yes | Working |
| `/api/admin/services` | GET | `services.view` | No | Yes (services page) | Working |
| `/api/admin/services` | POST | `services.config` | n/a | Yes | Working |
| `/api/admin/services/:id` | PUT | `services.config` | n/a | Yes | Working |
| `/api/admin/services/:id` | DELETE | `services.config` | n/a | Yes (guarded by requests count) | Working |
| `/api/admin/services/:id/form` | GET | `services.config` | n/a | Yes (form builder) | Working |
| `/api/admin/services/:id/form/fields` | POST | `services.config` | n/a | Yes | Working |
| `/api/admin/services/:id/form/fields/:fieldId` | PUT | `services.config` | n/a | Yes (scoped) | Working |
| `/api/admin/services/:id/form/fields/:fieldId` | DELETE | `services.config` | n/a | Yes (scoped) | Working |
| `/api/admin/services/:id/form/order` | PUT | `services.config` | n/a | Yes | Working |
| `/api/admin/services/requests` | GET | `services.view` | Yes (max 100) | Yes (requests list) | Working |
| `/api/admin/services/requests/:id` | GET | `services.view` | n/a | Yes | Working |
| `/api/admin/services/requests/:id/status` | PUT | `services.manage` | n/a | Yes (enum-validated) | Working |
| `/api/admin/services/requests/:id/attachments/:fileId` | GET | `services.view` | n/a | Yes (scoped IDOR guard) | Working |
| `/api/admin/settings` | GET | `settings.view` | n/a | Yes | Working |
| `/api/admin/settings/general` | PUT | `settings.manage` | n/a | Yes | Working |
| `/api/admin/settings/store` | PUT | `settings.manage` | n/a | Yes | Working |
| `/api/admin/settings/contact` | PUT | `settings.manage` | n/a | Yes | Working |
| `/api/admin/settings/seo` | PUT | `settings.manage` | n/a | Yes | Working |
| `/api/admin/settings/meta` | GET | `settings.view` | n/a | Yes | Working |
| `/api/admin/settings/meta` | PUT | `settings.manage` | n/a | Yes | Working |
| `/api/admin/settings/payment` | GET | `settings.view` | n/a | Yes | Working |
| `/api/admin/settings/payment` | PUT | `settings.manage` | n/a | Yes | Working |
| `/api/admin/settings/quotes` | GET | `settings.view` | n/a | Yes | Working |
| `/api/admin/settings/quotes` | PUT | `settings.manage` | n/a | Yes | Working |
| `/api/admin/settings/ticker` | PUT | `settings.manage` | n/a | Yes (ticker UI) | Working |
| `/api/admin/settings/logo` | POST | `settings.manage` | n/a | Yes | Working |
| `/api/admin/settings/logo` | DELETE | `settings.manage` | n/a | Yes | Working |
| `/api/admin/settings/favicon` | POST | `settings.manage` | n/a | No (endpoint exists, UI unused) | Working (unused) |
| `/api/admin/settings/hero` | POST | `settings.manage` | n/a | No (endpoint exists, UI unused) | Working (unused) |
| `/api/admin/users` | GET | `users.manage` | No | Yes (users page) | Working |
| `/api/admin/users` | POST | `users.manage` | n/a | Yes | Working |
| `/api/admin/users/:id` | PUT | `users.manage` | n/a | Yes | Working |
| `/api/admin/users/:id` | DELETE | `users.manage` | n/a | Yes | Working |
| `/api/announcements` | GET | Public | n/a (tiny) | Yes (announcement bar) | Working |
| `/api/banners` | GET | Public | n/a | Yes (home banners) | Working |
| `/api/categories/featured` | GET | Public | take:6 | Yes (homepage) | Working |
| `/api/categories` | GET | Public | Opt-in (default full) | Yes (grid + admin categories list) | Working |
| `/api/categories/:slug` | GET | Public | n/a | Yes (category page) | Working |
| `/api/fcm-config` | GET | Public (keys only) | n/a | Yes (push) | Working |
| `/api/health` | GET | Public (DB probe) | n/a | Yes (Docker HEALTHCHECK) | Working |
| `/api/invoices/:id/pdf` | GET | `invoices.view` | n/a | Yes (admin invoice pages) | Working |
| `/api/orders` | POST | Public (10 req/min, Zod) | n/a | Yes (checkout + landing) | Working |
| `/api/orders/:orderNumber` | GET | Token-or-admin | n/a | Yes (success page) | Working |
| `/api/products/autocomplete` | GET | Public (30 req/min) | take:8 | Yes (navbar search) | Working |
| `/api/products/facets` | GET | Public (20 req/min) | No (full load) | Yes (product grid) | Working (heavy) |
| `/api/products` | GET | Public | Yes (max 50) | Yes (grid) | Working |
| `/api/products/:slug` | GET | Public | n/a | Yes (product page) | Working |
| `/api/quotes` | POST | Public (10 req/min, Zod) | n/a | Yes (quote page) | Working |
| `/api/quotes/:id/pdf` | GET | Token-or-admin | n/a | Yes (quote + admin pages) | Working |
| `/api/services` | GET | Public | No (small table) | Yes (services page) | Working |
| `/api/services/:id` | GET | Public | n/a | Yes (service page) | Working |
| `/api/services/:serviceId/requests` | POST | Public (10 req/min) | n/a | Yes (service form) | Working |
| `/api/settings/contact` | GET | Public (cached) | n/a | Yes (footer/success/about) | Working |
| `/api/settings/general` | GET | Public (cached) | n/a | Yes | Working |
| `/api/settings/meta-public` | GET | Public | n/a | Yes (Meta pixel) | Working |
| `/api/settings/payment` | GET | Public (booleans only) | n/a | Yes (checkout) | Working |
| `/api/settings/seo-public` | GET | Public (cached) | n/a | Yes (meta tags) | Working |
| `/api/settings/store` | GET | Public (cached) | n/a | Yes (pagination limit) | Working |

## Section 4 — Features Checklist

| Feature | Status |
|---|---|
| Homepage (Hero, Services, Categories, Banner, Contact, Footer) | ✅ Done |
| Products listing with filters and pagination | ✅ Done |
| Category page with hero image/video | ✅ Done |
| Single product page with gallery and add to cart | ✅ Done |
| Product landing page for ads | ✅ Done |
| Services page with 7 dynamic forms | ✅ Done |
| Contact page | ❌ Missing (no `/contact` route; contact info only via footer + settings API) |
| Cart (add, remove, update quantity) | ✅ Done |
| Checkout (no login, customer info form) | ✅ Done |
| Order confirmation page | ✅ Done |
| COD order creation | ✅ Done |
| Payment gateway integration | ❌ Missing (settings hold gateway name/mode + ONLINE toggle, but ONLINE orders are only recorded — no charge, redirect, or webhook) |
| Admin login and auth | ✅ Done |
| Admin dashboard with stats | ✅ Done |
| Products CRUD with multi-step form | ✅ Done |
| Image upload with compression | ✅ Done (sharp → WebP) |
| Categories CRUD with cover image/video | ✅ Done |
| Orders management with status update | ✅ Done |
| Quote requests management | ✅ Done |
| Invoices (modal, PDF generation) | ✅ Done |
| Services management with form builder | ✅ Done |
| Users and permissions | ✅ Done |
| Financials page connected to real data | ✅ Done |
| Inventory tracking with stock movements | ✅ Done |
| Announcement bar (admin controlled) | ✅ Done |
| SEO (meta tags, sitemap, structured data) | ⚠️ Partial (per-page meta + JSON-LD on home/product + robots.txt; no `sitemap.xml` route) |
| i18n (Arabic + English fully translated) | ✅ Done |
| Dark mode | ✅ Done |
| Mobile responsive (app-like experience) | ✅ Done |
| Docker setup | ✅ Done |

## Section 5 — What is Broken or Missing

- `server/api/admin/employees/*` (4 files) + `Employee` model: defined and working but zero frontend callers (payroll moved to `AdminUser.salary`) — orphaned backend.
- `POST /api/admin/settings/favicon` and `POST /api/admin/settings/hero`: defined and working but never called by the UI.
- `app/components/app/AppIconStrip.vue`: 0 references — dead component.
- `app/components/ServiceSection.vue`: 0 references — dead component.
- `lib/utils.ts` (`cn()`): 0 imports — dead helper.
- `app/pages/admin/quotations.vue`: working orphan duplicate of `/admin/quotes` (native `fetch`, inconsistent with the rest).
- One-shot scripts in root (`test-db.mjs`, `update-seed*.mjs`, `update-slug.mjs`, `carryover-banner.mjs`, `fix-machinery-service-form.mjs`): stale, not part of the app.
- `storage/` binaries are tracked in git (repo bloat; runtime now uses named volumes).
- No admin categories list endpoint (`GET /api/admin/categories` does not exist) — the admin page falls back to public `/api/categories`.
- Admin quotes list/detail pages declare broad page-level permissions (`services.view`/`orders.view` fallbacks); API enforcement is tight (`quotes.view/manage`).
- Admin service-request detail UI sends legacy statuses (`New`/`In Review`/`Done`/`Closed`) while the API enum now only allows (`pending`/`reviewed`/`contacted`/`closed`) — status updates from the UI will 400 until the UI is aligned.
- `/admin/invoices/index.vue` shadows Nuxt `createError` with a local ref of the same name.
- `/products/offers` shows a fallback countdown even when no offer end date exists (misleading).
- Dashboard stats + notifications list are visible to any admin regardless of section permissions (by design, broad).
- No `/contact` page, no `sitemap.xml`, no payment-gateway charge flow (see Section 4).

## Section 6 — Production Readiness

- Admin Panel: 88%
- Public Frontend: 90%
- APIs: 85%
- Security: 80%
- Performance: 68%
- i18n: 92%
- Overall: 84%
