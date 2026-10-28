# Remediation Progress — AMIR Salon

Working log for the fixes applied against `AUDIT_REPORT_AMIR_SALON.md`.
Findings are addressed in priority order (P0 → P3). Verification is static
(no `test`/`lint`/`typecheck` scripts exist in `package.json`); runtime
verification is pending explicit human approval.

## Phase 1 — Security & media — DONE

| ID | Change |
|----|--------|
| SEC-01 | `GET /api/admin/settings` returns only a safe field whitelist (`select`), gated on `settings.business`/`banners.manage`. No secret fields serialized. |
| SEC-01b | `PUT /api/admin/settings/mail` only overwrites `mailHttpKey` when a non-empty value is supplied (blank keeps existing). |
| SEC-02/15 | `.gitignore` adds `backups/`, `*.dump`, `*.sql`, `storage/`; ran `git rm --cached -r backups storage` (working files kept). |
| SEC-16 | `.env.example` seed password → placeholder; `prisma/seed*.mjs` no longer ship default credentials (require env). |
| SEC-03 | Fixed dead `manage-cancel` rate-limit matcher (`/api/bookings/manage/*/cancel`). |
| SEC-08 | Admin session cookie `Secure` set when request is HTTPS or public origin is HTTPS. |
| SEC-05/06 | Validated upload helpers in `server/utils/storage.ts` (`assertRasterImage`, `saveBrandImage`, `saveFavicon`, `saveStaffPhoto`, `saveReceipt`); raster re-encoded to WebP, magic-byte checks for ICO/PDF. |
| SEC-05 wiring | `logo.post.ts`, `favicon.post.ts`, `banners/upload.post.ts`, `staff/[id]/photo.post.ts`, `expenses/[id]/receipt.post.ts`, `products/upload-inline-image.post.ts` use the validated helpers (extension/MIME trusting removed). |
| SEC-04 | `staff` added to public media scopes in `server/routes/uploads/[...path].get.ts` (+ `.ico` MIME). Staff avatars render in the public picker. |
| SEC-09 | Meta CAPI `Purchase` gated on `booking.marketingConsent`; forwards stored `fbp`/`fbc`. |
| PAY-05 | Stripe + PayPal webhooks hand CAPI/mail/admin fan-out to `event.waitUntil`; `finalizePaidBooking` loads the booking once and never rejects. |

## Phase 2 — P0 UX / attribution — DONE

| ID | Change |
|----|--------|
| UX-01 | `booking/[slug].vue` no longer auto-redirects. The deposit amount is always disclosed and payment is an explicit step (one or two gateway buttons). |
| UX-02 | `booking/success.vue` polls `/api/bookings/status/:token` with a "confirming" state and a distinct "still processing" state instead of rendering a false failure. |
| UX-03 | Added `app/pages/admin/bookings/[id].vue` (details, customer/WhatsApp, payment, schedule, email log; assign, complete, cancel+refund, mark-refund-handled). Notification deep-links no longer 404. |
| UX-04 | Client sends a per-attempt `idempotencyKey`; reset on slot change. |
| UX-05 | Manage/cancel link surfaced on the success page. |
| UX-06 | Client-side email format validation on booking create. |
| FE-01 | Admin `wa.me` links (calendar, reminders) route through `normalizePhoneForWa`; the Egypt-specific `useWhatsApp` is explicitly re-scoped + documented as the studio's own contact-number helper only. |
| PAY-02 | `CHECKOUT.ORDER.APPROVED` webhook now captures + confirms server-side (browser-independent); return page is a fast fallback that trusts stored state on capture races. |

## Phase 3 — P1/P2 operational — DONE (with notes)

| ID | Change |
|----|--------|
| DB-01/DB-02 | Added `@@index([startsAt])`, `@@index([status, startsAt])`, `@@index([paymentStatus, holdExpiresAt])` + migration `20261019000000_booking_range_indexes`. |
| PERF-01 | Removed `expireHolds()` from the availability read path; lapsed holds are ignored by `loadDayBookings` and swept by the plugin. |
| ADM-01 | Dashboard `stats.get.ts` returns booking metrics (today, awaiting-assignment, refunds, collected deposits) to `bookings.view_all` users; dashboard renders a "Booking operations" section. |
| UX-08 | Reminders now queued for `PAID` bookings regardless of assignment (staff name optional). |

### Notes / intentionally deferred
- **BE-06 (coarse advisory lock):** left as-is. The single salon+day lock is
  what keeps multi-staff "any" checks deadlock-free (documented in
  `bookings/index.post.ts`). Narrowing safely requires sorted multi-key
  locking and concurrency testing — deferred rather than risk correctness.
- **ADM-02:** the 403 + default-template fallback for STAFF on
  `/api/admin/settings/booking` is intentional and already documented in
  `calendar.vue`; no change.
- **UX-07:** verified already-correct — `getBookableStaff` filters
  `isBookable === false`, so the "any" option never renders when no staff are
  bookable.
- **PERF-04:** immutable cache headers added. Per-`<img>` width/height audit
  deferred (broad churn, low value here).

## Final hardening pass — DONE (static review corrections)
- **UX-04:** the client `idempotencyKey` is now always a valid RFC4122 v4 UUID
  (`makeIdempotencyKey`, with a `getRandomValues`/Math.random fallback), so it
  passes the server's `z.string().uuid()` validation even without
  `crypto.randomUUID`.
- **SEC-05:** product-editor inline image upload (public `products/` scope) is
  now content-validated + re-encoded via `saveBrandImage` instead of the raw
  `storeFile` passthrough.
- **ADM-01:** `todayBookings` excludes both `CANCELLED` and
  `CANCELLED_BY_STAFF` (was matching a nonexistent status only).

