# Salon Management (Admin Panel) — Full Page Review

**Date:** 2026-10-28
**Scope:** every route under `app/pages/admin/` (27 pages), the shell/layout, and the 41 admin panels that back them (`app/components/admin/`).
**Method:** static review of all admin pages, shell components, composables, middleware, permissions, and the 115 admin API handlers; i18n key coverage audit; dialog/tab/polling/a11y inventory. No builds, servers, or browser tests were executed as part of this review (project verification policy).

---

## 1. Executive summary

The admin area is in good shape structurally: route-level permission gates, API-level permission gates, session revalidation on every request, audit logging, and a mostly complete German/English translation set. The main risks are **data-loss paths** and **surfaces that fail silently**, not security holes.

| # | Priority | Finding | Impact |
|---|---|---|---|
| 1 | **P1** | `AdminSchedulePanel` renders hardcoded 09:00–18:00 defaults and does not surface load errors; saving after a failed GET overwrites real working hours | Wrong opening hours → broken booking availability |
| 2 | **P1** | Settings dirty-guard only protects tab switches; leaving the page discards unsaved settings without warning | Silent loss of business/settings edits |
| 3 | **P2** | 690 `locale === 'ar'` branches are unreachable (only `de`/`en` exist); several screens hardcode English or use dead Arabic ternaries | German UI mixed with English; localization debt |
| 4 | **P2** | Notification/activity table rows are click-only `<tr>` elements (no keyboard access) | Notifications and audit history unusable by keyboard/AT |
| 5 | **P2** | 19 `role="dialog"` modals (10 with `aria-modal`) plus 1 `alertdialog`; 0 focus traps, 0 autofocus | Focus escapes behind modals; Escape handling inconsistent |
| 6 | **P2** | 6 silent `catch { /* best-effort */ }` blocks in Inbox/Notifications + history load with no catch | Failed actions look successful |
| 7 | **P2** | Dashboard has no error state; a failed stats fetch renders zeros as real KPIs | Misleading operational numbers |
| 8 | **P2** | Calendar detail `useAsyncData` key omits the booking id and `openPanel()` double-fetches | Extra requests, possible wrong-booking flash on rapid clicks |
| 9 | **P3** | Inconsistent date/number locales, `any`-typed payloads, 14 legacy redirect routes, very large components | Maintainability / consistency |

---

## 2. Architecture

### 2.1 Routing and navigation

Single shell: `app/layouts/admin.vue` → `AdminSidebar` + `AdminHeader` + `<main id="main-content">` with skip link. Sidebar has 7 top-level entries (`AdminSidebar.vue:65-71`):

| Sidebar item | Route | Visible when |
|---|---|---|
| Dashboard | `/admin` | always |
| Appointments | `/admin/appointments` | `bookings.view_all` or `bookings.view_own` |
| Salon Management | `/admin/salon` | `services.manage`, `users.manage`, or `schedule.manage` |
| Catalog | `/admin/catalog` | `products.view` or `categories.manage` |
| Finance | `/admin/finance` | `expenses.view` or refund permissions |
| Website | `/admin/website` | `inbox.manage` or `banners.manage` |
| Settings | `/admin/settings` | any `settings.*` or `banners.manage` |

Notifications and Activity are reached from the header bells, not from the sidebar.

### 2.2 Page shells

The large feature areas are **tabbed shells**; each tab lazy-renders a panel only when selected (`v-if` / `v-else-if`), so only one panel's queries run at a time:

- `appointments.vue` → `calendar` · `reminders` · `my-bookings` · `bookings`
- `salon.vue` → `services` · `team` (with `teamTab=users|staff`) · `hours`
- `catalog.vue` → `products` · `categories`
- `finance.vue` → `expenses` · `payments`
- `website.vue` → `inbox` · `banners`
- `settings.vue` → 9 sections (general, contact, seo, store, payment, booking, mail, meta, website)

Tab state is URL-driven through `useAdminTabQuery` (query key `tab`), which is good: deep links and refresh preserve the active tab. Tabs are filtered by permission before render.

### 2.3 Auth and authorization (3 layers)

1. **Middleware** `app/middleware/admin-auth.ts`
   - No session → `/admin/login`.
   - Staff-only users (`role === 'STAFF'` without `bookings.view_all`) are redirected from `/admin` to `/admin/appointments?tab=my-bookings`.
   - `requiredPermission` meta gate is **any-of** (`admin-auth.ts:22-28`); unauthorized users go to `/admin` (or to My Bookings for staff-only).
