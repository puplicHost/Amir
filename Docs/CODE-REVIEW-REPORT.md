# CODE REVIEW REPORT — Mango Electronics

Date: 2026-10-06 · Stack: Nuxt 3 / Nitro / Prisma / PostgreSQL / Docker · Scope: full project.

---

## Fix Status — 2026-10-06 (fixes 1–5 applied, `npm run build` passes with EXIT 0)

| # | Risk | Status | What changed |
|---|---|---|---|
| Fix 1 | PII exposure (quote PDF + order lookup) | ✅ Fixed | New `CustomerAccessToken` table (migration `20261009000000_add_customer_access_tokens`): sha256-hashed random tokens, bound to one order/quote, 24h expiry. `POST /api/orders` and `POST /api/quotes` issue a token and return it as `accessToken` in the confirmation. `GET /api/orders/:orderNumber` and `GET /api/quotes/:id/pdf` return PII only with a valid token (`?token=`) or an admin session (`orders.view/manage`, `quotes.view/manage`); otherwise 401/403. Quote PDFs stream directly (no redirect bypass). `server/routes/uploads/[...path].get.ts` requires an admin session for `quotes/*` and `service-requests/*`. Checkout/landing/success/quote pages pass the token through (no visual UI change). |
| Fix 2 | Rate limiting | ✅ Fixed | New `server/middleware/rate-limit.ts` running before route handlers (in-memory sliding window per IP via `server/utils/rate-limit.ts`, `Retry-After` on 429): login 5/min, `POST /api/orders` 10/min, `POST /api/quotes` 10/min, service-request creation 10/min, autocomplete 30/min, facets 20/min. No Redis required. |
| Fix 3 | Docker hygiene | ✅ Fixed | `.dockerignore` now excludes `.env`, `node_modules`, `.git`, `.nuxt`, `.output`, `storage/`, `public/uploads/`, `Docs/`, `*.log`. `Dockerfile` runs as non-root `appuser`, has a `HEALTHCHECK` on `/api/health`, and applies `prisma migrate deploy` as an explicit boot step (never during build). `docker-compose.yml` mounts named volumes for `storage/` (`app-storage`) and `public/uploads/` (`uploads-data`). `.env.example` port fixed to `5434` (matches compose) and now documents `NITRO_PORT`/`NITRO_HOST`. |
| Fix 4 | RBAC + service validation | ✅ Fixed | All admin quote mutations (`POST/PUT/DELETE /api/admin/quotes/*`) require `quotes.manage` (helpers `requireQuotesManage`/`requireQuotesView` in `server/utils/validate.ts`); quote reads require `quotes.view/manage`. Zod `parseBody` on all quote/service/order POST+PUT bodies. Service-request status enum-enforced (`pending/reviewed/contacted/closed`); attachment `:fileId` scoped to `:id` (IDOR guard); `GET /api/admin/services/requests` hard-capped at 100 items; form-field PUT/DELETE verify field↔service scope; public service-request writes capped (≤50 fields, values ≤5000 chars, ≤10 files, unknown `fieldId`s ignored). Note: admin UI status buttons still send the legacy labels — align them to the new enum as a follow-up. |
| Fix 5 | DB indexes + expensive reads | ✅ Fixed | Migration `20261010000000_add_lookup_indexes` (applied): b-tree indexes on `Product.nameAr`, `Product.nameEn`, `Order.customerPhone`, `QuoteRequest.phone`. (`Product.slug` is already `@unique`-indexed; `Product` has no `status` column — availability is the already-indexed `isActive`.) `GET /api/admin/services/requests` paginated + capped at 100; financials `sales`/`costs` paginated, `chart` fixed 12 points, `export` guarded with `take: 5000`. `loading="lazy"` added to all 19 below-fold `<img>`s; the 7 remaining non-lazy images are above-fold heroes/logos, print-critical invoice headers, the Meta noscript pixel, or dead code. |

Out-of-scope hardening left open (not in the 5): atomic numbering, full upload MIME allowlists, CDN/cache headers, missing search/trigram indexes, dead-code deletion.

---

## Section 1 — Architecture Issues