## Functional testing pass — DONE (local dev DB + dev server)
- Ran pure unit suites (`verify-4` 16/16, `verify-2c` 38/38, `verify-2d` 27/27),
  DB-only suites (`verify-7` 15/15, `verify-9` 3/3) and HTTP integration suites
  (`verify-2e` 43/43, `verify-5` 9/9, `verify-6` 8/8, `verify-8` 12/12,
  `verify-10` 9/9, `verify-race` all scenarios) — **0 failures**.
- Ran a targeted script (deleted after): 37/37 + `todayBookings` status filter —
  auth guards, no-secret stats, ADM-01 staff scoping, upload content validation
  (no file written on reject), webhook fail-closed, idempotency, public
  status/availability PII-free. All fixtures removed (0 leftovers).
- `tsc -b`: 83 errors, **all pre-existing**; remediation-touched files are
  clean. Fixed 6 errors in touched files (audit type unions; multipart
  optional-chaining in 3 upload endpoints). Lint: not configured in repo.

## Admin panel UX/IA consolidation — DONE (implementation)
Full detail in `ADMIN_UX_REFACTOR_REPORT.md`.
- **Sidebar:** flat 15-item list replaced by labelled groups (Overview,
  Bookings, Catalog, Team & Schedule, Website, Finance, System); per-item
  permission gates unchanged; group labels collapse to a separator.
- **Merge:** `/admin/users` (`users.manage`) + `/admin/staff` (`schedule.manage`)
  → `/admin/team` with URL-addressable, permission-scoped tabs
  (`?tab=users`, `?tab=staff`). Inactive tab's data is never fetched; a
  user with neither permission gets a no-access state. `/admin/users` and
  `/admin/staff` now redirect to the matching tab.
- **Extracted:** `AdminUsersPanel.vue` / `AdminStaffPanel.vue` (rendered by
  `team.vue`) instead of one giant page. Fixed a real bug in the old
  `users.vue`: `currentUser` was referenced in the template but never defined,
  so the self-role-change / self-deactivate guards never applied.
- **Deep links updated:** user create/update notifications, failed-login
  security alert, activity feed entity→route mapping; activity entity-type
  whitelist extended to staff / expense / expense-category.
- **Remnants investigated:** Products & Categories are LIVE (public navbar,
  footer, homepage and `/products` pages) — kept. `ADMIN-UX-AUDIT.md`
  (electronics-store, references non-existent inventory/orders/financials
  pages) and `ADMIN-PANEL-MAP.md` annotated as stale. Job-title option
  `Warehouse` → `Stylist`.
- **i18n:** added `admin.team*`, `admin.tab*`, `admin.workingHours`,
  `admin.group*` keys to `en.json` + `de.json` (both validated as JSON).
- **Verification:** `npm run build` PASS. Browser verification (Playwright,
  local dev DB) **33/33 checks pass**: sidebar groups, single Team link,
  `/admin/users` + `/admin/staff` redirects, default tab, tab switch + reload
  persistence, unknown-tab clamping, `schedule.manage`-only user (staff panel
  only, no Users tab, zero `/api/admin/users` requests), no-permission user
  (no-access state, zero users/staff requests). Temp fixtures deleted (2/2);
  temporary dev server stopped.

## Admin panel Phase 2 — page-by-page consistency — DONE (implementation)

Full detail in `ADMIN_UX_REFACTOR_REPORT.md` §9–§13.
- **Shared tabs:** new `AdminTabs.vue` (ARIA tablist, roving tabindex, RTL-aware
  arrow/Home/End keys, optional icon/badge), adopted by Settings, Banners, Team
  and My Bookings. `useAdminCan` now accepts `string | string[]` (OR).
- **Dashboard:** fixed the dead Settings quick action (`settings.view` is not a
  real permission), gated catalog KPI cards by page permission, added the
  **Manage Team** quick action.
- **Settings:** tabs filtered by the permission each panel actually calls;
  duplicate "Announcements & Banners" tab removed (legacy `?tab=announcements`
  redirects to `/admin/banners?tab=announcements`); invalid tabs clamp to the
  first allowed tab; page meta no longer accepts `banners.manage`.
- **Expenses:** delete confirmation, empty state, corrected category/description/
  cancel labels, typed + cleared debounce timer.
- **Bookings list/detail:** added `requiredPermission` guards; empty states.
- **Calendar / Reminders / My Bookings:** polling lifecycle fixed, empty states
  unified, My Bookings tabs URL-addressable.
- **Banners:** URL-validated tabs (deep links/reload), empty state.
- **Confirmations:** remove absence, remove closure day, delete logo.
- **Dates/polling:** `todayBerlinISO()` for Expenses/Calendar date defaults
  (UTC slicing dropped "today" in Europe/Berlin after midnight); sidebar inbox
  poll gated on `inbox.manage` (removed 403 noise for other roles).
- **i18n:** 12 new keys per locale (`en`/`de`), key parity verified (604/604).
- **Verification:** final `npm run build` PASS (exit 0; only two pre-existing
  `[PLUGIN_TIMINGS]` warnings). Phase 2 Playwright suite PASS **45/45** on a
  temporary `:3012` server (admin + disposable payment-only/banners-only RBAC
  users, fixtures deleted, server stopped, no 403 responses).

## Manual / out-of-band steps (require human)
- Rotate gateway credentials (Stripe/PayPal) and admin passwords — `storage/`
  and `*.dump` were previously tracked in git history.
- Purge `backups/*.dump` from git history (git filter-repo/BFG) before
  publishing the repo.
- Run `prisma migrate deploy` (or `migrate dev`) to apply the new indexes.
- Subscribe the PayPal webhook to `CHECKOUT.ORDER.APPROVED` (and keep
  `PAYMENT.CAPTURE.COMPLETED`) for the browser-independent capture path.