2. **UI visibility** — `useAdminCan()` hides nav items, tabs, buttons. Defense in depth only, not enforcement.
3. **API enforcement** — `requirePermission()` / `requireAuth()` on 113 of 115 admin handlers. Only `auth/login.post.ts` and `auth/logout.post.ts` are intentionally ungated. `getSessionUser()` re-validates the admin against the database on every authenticated request, so deactivation takes effect immediately.

Session cookie: httpOnly, `sameSite=lax`, `Secure` forced when the canonical site is HTTPS, 7-day expiry (`server/utils/auth.ts`). Login is rate-limited to 5 req/min and returns a generic 401 (`server/api/admin/auth/login.post.ts:1-24`).

### 2.4 Data layer

- Most panels use `useAsyncData` + `useRequestFetch()` (SSR-friendly for the initial tab).
- Inbox, notifications, and activity use `{ server: false }` (client-only fetches); notifications and activity also have full pages reached from the header bells.
- Shared `useState` caches: `useAdminSession` (`admin-session`) and `useAdminHeader` (`admin-header`) — the latter batches notifications + activity + inbox into one `Promise.all` (`app/composables/useAdminHeader.ts:14-24`).
- Mutations use `$fetch` + `refresh()`; user feedback goes through `useAdminToast` and `useAdminConfirm`.

### 2.5 i18n

- Locales configured: only `de` and `en` (`nuxt.config.ts:58-75`); messages loaded: `en`, `de` only (`i18n/i18n.config.ts`).
- **All 337 static `t('...')` keys used in the admin UI exist in both `en.json` and `de.json`** (0 missing) — the translation files are not the problem.
- The problem is strings that never go through `t()` (see P2-1).

---

## 3. Page inventory

### 3.1 Primary pages (13)

| Route | File | Gate | Sections / purpose | Main data |
|---|---|---|---|---|
| `/admin` | `index.vue` (336) | none (staff redirected) | KPI cards, booking ops cards, quick actions | `/api/admin/dashboard/stats` |
| `/admin/login` | `login.vue` (187) | public | Login, theme toggle, locale toggle de↔en | `/api/admin/auth/login` |
| `/admin/appointments` | `appointments.vue` (62) | bookings view | 4 tabs: calendar, reminders, my bookings, all bookings | see panels |
| `/admin/salon` | `salon.vue` (55) | services/users/schedule | 3 tabs: services, team, hours | see panels |
| `/admin/catalog` | `catalog.vue` (50) | products/categories | 2 tabs: products, categories | see panels |
| `/admin/finance` | `finance.vue` (53) | expenses/refunds | 2 tabs: expenses, payments & refunds | see panels |
| `/admin/website` | `website.vue` (50) | inbox/banners | 2 tabs: inbox, banners | see panels |
| `/admin/settings` | `settings.vue` (147) | any settings/banners | 9 sections | `/api/admin/settings*` |
| `/admin/notifications` | `notifications.vue` (277) | `notifications.view` | Filterable notification history | `/api/admin/notifications` |
| `/admin/activity` | `activity.vue` (279) | **none** (API scopes) | Audit log with entity/action filters | `/api/admin/activity` |
| `/admin/bookings/:id` | `bookings/[id].vue` (532) | bookings view | Detail, assign, complete, cancel/refund, mail log | `/api/admin/bookings/:id` |
| `/admin/products/new` | `products/new.vue` (17) | `products.manage` | Product creation form | `AdminProductForm` |
| `/admin/products/:id/edit` | `products/[id]/edit.vue` (171) | `products.manage` | Product edit + audit timeline | `/api/admin/products/:id`, `/audit` |

### 3.2 Legacy redirect routes (14)

All are thin `navigateTo(..., { replace: true })` shims that preserve query strings:

| Route | Redirects to |
|---|---|
| `/admin/staff` | `/admin/salon?tab=team&teamTab=staff` |
| `/admin/users` | `/admin/salon?tab=team&teamTab=users` |
| `/admin/team` | `/admin/salon?tab=team` |
| `/admin/schedule` | `/admin/salon?tab=hours` |
| `/admin/services` | `/admin/salon?tab=services` |
| `/admin/calendar` | `/admin/appointments?tab=calendar` |
| `/admin/reminders` | `/admin/appointments?tab=reminders` |
| `/admin/my-bookings` | `/admin/appointments?tab=my-bookings` |
| `/admin/bookings` | `/admin/appointments` |
| `/admin/products` | `/admin/catalog?tab=products` |
| `/admin/categories` | `/admin/catalog?tab=categories` |
| `/admin/expenses` | `/admin/finance?tab=expenses` |
| `/admin/inbox` | `/admin/website?tab=inbox` |
| `/admin/banners` | `/admin/website?tab=banners` (announcements/ticker → settings?tab=website) |