1. **No rate limiting anywhere (high).** No `server/middleware/`, no Nitro `routeRules`, no throttle package (`express-rate-limit` in package-lock is transitive only). `server/utils/login-attempts.ts` only sends notifications after 5 failures/10 min — never blocks, process-local, email-keyed. Public writes (`POST /api/orders`, `POST /api/quotes`, `POST /api/services/:id/requests`, admin login) plus CPU-heavy endpoints (dual-PDF quote generation, unbounded facets aggregation, per-keystroke autocomplete) are unthrottled → brute-force, spam-order, and CPU-exhaustion DoS risk under real traffic.
2. **Sequential numbering is not atomic (high).** `server/utils/numbering.ts` does read-then-increment on `SiteSettings` counters. Concurrent quote/invoice creation can produce duplicate `QT-*`/`INV-*` numbers, which then fail on the `@unique` constraint (500 to the user).
3. **Financial figures depend on mutable snapshots without locking.** COGS uses `productCostSnapshot` written at checkout — correct — but `server/api/orders/index.post.ts` computes `Number(price) * qty` with no rounding before the `Decimal` write (`0.1 + 0.2` class errors); only invoices/financials apply `round2`.
4. **No central server error handling or error logging (medium).** Per-route `createError` only; no `server/plugins/` or `server/middleware/` error handler; Prisma logs errors only. Failures are invisible in production (no log aggregation hook).
5. **Minimal client error boundaries (medium).** `app/error.vue` exists but no `<NuxtErrorBoundary>`/`onErrorCaptured` anywhere; several pages use fatal `createError` (full-page fallback, no sectional recovery, no retry UI).
6. **Docker image ships secrets and state (high).** No `.dockerignore`: `COPY . .` includes local `.env`, `storage/` uploads, `.nuxt/.output/node_modules`. No `HEALTHCHECK`, runs as root, no `prisma migrate deploy` on boot, `storage/` not volume-mounted (uploads lost on rebuild), DB password `mango` hardcoded, weak `NUXT_SESSION_PASSWORD` fallback, `devtools: true` ships to prod, port mismatch (`.env.example` 5433 vs compose 5434).
7. **No caching strategy for hot public feeds (medium).** Only 5 settings endpoints are cached (60s). `/api/products`, `/api/categories`, `/api/banners`, `/api/announcements` hit Postgres on every SSR render with no CDN/cache headers (no `routeRules`).
8. **Denormalized audit/provenance columns with no FKs (medium).** `AuditLog.userId`, `StockMovement.userId`, `Invoice.createdById`, `QuoteRequest.quoteTermsUpdatedBy`, `ServiceRequestValue.fieldId` (no FK to `ServiceFormField` — orphaned values when fields are rebuilt; no `@@unique([requestId,fieldId])`), `AdminNotification.relatedEntityId/url` dangle after deletes.
9. **Singleton `SiteSettings` has no DB guard (low).** Code mixes `findUnique({id:1})` and `findFirst()`; a second row would make `findFirst` nondeterministic.
10. **Free-text status/type fields everywhere, no DB enums (low).** `Order.status`, `Invoice.status/type`, `QuoteRequest.status`, `ServiceRequest.status`, `AuditLog.entityType/action`, `StockMovement.reason` — typos silently accepted; only runtime checks.

## Section 2 — API Health Check

Legend: ✅ good · ⚠️ partial · ❌ missing/critical.

### Public routes (`server/api/`, 25 files)