These are consistent and safe, but they double the route surface and must be kept in sync with tab ids.

### 3.3 Panels behind the shells (selected)

| Panel | Lines | Primary endpoints | Notes |
|---|---|---|---|
| `AdminBookingsPanel` | 840 | `/api/admin/bookings`, `/staff-options`, `/staff-cancel` | Filters, multi-select, batch assign, refunds |
| `AdminCalendarPanel` | 723 | `/api/admin/calendar`, `/bookings/manual`, `/settings/booking`, `/services`, `/staff` | Week/day view, drag-free slot picker, side panel |
| `AdminMyBookingsPanel` | 443 | `/api/admin/bookings`, `/staff/unavailable`, `/staff-cancel` | Staff self-service; 30 s clock |
| `AdminRemindersPanel` | 103 | `/api/admin/reminders` | 60 s poll; WhatsApp links |
| `AdminServicesPanel` | 623 | `/api/admin/services` | CRUD + media |
| `AdminTeamPanel` | 85 | — | Sub-tabs users/staff only |
| `AdminSchedulePanel` | 171 | `/api/admin/working-hours` | Weekly hours; P1 finding |
| `AdminProductsPanel` | 573 | `/api/admin/products` | Featured toggle, SEO keywords, filters |
| `AdminCategoriesPanel` | 579 | `/api/admin/categories` | CRUD + cover images |
| `AdminExpensesPanel` | 428 | `/api/admin/expenses`, `/expense-categories` | Debounced search |
| `AdminPaymentsPanel` | 149 | `/api/admin/bookings?needsRefund=true`, `/dashboard/stats` | Read-only refund queue |
| `AdminInboxPanel` | 356 | `/api/admin/inbox` | Client-only, detail drawer, delete |
| `AdminBannersPanel` | 420 | `/api/admin/banners`, `/banners/upload`, `/products`, `/categories` | CRUD, image, CTA link, placement, sort |
| `AdminUsersPanel` | 723 | `/api/admin/users` | Roles, extra permissions, password reset |
| `AdminStaffPanel` | 529 | `/api/admin/staff`, `/working-hours`, `/closures` | Staff profiles + availability |
| `ProductForm` | 1172 | `/api/admin/products*` | 3-step form + media + SEO |

Shell components: `AdminSidebar` (245), `AdminHeader` (246), `AdminTabs` (85), `AdminConfirmDialog` (better a11y than the rest), `AdminPagination` (73), `AdminPageHeader`, `AdminEmptyState`, `AdminStatusBadge`.

---

## 4. Findings

Severity: **P1** = can corrupt business data / lose work; **P2** = broken UX, accessibility, or misleading state; **P3** = maintainability/consistency.

### P1-1 — Working-hours screen can overwrite real hours after a failed load

**Evidence:** `app/components/admin/AdminSchedulePanel.vue:29-39`, `:59-75`

```ts
const { data, refresh, pending } = await useAsyncData('admin-working-hours', ...)

const rows = ref<DayRow[]>(DAY_KEYS.map((_, weekday) => ({
  weekday,
  open: '09:00',
  close: '18:00',
  isClosed: weekday === 0,        // Sunday closed
})))

watch(data, (val) => {
  if (!val) return                     // error / null → keep defaults
  ...
}, { immediate: true })
```

- `error` is not destructured, so a 401/500/network failure is indistinguishable from an empty schedule.
- The table renders the 09:00–18:00 defaults and the Save button is enabled as soon as `pending` is false.
- `save()` (`:59-75`) PUTs every row unconditionally.

**Impact:** one failed GET + one Save silently replaces the salon's real opening hours (and marks Sunday closed). This directly affects public booking availability.

**Recommendation:** destructure `error`; render a blocking error panel with Retry; add a `loaded` flag and disable Save until the first successful response; do not seed rows with plausible business values (use empty/disabled inputs or a skeleton). Optionally require an explicit confirmation when saving unchanged defaults.

---

### P1-2 — Unsaved settings are lost when leaving the page

**Evidence:** `app/pages/admin/settings.vue:20`, `:85-99`; `app/composables/useSettingsForm.ts:12-14`

```ts
// settings.vue
const settingsDirty = useSettingsDirtyFlag()

async function switchTab(id: string) {
  if (settingsDirty.value) { /* confirm dialog */ }
  router.replace(...)
}
```

```ts
// useSettingsForm.ts
export function useSettingsDirtyFlag() {
  return useState<boolean>('admin-settings-dirty', () => false)
}
```

There is **no** `onBeforeRouteLeave`, `beforeunload`, or router `beforeEach` guard anywhere in the app (grep: 0 matches). The guard only runs when clicking a settings tab.

**Impact:** editing General/Payment/Mail/Meta and then clicking any sidebar item, pressing Back, reloading, or closing the tab discards the changes with no warning.

**Recommendation:** implement the guard once in `useSettingsForm` (or the admin layout): `onBeforeRouteLeave` + `window.addEventListener('beforeunload')` while `dirty` is true, reusing `useAdminConfirm`. Clear the flag on successful save/reset.

---

### P2-1 — German UI is partly English; 690 Arabic branches are dead code

**Evidence:** `nuxt.config.ts:58-75` and `i18n/i18n.config.ts` define only `de` and `en`. Yet the admin UI contains **690 occurrences of `locale === 'ar'` / `locale.value === 'ar'` across 40 files**.

Concrete user-visible cases (all render English while the rest of the page is German):

| Location | What is hardcoded |
|---|---|
| `app/pages/admin/settings.vue:44-51` | 5 of 9 tab labels (`'General & Brand'`, `'Contact & Social'`, `'SEO & AI Discovery'`, `'Store Config'`, `'Meta Integration'`); the other 4 use `t()` |
| `app/pages/admin/settings.vue:106` | Page description |
| `app/pages/admin/settings.vue:112` | Tabs `aria-label` |
| `app/pages/admin/settings.vue:89-93` | Discard-changes dialog title/message/confirm label |
| `app/components/admin/AdminPagination.vue:19-23` | `Showing page X of Y` / `Previous` / `Next` |
| `app/components/admin/AdminPageHeader.vue:25` | Back label |
| `app/pages/admin/index.vue:57-81, 138-167, 180, 192, 202` | KPI labels/hints, 5 quick actions, page description, Refresh/Add Product |
| `app/pages/admin/index.vue:223, 271` | Numbers formatted with `de-DE` regardless of locale |
| `app/pages/admin/login.vue` | Login copy is largely hardcoded (see file) |
| `app/components/admin/AdminSidebar.vue:124, 155, 163` | “Admin Panel”, “Close sidebar”, “Admin Navigation” |
| `app/pages/admin/bookings/[id].vue:330, 397` | “Provider”, “No active staff members found.” |
| `app/components/admin/AdminProductsPanel.vue:448-450` | Featured tooltip/aria-label tree; `sr-only` text is always English |

**Impact:** the German launch experience is inconsistent; the Arabic translations are unreachable, and every `locale === 'ar'` branch is dead weight that hides the missing `t()` keys.

**Recommendation:** (a) replace these ternaries with `t()` keys and delete the Arabic branches, or (b) if Arabic is a real roadmap item, add the `ar` locale + messages properly. Do (a) now; it also removes ~690 dead conditionals. High-value files: `settings.vue`, `index.vue`, `AdminPagination.vue`, `AdminPageHeader.vue`, `AdminSidebar.vue`, `bookings/[id].vue`.

---

### P2-2 — Notification and activity rows are not keyboard accessible

**Evidence:** `app/pages/admin/notifications.vue:199-205` and `app/pages/admin/activity.vue:213-218`:

```vue
<tr ... @click="openNotification(n)">
```

No `tabindex`, `role="button"`, or `@keydown.enter/space`. There is no focusable control inside the row that performs the same action (some rows have separate buttons, but the row itself opens/navigates).

**Impact:** keyboard-only and screen-reader users cannot open notifications or audit entries.

**Recommendation:** make the primary cell a `<NuxtLink>`/`<button>` (preferred), or add `tabindex="0"`, `role="link"`, and Enter/Space handling; add a visible focus ring.

---

### P2-3 — Modal accessibility is inconsistent

**Evidence (counts across admin UI):**