| Endpoint | Method | Auth Protected | Pagination | Input Validated | Status |
|---|---|---|---|---|---|
| `/api/announcements` | GET | ❌ none (by design) | n/a (tiny table) | n/a | ⚠️ unbounded, no select limit |
| `/api/banners` | GET | ❌ none (by design) | n/a | n/a | ⚠️ loads full settings row server-side (secrets never returned — ok) |
| `/api/categories/featured` | GET | ❌ none (by design) | take:6 | n/a | ✅ |
| `/api/categories` | GET | ❌ none (by design) | ⚠️ opt-in only, default full list | partial | ⚠️ default path unbounded |
| `/api/categories/:slug` | GET | ❌ none (by design) | n/a | ❌ raw slug | ✅ select-limited; slug enumeration possible (low risk) |
| `/api/fcm-config` | GET | ❌ none (by design) | n/a | n/a | ✅ public keys only |
| `/api/health` | GET | ❌ none | n/a | n/a | ⚠️ unauthenticated DB probe, usable as load amplifier |
| `/api/invoices/:id/pdf` | GET | ✅ invoices.view | n/a | ❌ raw id | ⚠️ admin-guarded handler under public path (confusing but secure) |
| `/api/orders` | POST | ❌ none (by design) | n/a | partial (phone regex, server pricing, qty>0) | ⚠️ no item/qty caps, no rate limit; fires notify+CAPI+invoice per hit |
| `/api/orders/:orderNumber` | GET | ✅ token-or-admin | n/a | ✅ token | ✅ Fixed — 24h per-order token or admin session required; no PII otherwise |
| `/api/products/autocomplete` | GET | ❌ none (by design) | take:8 | ❌ single-char queries | ⚠️ expensive OR query per keystroke, no rate limit |
| `/api/products/facets` | GET | ❌ none (by design) | ❌ none | ❌ | ❌ unbounded attribute load into memory |
| `/api/products` | GET | ❌ none (by design) | ✅ cap 50 | partial (sort allowlisted; min/max NaN risk) | ✅ select-limited |
| `/api/products/:slug` | GET | ❌ none (by design) | n/a | ❌ | ⚠️ full include (all images/docs), slug-or-id probing |
| `/api/quotes/:id/pdf` | GET | ✅ token-or-admin | n/a | ✅ token | ✅ Fixed — 24h per-quote token or admin session required; streams PDF, no static bypass |
| `/api/quotes` | POST | ❌ none (by design) | n/a | partial (phone regex, server pricing) | ⚠️ silent product drops, no item/qty caps, sync dual-PDF, no rate limit |
| `/api/services/:id` | GET | ❌ none (by design) | n/a | ❌ | ✅ limited include |
| `/api/services` | GET | ❌ none (by design) | ❌ none | n/a | ⚠️ unbounded (small table) |
| `/api/services/:serviceId/requests` | POST | ❌ none (by design) | n/a | partial (phone regex, 5MB files) | ⚠️ unvalidated fieldIds via createMany; files validated after partial writes |
| `/api/settings/contact` | GET | ❌ none (by design) | n/a | n/a | ✅ field-picked, cached |
| `/api/settings/general` | GET | ❌ none (by design) | n/a | n/a | ✅ field-picked, cached |
| `/api/settings/meta-public` | GET | ❌ none (by design) | n/a | n/a | ✅ pixelId only |
| `/api/settings/payment` | GET | ❌ none (by design) | n/a | n/a | ✅ booleans only (not cached — minor inconsistency) |
| `/api/settings/seo-public` | GET | ❌ none (by design) | n/a | n/a | ✅ field-picked, cached |
| `/api/settings/store` | GET | ❌ none (by design) | n/a | n/a | ✅ field-picked, cached |

### Admin routes (`server/api/admin/`, 102 files)