- `role="dialog"`: 19 (10 with `aria-modal="true"`)
- `role="alertdialog"`: 1 (`AdminConfirmDialog`, with `aria-modal`)
- focus traps: **0**
- `autofocus`: **0**
- explicit `.focus()` calls: 3

`AdminConfirmDialog` is the good example (alertdialog + aria-modal + global Escape). Many panel modals are plain fixed-position divs with `role="dialog"` and `@keydown.escape` on the wrapper (17 handlers). Since nothing receives focus on open, focus stays on the trigger outside the wrapper, so Escape only works if the user has tabbed into the modal first.

**Impact:** keyboard users can tab into the page behind a modal; Escape usually does nothing right after opening; focus is not restored to the trigger after close; screen readers are not told the dialog is modal.

**Recommendation:** extract one `AdminModal` wrapper with: focus trap, initial focus on the first control/close button, focus restore, `aria-labelledby`/`aria-describedby`, body scroll lock, and Escape registered on `document` while open. Migrate the 19 dialogs incrementally, starting with booking detail (assign/complete/refund), product form, and user editor.

---

### P2-4 — Failed actions fail silently

**Evidence:**

| File | Lines | Behavior |
|---|---|---|
| `AdminInboxPanel.vue` | `95, 107, 123, 139` | mark-read, delete, mark-all swallow errors; row stays but user sees no error |
| `notifications.vue` | `101, 112` | mark-read / mark-all failures ignored |
| `products/[id]/edit.vue` | `32-46` | history `try/finally` with **no catch**; failure leaves an empty timeline and an unhandled rejection |

Example (`AdminInboxPanel.vue:113-141`): a failed `DELETE` is caught, `deletingId` resets, the row remains, and no toast is shown — the UI looks like nothing happened.

**Impact:** operators cannot distinguish “already read” from “request failed”; audit history silently appears empty.

**Recommendation:** `toast.error(t('admin.actionFailed'), e?.data?.message)` in each catch, keep optimistic state only after success, and add a catch (with retry) to `loadHistory`.

---

### P2-5 — Dashboard presents failed statistics as zeros

**Evidence:** `app/pages/admin/index.vue:41-44` destructures only `data`/`pending`/`refresh`; the KPI computeds fall back to `0` when `data` is null. The template has no error branch (`:208-283`). There is no “data unavailable” state.

**Impact:** if `/api/admin/dashboard/stats` fails, the owner sees “0 bookings / €0 revenue / 0 products” with no indication of failure — potentially alarming and misleading.

**Recommendation:** destructure `error`, show an alert with Retry above the cards, and render `—` (not `0`) when data is unavailable.

---

### P2-6 — Calendar detail cache key is not per-booking, and `openPanel` double-fetches

**Evidence:** `app/components/admin/AdminCalendarPanel.vue:229-237`

```ts
const { data: detail, ... } = await useAsyncData('admin-calendar-detail', () =>
  panelId.value ? fetch(`/api/admin/bookings/${panelId.value}`) : Promise.resolve(null),
  { watch: [panelId] },
)

function openPanel(id: string) {
  panelId.value = id      // triggers the watcher → fetch #1
  refreshDetail()         // explicit fetch #2
}
```

- The key `admin-calendar-detail` is global and does not include the id, so Nuxt's key-based cache can serve the previous booking's payload as initial data.
- `watch: [panelId]` plus the explicit `refreshDetail()` produces two GETs per open.
- Rapid clicks on two bookings can resolve out of order and leave the panel showing the wrong booking.

**Impact:** extra load and a real risk of acting on the wrong booking (assign/complete/refund buttons live in this panel).

**Recommendation:** use `useAsyncData(() => \`admin-calendar-detail-${panelId.value}\`, ..., { watch: [panelId] })` and delete the explicit `refreshDetail()` in `openPanel`; alternatively keep one key but use `getCachedData: () => undefined`.

Related: `admin-products`, `admin-users`, `admin-services`, `admin-categories` keys do not encode filters; with Nuxt's key cache, returning to a tab can render previously fetched rows before/without a refetch. Encoding the query in the key (or calling `refresh()` on mount) avoids stale lists after edits made in another tab.

---

### P2-7 — Background polling never pauses

**Evidence:**

| Component | Interval | Line |
|---|---|---|
| `AdminNotificationBell` | 30 s | `28-30` |
| `AdminActivityBell` | 30 s | `27-29` |
| `AdminCalendarPanel` | 30 s | `66-68` |
| `AdminRemindersPanel` | 60 s | `17-20` |
| `AdminMyBookingsPanel` (clock) | 30 s | `43-45` |

No `visibilitychange` / `document.hidden` checks. The bells also call `invalidate()` + `load()` on every tick, and the header cache is per session (`useAdminHeader.ts`).

**Impact:** hidden tabs keep querying the database (activity/notifications/inbox are relatively heavy), wasting resources and battery; calendar refresh can also re-render while a modal is open.

**Recommendation:** pause intervals when `document.hidden`, refresh once on `visibilitychange`/`focus`, and consider SSE for notifications instead of 30 s polling. (This was already listed as a pending optimization, not applied.)

---

### P2-8 — Reminders panel has no error state

**Evidence:** `AdminRemindersPanel.vue:12-24` destructures only `data/refresh/pending`; `error` is unused. On failure `rows` is `[]` and the template shows the normal empty state (“no reminders”), which is factually wrong.

**Recommendation:** same pattern as `AdminPaymentsPanel.vue:94-97` (error alert + retry). Small change, high clarity.

---

### P3 findings

| ID | Finding | Evidence | Recommendation |
|---|---|---|---|
| P3-1 | Date/time locale inconsistency: some screens hardcode `de-DE` / `en-US` instead of following the active locale | `AdminPaymentsPanel.vue:38`, `AdminMyBookingsPanel.vue:70`, `AdminBookingsPanel.vue:116`, `AdminStaffPanel.vue:180`, `AdminRemindersPanel.vue:27`, `AdminCalendarPanel.vue:176`, `AdminExpensesPanel.vue:57`, `bookings/[id].vue:47` vs `notifications.vue:60`, `AdminInboxPanel.vue:60` | Central `useAdminFormat()` with `Intl.DateTimeFormat(locale)` (or a shared `formatDate` util) |
| P3-2 | Loose typing on API payloads | `AdminCalendarPanel.vue:229` (`fetch<any>`), `AdminPaymentsPanel.vue:23-25` (`fetch<any>`), `AdminRemindersPanel.vue:12` (`fetch<any>`), `bookings/[id].vue:33` (`fetch<any>`) | Reuse shared types (`Booking`, `Reminder`, `DashboardResponse`) |
| P3-3 | `/admin/activity` has no page-level `requiredPermission` | `activity.vue:13` vs `notifications.vue:9` | Add an explicit permission (or document that any authenticated admin may see their own scoped log); API already scopes staff to their own entries (`server/api/admin/activity.get.ts:8-12`) |
| P3-4 | Inbox has a skeleton but no error UI | `AdminInboxPanel.vue:272-280` (pending + empty only) | Add error + retry like Payments |
| P3-5 | Login page has no `definePageMeta`; an already-authenticated admin still sees the form | `app/pages/admin/login.vue:1-8` (no meta), no redirect on mount | Redirect to the dashboard (or role default) when a session exists |
| P3-6 | Very large single-file components | `ProductForm.vue` 1172, `AdminRichEditor.vue` 894, `AdminBookingsPanel.vue` 840, `AdminCalendarPanel.vue` 723, `AdminUsersPanel.vue` 723 | Split by step/section; extract table + filters + modals |
| P3-7 | 14 legacy redirect routes duplicate tab knowledge | Section 3.2 | Keep for compatibility; add a comment/lint note tying each redirect to its tab id |
| P3-8 | Hardcoded English in `sr-only`/aria strings introduced with the Featured toggle | `AdminProductsPanel.vue:448-450` (`Featured` / `Not featured`) | Move to `t('admin.featured')` / `t('admin.notFeatured')` |

---

## 5. Per-page notes

### `/admin` — Dashboard
- KPI cards (products, categories, active services) + booking ops (total/paid/today/unassigned/refunds/revenue) with permission-aware links.
- Uses one SSR `useAsyncData('admin-dashboard-stats')`; Refresh button re-runs it.
- No error state (P2-5); numbers use `de-DE`; quick actions and description are hardcoded EN/AR (P2-1).
- Staff-only users never see it (middleware redirect).

### `/admin/login`
- Clean standalone page: email/password, show/hide password, theme toggle, de↔en toggle.
- Handles 401, 429 (rate limit message), and generic failures; staff-only users are routed to My Bookings after login (`login.vue:34-40`).
- No `definePageMeta` and no “already signed in” redirect (P3-5). Copy is mostly hardcoded.