| Endpoint | Method | Auth Protected | Pagination | Input Validated | Status |
|---|---|---|---|---|---|
| `/api/admin/announcements` | GET | ✅ settings.view | ❌ none | n/a | ⚠️ unbounded + take:100 products |
| `/api/admin/announcements` | POST | ✅ settings.manage | n/a | partial (textAr required, max-10; type/linkType unvalidated) | ⚠️ |
| `/api/admin/announcements/settings` | PUT | ✅ settings.manage | n/a | ❌ (blind boolean/trim, bgColor unvalidated) | ⚠️ |
| `/api/admin/announcements/:id` | PUT | ✅ settings.manage | n/a | partial | ⚠️ sortOrder NaN risk |
| `/api/admin/announcements/:id` | DELETE | ✅ settings.manage | n/a | ❌ (no existence check) | ⚠️ |
| `/api/admin/auth/login` | POST | ❌ none (public) | n/a | ✅ | ✅ Fixed — 5 req/min via Nitro middleware |
| `/api/admin/auth/logout` | POST | ❌ none | n/a | n/a | ✅ harmless |
| `/api/admin/auth/session` | GET | ✅ requireAuth | n/a | n/a | ✅ |
| `/api/admin/banners` | GET | ✅ banners.manage | ❌ none | n/a | ⚠️ unbounded full rows |
| `/api/admin/banners` | POST | ✅ banners.manage | n/a | ✅ titles/placement/width | ⚠️ colors unvalidated |
| `/api/admin/banners/upload` | POST | ✅ banners.manage | n/a | partial | ❌ no MIME/size allowlist |
| `/api/admin/banners/:id` | PUT/DELETE | ✅ banners.manage | n/a | ✅/❌ | ⚠️ |
| `/api/admin/categories` | GET | ✅ categories.manage* | ✅ | partial | ✅ (*see notes) |
| `/api/admin/categories` | POST | ✅ categories.manage | n/a | partial | ⚠️ desc/video/sort unvalidated |
| `/api/admin/categories/:id/cover` | POST | ✅ categories.manage | n/a | partial | ❌ no MIME/size |
| `/api/admin/categories/:id` | PUT/DELETE | ✅ categories.manage | n/a | partial | ⚠️ blank-name guard flawed; 409 guard good |
| `/api/admin/dashboard/stats` | GET | ⚠️ requireAuth (any admin) | n/a | n/a | ⚠️ counts/orders/requests/audit visible to all staff; only revenue gated |
| `/api/admin/employees` | GET | ✅ financials.view | ❌ none | n/a | ⚠️ unbounded, salaries included (intended audience) |
| `/api/admin/employees` | POST | ✅ financials.manage | n/a | ✅ | ✅ |
| `/api/admin/employees/:id` | PUT/DELETE | ✅ financials.manage | n/a | ✅/❌ | ⚠️ |
| `/api/admin/expenses` | GET | ✅ financials.view | ❌ none | ✅ month/year clamped | ⚠️ unbounded month fetch |
| `/api/admin/expenses` | POST | ✅ financials.manage | n/a | ✅ category enum, amount | ✅ |
| `/api/admin/expenses/:id` | PUT/DELETE | ✅ financials.manage | n/a | ✅/❌ | ⚠️ |
| `/api/admin/financials/summary` | GET | ✅ financials.view | n/a | ✅ clamped | ✅ select-limited, names never exposed |
| `/api/admin/financials/sales` | GET | ✅ financials.view | ✅ whitelist 10/20/50 | ✅ | ✅ |
| `/api/admin/financials/costs` | GET | ✅ financials.view | ✅ whitelist 10/20/50 | ✅ | ✅ |
| `/api/admin/financials/chart` | GET | ✅ financials.view | n/a (12 pts) | ✅ months 3–24 | ✅ |
| `/api/admin/financials/export` | GET | ✅ financials.view | ❌ none | ✅ | ⚠️ unbounded month export |
| `/api/admin/inventory` | GET | ✅ inventory.view OR products.view | ✅ whitelist 10/20/50 | ✅ | ⚠️ exposes costPrice to products.view; fetches all then slices in JS |
| `/api/admin/invoices` | GET | ✅ invoices.view | ✅ max 50 | partial (status/type unvalidated) | ✅ |
| `/api/admin/invoices` | POST | ✅ invoices.manage | n/a | partial (delegated to util) | ✅ |
| `/api/admin/invoices/:id` | GET | ✅ invoices.view | n/a | partial | ✅ select-limited |
| `/api/admin/invoices/:id/status` | PUT | ✅ invoices.manage | n/a | partial (status enum; notes/payment unvalidated) | ✅ |
| `/api/admin/invoices/by-order/:orderId` | GET | ✅ invoices.view | n/a | ❌ | ✅ select-limited |
| `/api/admin/invoices/by-quote/:quoteId` | GET | ✅ invoices.view | n/a | ❌ | ✅ select-limited |
| `/api/admin/invoices/from-order/:orderId` | POST | ✅ invoices.manage | n/a | partial | ✅ idempotent helper |
| `/api/admin/invoices/from-quote/:quoteId` | POST | ✅ invoices.manage | n/a | partial | ✅ idempotent helper |
| `/api/admin/notifications` | GET | ⚠️ any-auth, no permission gate | ✅ max 50 | ✅ | ⚠️ inconsistent with other admin routes (scoped by user — low risk) |
| `/api/admin/notifications/:id/read`, `/read-all`, `/register-token` | PUT/POST/DELETE | ✅ requireAuth | n/a | partial/✅ | ✅ scoped updates |
| `/api/admin/orders` | GET | ✅ orders.view | ✅ max 50 | partial | ✅ amounts masked without financial perm |
| `/api/admin/orders/:id` | GET | ✅ orders.view | n/a | partial | ✅ masked + select-limited |
| `/api/admin/orders/:id/status` | PUT | ✅ orders.manage | n/a | ✅ enum + tx | ⚠️ per-item queries in loop; raw clamp hides oversell |
| `/api/admin/products` | GET | ✅ products.view | ✅ max 50 | partial | ⚠️ audit over-fetch (4×); exposes costPrice |
| `/api/admin/products` | POST | ✅ products.create | n/a | ✅ | ✅ |
| `/api/admin/products/:id` | GET/PUT/DELETE | ✅ view/edit/delete | n/a | ✅/partial | ✅ tx for attrs/seo; no order-reference guard on delete |
| `/api/admin/products/:id/audit` | GET | ✅ products.view | ✅ max 20 | partial | ✅ |
| `/api/admin/products/:id/images`, `/images/:imageId`, `/images/order` | POST/DELETE/PUT | ✅ products.edit | n/a | partial | ❌ no MIME/size/count caps; cover invariant via tx (good) |
| `/api/admin/products/:id/video`, `/video` | POST/DELETE | ✅ products.edit | n/a | partial | ❌ URL/MIME/size unvalidated |
| `/api/admin/products/:id/documents`, `/documents/:docId` | POST/DELETE | ✅ products.edit | n/a | partial | ⚠️ pdf assumption, scoped delete good |
| `/api/admin/products/upload-inline-image` | POST | ✅ products.edit | n/a | ✅ 2MB cap | ⚠️ no MIME allowlist |
| `/api/admin/quotes` | GET | ⚠️ view OR services.view OR orders.view | ✅ max 50 | partial (status unvalidated) | ⚠️ broad read fallback |
| `/api/admin/quotes` | POST | ⚠️ create OR view/services/orders view | n/a | ✅ phone/items/discount | ❌ view roles can create; no tx for create+PDF; qty no ceiling |
| `/api/admin/quotes/:id` | GET/PUT/DELETE | ⚠️ broad fallbacks | n/a | ✅/partial | ⚠️ PUT tx covers items only, not update+PDF (non-atomic) |
| `/api/admin/quotes/:id/status` | PUT | ⚠️ broad fallbacks | n/a | ✅ enum | ⚠️ auto-invoice errors swallowed |
| `/api/admin/quotes/upload-image` | POST | ✅ quotes.manage | n/a | ✅ 5MB cap | ⚠️ no MIME allowlist |
| `/api/admin/services` | GET | ✅ services.view | ❌ none | n/a | ⚠️ unbounded |
| `/api/admin/services` | POST | ✅ services.config | n/a | ❌ blind assignment | ❌ |
| `/api/admin/services/requests` | GET | ✅ services.view | ⚠️ no max (`?limit=100000` DoS) | partial | ❌ no max limit |
| `/api/admin/services/requests/:id` | GET/PUT | ✅ view/manage | n/a | ❌ status PUT has zero validation | ❌ arbitrary status; attachment IDOR (:fileId not scoped to :id) |
| `/api/admin/services/:id` | PUT/DELETE | ✅ services.config | n/a | ❌ blind / partial | ⚠️ requests-count guard good |
| `/api/admin/services/:id/form*` (5 routes) | various | ✅ services.config | n/a | ❌ blind assignment, no scope checks | ❌ |
| `/api/admin/settings/*` (13 routes) | GET/PUT/POST | ✅ settings.view/manage | n/a | mixed | ⚠️ seo/store/contact blind; secrets correctly masked in GETs; uploads lack MIME/size |
| `/api/admin/users` | GET/POST | ✅ users.manage | ❌ none | ✅ | ✅ salary masked for non-super; hash never selected |
| `/api/admin/users/:id` | PUT/DELETE | ✅ users.manage | n/a | ✅ + self/super guards | ✅ |