### `/admin/appointments`
- Shell only; default tab is `calendar` for managers, `my-bookings` for staff.
- All four tabs share the booking permission pair; no empty-access state is reachable for legitimate users (the `!allowedTabs.length` branch exists).

**Calendar tab**
- Week/day views, staff filter, service filter, manual booking modal, booking side panel.
- 30 s auto-refresh (P2-7); detail key/double-fetch (P2-6); 4 silent fallbacks (settings/services/staff lookups + picker load) and 4 user-facing toasts.
- Date formatting mixes `de-DE` and locale ternaries (P3-1).

**Reminders tab**
- Due-in-N-hours selector (default 3 h), email status, WhatsApp link via `wa.me`, 60 s poll.
- No error state (P2-8); rows show nothing when the request fails.

**My bookings tab**
- Staff self-service: upcoming/past, cancel with reason, mark unavailable, 30 s clock for “starting in …”.
- Permission model is correct (`bookings.view_own`); staff cannot see other staff.

**All bookings tab**
- Filters (status, date, staff, needs-refund, search), multi-select batch assign/cancel, pagination (20/page), URL sync.
- 5 catch blocks with toasts; table is dense but functional. Refund/cancel actions route to detail or confirm modal.

### `/admin/salon` (Salon Management)
- Shell with three permission-filtered tabs.

**Services tab** — `AdminServicesPanel` (623): section-grouped list, create/edit modal, cover upload, price, duration, sort order, active + featured toggles, delete confirm. Service name/description are German-only by schema (`prisma/schema.prisma:182-183`). 4 catches, empty state present.
**Team tab** — `AdminTeamPanel` (85) → `AdminUsersPanel` / `AdminStaffPanel`.
  - Users: role select (ADMIN/MANAGER/STAFF/…), extra permissions grid, active toggle, password reset, delete guard. Role presets intentionally send `permissions: []`; server applies role defaults.
  - Staff: profile per user, weekly availability, closures/time off, service assignments. 14 fetches, 10 catches — the most complex panel after bookings.
**Hours tab** — `AdminSchedulePanel` (171): seven rows, closed toggle, open/close validation. **P1-1.**

### `/admin/catalog`
**Products tab** — `AdminProductsPanel` (573): search/category/status filters, pagination, cover thumbnails, ACTIVE + FEATURED inline switches, SEO keywords column toggle, delete confirm. Featured toggle blocks inactive products client-side (`:118-130`) and the API returns 400 for the same rule. Tooltips/aria labels are long inline EN/AR ternaries (P2-1, P3-8).
**Categories tab** — `AdminCategoriesPanel` (579): paged list, cover image, name AR/EN (both required by the form even though `ar` is not a UI locale), product counts, delete guard.

### `/admin/finance`
**Expenses tab** — `AdminExpensesPanel` (428): month filter, category filter, debounced search (400 ms), totals, create/edit modal, receipt upload, delete. 5 catches.
**Payments & refunds tab** — `AdminPaymentsPanel` (149): read-only list of `needsRefund` bookings + revenue/deposit metrics; links to booking detail. Best error/empty-state pattern in the admin (reuse it).

### `/admin/website`
**Inbox tab** — `AdminInboxPanel` (356): all/unread/read, pagination, detail drawer, mark read, delete, mark all. Client-only (`server:false`); skeleton exists, no error UI; 4 silent catches (P2-4).
**Banners tab** — `AdminBannersPanel` (420): banner CRUD, image upload, AR/EN copy, colors, CTA link (product/category page), placement, width, sort order, active toggle. 4 catches; empty state present.

### `/admin/settings`
- 9 sections; unknown/legacy tabs are replaced via `router.replace`; `announcements` maps to `website`.
- Dirty guard only on tab switch (P1-2).
- Tab labels/description/aria/confirm strings hardcoded (P2-1).
- Each section uses `useSettingsForm` for load/save/reset/dirty (`AdminSettingsHero` and `AdminSettingsAnnouncements` are embedded sub-panels inside General and Website). Payment/Mail/Meta secrets are write-only; GETs expose `has*` booleans only.
- `AdminSettingsWebsite` shows the ticker section only for `settings.business` and the announcements section only for `banners.manage`; the tab is visible with either permission and renders only the sections the user can manage.

### `/admin/notifications`
- Type/read filters, pagination (15), mark-all-read, click-to-open + navigate.
- `server:false`; filter/page sync to query. 2 silent catches; rows keyboard-inaccessible (P2-2).

### `/admin/activity`
- Entity/action filters, pagination (15, client-only); clicking a row navigates to the related entity (booking, product, …).
- API scopes staff to their own entries unless `bookings.view_all`; page itself has no `requiredPermission` (P3-3). Rows keyboard-inaccessible (P2-2).

### `/admin/bookings/:id`
- Full detail: customer, service, staff, price/deposit, payment, status timeline, mail log.
- Actions: assign/reassign staff, complete, cancel (staff cancel), refund issue/handle; each gated by its own permission and opened via modal.
- Modal a11y gaps (P2-3); some hardcoded strings (`Provider`, `No active staff members found.`); dates `de-DE`.
- `useAsyncData` key is per booking (`admin-booking-${id}`) — correct.

### `/admin/products/new` and `/admin/products/:id/edit`
- New: header + `AdminProductForm` (3 steps: basics, media, SEO/pricing).
- Edit: loads product, hosts the same form, plus collapsible audit timeline (20/page, “load more”). History has no catch (P2-4). Header copy hardcoded EN/AR.

---

## 6. Metrics

| Metric | Value |
|---|---|
| Admin page files | 27 (`app/pages/admin/**/*.vue`), 2,419 lines |
| Admin components | 41 files, 12,536 lines |
| Admin API handlers | 115 files |
| Largest components | `ProductForm` 1,172 · `AdminRichEditor` 894 · `AdminBookingsPanel` 840 · `AdminCalendarPanel`/`AdminUsersPanel` 723 |
| Legacy redirect routes | 14 |
| Tabbed shells | 5 (`appointments`, `salon`, `catalog`, `finance`, `website`) + `settings` (9 sections) |
| Route-level permission gates | 10 of 13 primary pages (dashboard, activity, login excluded by design/omission) |
| API permission coverage | 113 / 115 (login + logout only) |
| Static i18n keys used in admin | 337 — 0 missing in `en`, 0 missing in `de` |
| `admin.*` keys | 119 per locale |
| Dead `locale === 'ar'` branches | 690 occurrences / 40 files |
| Dialogs | 19 `role="dialog"` (10 `aria-modal`) · 1 `alertdialog` · 0 focus traps |
| Polling timers | 5 (30 s ×4, 60 s ×1), none visibility-aware |
| Silent `catch` blocks | 6 (Inbox 4, Notifications 2) + 1 missing catch (product history) |

---

## 7. Recommended plan

### Before launch (P1)
1. **Harden working hours** — error state + `loaded` gate + disable Save on failure. (~1 h, 1 file)
2. **Settings leave-guard** — `onBeforeRouteLeave` + `beforeunload` while dirty. (~1–2 h, composable + settings page)

### Next (P2)
3. **Localization pass** — replace hardcoded EN/AR strings with `t()` in `settings.vue`, `index.vue`, `AdminPagination`, `AdminPageHeader`, `AdminSidebar`, `bookings/[id]`, `login.vue`; remove dead `ar` branches. (~1 day)
4. **Row accessibility** — notifications + activity rows become links/buttons or get keyboard handlers. (~1–2 h)
5. **Shared `AdminModal`** — focus trap/restore, Escape, aria wiring; migrate highest-risk modals first. (~1 day)
6. **Failure feedback** — replace the 6 silent catches and add catch to product history; add error states to Reminders and Inbox. (~3–4 h)
7. **Dashboard error state** — alert + `—` placeholders. (~1 h)
8. **Calendar detail key** — per-id key, remove double fetch, guard out-of-order responses. (~1 h)
9. **Visibility-aware polling** — pause hidden tabs, refresh on focus. (~2 h)

### Later (P3)
10. Central `formatDate/formatNumber` using the active locale.
11. Replace `fetch<any>` with shared types where payloads already have interfaces.
12. Split `ProductForm` and the two 723-line panels by section.
13. Decide whether `/admin/activity` needs a page-level permission; add if yes.
14. Add an “already signed in” redirect on the login page.

---

## 8. Review limitations

- Static review only; no runtime/browser verification was performed for this report (per project policy). Accessibility findings are based on markup and event-handler inspection, not an automated axe/Lighthouse run.
- API permission coverage is based on a source grep of `requirePermission`/`requireAuth`; handler-level logic (e.g., ownership scoping) was spot-checked, not exhaustively traced for all 115 endpoints.
- The 690 `ar` count includes all admin pages/components (not just the 27 pages) and includes both `locale === 'ar'` and `locale.value === 'ar'` forms.