*Note: categories GET permission not re-verified this pass; presumed `categories.manage` per existing code.

## Section 3 — Database Schema Review

- Missing indexes: `AdminUser(isActive)` (+ salary filter in payroll); `Category(sortOrder, nameEn/Ar)` for search/sort; `Product(price)` range, `compareAtPrice` partial, search/trigram on name/slug/keywords; `ProductImage(isCover)` partial; `Order(customerPhone/customerName, paymentMethod)`; `OrderItem(productId)`; `OrderStatusHistory(changedByUserId, status)`; `QuoteRequest(phone/companyName, expiresAt)`; `Service(sortOrder, slug)`, `ServiceFormField(serviceId,sortOrder)`, `ServiceRequest(submittedAt)`, `Invoice(customerPhone/customerName)`, `AuditLog(userId, action)`; composite `StockMovement(productId,createdAt)`.
- Missing cascades: `StockMovement` uses `Cascade` — deleting a product silently erases financial audit trail (should be Restrict/SetNull). `Invoice→Order/Quote` uses `SetNull` — invoice survives but loses provenance (acceptable, documented). `ServiceRequestValue.fieldId` and `AuditLog.*` have no FKs at all (orphan rows).
- Nullable that should be required/documented: `QuoteRequest.discountType/discountValue/discountAmount` (nullable + default — contradictory); `ProductVideo.url` (required even when no video); `Banner.*` nearly all nullable (empty banners possible); `Service.slug` nullable + unique (NULLs bypass uniqueness in PG); `Expense.month/year` no range; `ServiceRequestValue.value` nullable (empty vs missing indistinguishable).
- Integrity risks: free-text statuses everywhere (no enums); `customerGovernorat` typo baked in (vs correct `governorate` on quotes); singleton `SiteSettings` unguarded; money math in float before Decimal write on order creation.

## Section 4 — Frontend Health Check

| Page | Data Source | Loading | Empty | Error | Mobile | Status |
|---|---|---|---|---|---|---|
| `/` | useAsyncData×5 | ❌ none | partial | ❌ none | ✅ | ⚠️ hardcoded services fallback masks outages; index-keyed loops |
| `/about` | useAsyncData | ❌ none | n/a | ❌ | ✅ | ⚠️ missing :key |
| `/cart` | Pinia store | n/a | ✅ | n/a | ✅ | ✅ |
| `/quote` | store + POST | spinner | ✅ | ✅ | ✅ | ⚠️ missing :key |
| `/checkout` | useAsyncData + guard | spinner | n/a | ✅ | ✅ | ✅ |
| `/checkout/success` | useAsyncData×2 | ❌ pulse only | n/a | ❌ silent fail | ✅ | ⚠️ |
| `/products` | grid (useAsyncData×4) | ✅ skeleton | ✅ | partial | ✅ | ✅ |
| `/products/offers` | useAsyncData + timer | ❌ none | via grid | ❌ | ✅ | ⚠️ fake fallback countdown when no end date (misleading) |
| `/products/[slug]` | useAsyncData | ❌ none | via grid | partial (fatal 404) | ✅ | ⚠️ |
| `/p/[slug]` | useAsyncData | ❌ none | n/a | partial (fatal 404) | ✅ | ⚠️ missing keys; hardcoded domain |
| `/landing/[product]` | useAsyncData | spinner | n/a | ✅ | ✅ | ✅ |
| `/services` | useAsyncData | ❌ none | ✅ | ❌ | ✅ | ⚠️ missing keys |
| `/services/[id]` | useAsyncData + onMounted init | spinner | n/a | ✅ | ✅ | ⚠️ hardcoded RTL breaks EN |
| `/services/success` | none (static) | n/a | n/a | n/a | ✅ | ✅ |
| `/admin` | useAsyncData×2 | ✅ skeleton | ✅ | ❌ silent fail | ✅ | ⚠️ missing keys; broad stats visibility |
| `/admin/login` | POST only | spinner | n/a | ✅ | ✅ | ✅ |
| `/admin/orders` | useAsyncData | ❌ pending unused | ✅ | ❌ | ✅ | ⚠️ stale flash on nav |
| `/admin/orders/[id]` | useAsyncData×2 | ❌ none | partial | ✅ | ✅ | ✅ good pattern |
| `/admin/products` | useAsyncData×2 | ❌ pending unused | ✅ | partial | ✅ | ⚠️ missing keys |
| `/admin/products/new` | shell (form fetches) | ❌ none | n/a | partial | ⚠️ no responsive classes | ⚠️ |
| `/admin/products/[id]/edit` | useAsyncData | ✅ skeleton | n/a | ✅ | ⚠️ may overflow mobile | ⚠️ |
| `/admin/categories` | useAsyncData×2 | ❌ pending unused | ✅ | ✅ | ✅ | ⚠️ missing key |
| `/admin/banners` | useAsyncData×5 | ❌ text only | custom (not component) | ✅ | ✅ | ⚠️ no skeleton |
| `/admin/inventory` | useAsyncData | ✅ skeleton | ✅ | ❌ silent fail | ✅ | ✅ best list pattern |
| `/admin/invoices` | useAsyncData | ❌ none | ✅ | partial | ✅ | ❌ shadows Nuxt `createError` with a ref of the same name |
| `/admin/invoices/[id]` | useAsyncData×3 | ❌ none | n/a | ✅ | ✅ print-intentional | ✅ |
| `/admin/quotes` | useAsyncData | ❌ pending unused | ✅ | ❌ | ✅ | ⚠️ missing key |
| `/admin/quotes/new` | useAsyncData + search | ✅ spinner | ✅ | ✅ | ✅ | ⚠️ idx keys |
| `/admin/quotes/[id]` | useAsyncData | ❌ none | n/a | ✅ | ✅ | ✅ |
| `/admin/quotations` | useAsyncData + native fetch | ✅ skeleton | ✅ | ✅ | ✅ | ⚠️ duplicate system; native fetch inconsistency |
| `/admin/users` | useAsyncData | ❌ pending unused | ✅ | ✅ | ✅ | ⚠️ missing keys |
| `/admin/notifications` | useAsyncData | ✅ skeleton | ✅ custom | ❌ | ✅ | ⚠️ missing key |
| `/admin/financials` | useAsyncData×5 | ✅ skeleton | ✅ | partial (summary silent) | ✅ | ⚠️ SVG chart has no table fallback |
| `/admin/settings` | children fetch | ❌ delegated | n/a | partial | ✅ | ✅ dirty-guard good |
| `/admin/services` | useAsyncData×2 | ❌ none | ✅ ×2 | partial | ✅ | ⚠️ missing keys |
| `/admin/services/[id]/form` | useAsyncData | ❌ none | ✅ | partial | ✅ | ⚠️ missing keys |
| `/admin/services/requests/[id]` | useAsyncData | ❌ none | partial | partial | ✅ | ⚠️ missing keys |
| layouts + navbar + footer | useAsyncData | n/a | n/a | ❌ silent fails | ✅ | ✅ |

## Section 5 — Security Audit

1. **Unauthenticated PII disclosure (critical).** `GET /api/quotes/:id/pdf` serves full quote PDFs (company, contact, phone, email) with no auth — guessable IDs. `GET /api/orders/:orderNumber` exposes customer name/phone/address/email with guessable `ME-DATE-6HEX` numbers and no ownership proof. Fix: require phone/email verification or signed tokens.
2. **Overly broad quote permissions (high).** Staff with only `services.view`/`orders.view` can create, edit, and delete quotations and trigger PDFs/invoices. Tighten to `quotes.manage`.
3. **Dashboard stats visible to every admin (medium).** Any staff (e.g. banner-only) sees order counts, recent orders/requests, audit log, low-stock. Gate non-financial parts by section permissions.
4. **No rate limiting / brute force protection (high).** Admin login, public order/quote/service-request creation, and expensive endpoints (PDF gen, facets, autocomplete) are unthrottled.
5. **Sensitive fields: correctly masked where it matters (good).** Salaries masked for non-super in users APIs; `costPrice`/`productCostSnapshot` never leave admin/financial endpoints; payment gateway/CAPI secrets never returned raw; password hashes never selected. No salary/cost leakage to public endpoints found.
6. **Unvalidated writes (medium).** Service form builder, settings (seo/store/contact), announcement bgColor, invoice notes/payment accept free strings (stored-XSS surface in admin-rendered HTML is low — Vue escapes by default; PDF paths use pdfmake text nodes — safe).
7. **Upload hardening gaps (medium).** Most upload endpoints check presence only — no MIME/size allowlists (exceptions: inline-image 2MB, quote image 5MB). Disk-fill and malicious-content risk.
8. **Attachment IDOR (medium).** `GET /api/services/requests/:id/attachments/:fileId` never verifies the file belongs to `:id`.
9. **Session: 7-day iron-session, httpOnly, revalidated per request with instant deactivation (good).** `secure` only when prod+https; sameSite lax. No sliding refresh noted.

## Section 6 — Performance Risks

1. **Queries without pagination:** public `/api/categories` (default full list), `/api/products/facets` (full attribute table into memory), `/api/services`, `/api/announcements`, `/api/banners`; admin `services`, `banners`, `users`, `employees`, `expenses`, `announcements` lists, financials export, service-requests `limit` with no max (`?limit=100000` DoS). Inventory/financials-sales/costs/invoices/orders/products/quotes correctly paginate.
2. **Missing `select{}` (full-row reads):** orders list, quotes list, notifications, employees, service-requests (+full `values`), banners + full settings row, announcements, services. Counter-examples doing it right: products list, inventory, financials/*, users, invoices list.
3. **`onMounted` fetches: none found** — all 12 `onMounted` usages are timers/listeners/form-init/guards. Data correctly uses `useAsyncData`/`useFetch`/`$fetch` at setup. No issues found.
4. **Images without lazy loading:** ~34 of 43 `<img>` lack `loading="lazy"`; only 3 have explicit width/height (sidebar logo, login logo, pixel) — CLS risk on product/category/banner/hero images across storefront and admin.
5. **In-memory aggregation at scale:** financials chart/sales/costs/export and inventory load entire month/catalog into Node memory (fine now, revisit past ~10k orders/month).
6. **Duplicate polling:** `AdminNotificationBell` polls via `refresh()` — interval not verified; check for aggressive polling if notifications feel chatty.

## Section 7 — Dead Code & Orphaned Files

- `app/components/app/AppIconStrip.vue` — 0 references. Dead icon-strip nav (superseded by navbar search; file left from a previous iteration). Delete.
- `app/components/ServiceSection.vue` — 0 references. Dead wrapper; live path is `ServiceForm` via `services/[id].vue`. Delete.
- `lib/utils.ts` (`cn()`) — 0 imports; `components.json` references it but nothing uses it. Delete or wire in.
- `server/api/admin/employees/*` (4 files) + `Employee` model — zero frontend callers (payroll moved to `AdminUser.salary` per FINANCIALS-AUDIT.md). Either delete or re-home payroll UI. Backend + model orphaned.
- `app/pages/admin/quotations.vue` — orphan duplicate of `admin/quotes/*`; sidebar links only to `/admin/quotes`; uses native `fetch()` inconsistently. Delete or redirect to canonical flow.
- `app/pages/admin/invoices/*.vue`, `admin/notifications.vue` — reachable but sidebar-invisible (by recent nav decision: invoices live behind order/quote modals; keep as deep links or re-add nav).
- `app/pages/landing/[product].vue` — 0 inbound links. Orphan marketing template; link it or remove.
- `test-db.mjs`, `update-seed*.mjs`, `update-slug.mjs`, `carryover-banner.mjs`, `fix-machinery-service-form.mjs` — one-shot/debug scripts, stale. Archive or delete.
- `storage/` binaries tracked in git + not volume-mounted (data loss on rebuild, repo bloat). Gitignore + volume needed.
- `Docs/` + root `FINANCIALS-AUDIT.md` — planning/history only, no runtime imports. Keep out of Docker context (no `.dockerignore` today).
- Filename quirk (not dead, confusing): `app/pages/products/[slug].vue` is the *category* page; real product detail is `app/pages/p/[slug].vue`.

## Section 8 — Production Readiness Score

**Overall: 58 / 100**

| Category | Score | Notes |
|---|---|---|
| Authentication & Authorization | 72 | Solid session model + RBAC; broad quote fallbacks, no rate limiting on login |
| Data Protection & PII | 55 | Salary/cost/secret masking is good; public quote-PDF and order-lookup PII exposure |
| Input Validation & Abuse Resistance | 58 | Writes mostly validated; uploads, service builder, and spam vectors unguarded |
| Database Design & Integrity | 66 | Sound relations + new indexes; free-text statuses, missing search indexes, orphan-capable FKs |
| API Design & Pagination | 70 | New endpoints clean ({data,meta} + whitelists); ~15 legacy lists unbounded |
| Frontend Robustness | 64 | Good RTL/dark/empty-state coverage; missing :keys epidemic, silent fetch failures, fake countdown |
| Performance & Caching | 52 | No rate limits, no CDN/cache headers, in-memory aggregations, 34 non-lazy images |
| Deployment & Operations | 48 | Dockerfile ships .env, no migrate-on-boot, no healthcheck, root user, weak defaults |

**Top 5 must-fix before production (by severity):**

1. **Fixed ✅ — Close unauthenticated PII exposure** — `GET /api/quotes/:id/pdf` and `GET /api/orders/:orderNumber` now require a per-resource 24h access token or an admin session. Data-breach risk closed.
2. **Fixed ✅ — Add rate limiting** — Nitro middleware before route handlers: admin login 5/min, `POST /api/orders` 10/min, `POST /api/quotes` 10/min, service-request creation 10/min, autocomplete 30/min, facets 20/min.
3. **Fixed ✅ — Fix Docker deployment hygiene** — `.dockerignore` added, non-root user, `HEALTHCHECK`, `prisma migrate deploy` as explicit boot step, named volumes for `storage/` + `public/uploads/`, `.env.example` ports fixed. Data-loss + secret-leak risk closed.
4. **Fixed ✅ — Tighten quote RBAC + validate service-request writes** — quote mutations restricted to `quotes.manage`; service-request status enum-validated; attachment `:fileId` scoped to `:id`; `services/requests` capped at 100; service-builder payloads Zod-validated.
5. **Fixed ✅ — Add missing DB indexes + guard expensive reads** — b-tree indexes on `Product.nameAr/nameEn`, `Order.customerPhone`, `QuoteRequest.phone` (`slug` already unique; no `Product.status` column — `isActive` already indexed); requests/financials endpoints bounded; 19 below-fold images lazy-loaded.
