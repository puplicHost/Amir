# Admin Panel UX Refactor — Amir

Report for the admin-panel information-architecture cleanup and UI/UX
consolidation of `/admin`. Companion to `ADMIN-UX-AUDIT.md` and
`ADMIN-PANEL-MAP.md` (see "Stale documentation" below — both predate the
current panel and contain old-project references).

Status: **implemented and verified** (build + browser checks passed).

---

## 1. Method

1. Enumerated every admin page (`app/pages/admin/**`), admin component
   (`app/components/admin/**`), layout (`app/layouts/admin.vue`), composable and
   `server/api/admin/**` endpoint.
2. Classified each page: KEEP / MERGE / REMOVE / INVESTIGATE.
3. Confirmed access model: `server/middleware` gate via
   `definePageMeta({ requiredPermission })` (OR semantics for arrays) +
   `useAdminCan(permission)` for button/sidebar visibility + server-side API
   enforcement. RBAC, booking, payment and refund rules are unchanged.
4. Verified reachability of every page (public nav, header bells, sidebar,
   in-app links) before touching anything.

---

## 2. Information architecture — before / after

Sidebar was a single flat list of 15 items. It is now grouped into labelled
sections (labels are hidden and replaced by a thin separator when the sidebar is
collapsed). Every item keeps its exact permission gate.

| Group | Items (route → permission) |
| --- | --- |
| **Overview** | Dashboard `/admin` |
| **Bookings** | My Bookings `/admin/my-bookings` (`bookings.view_own`) · Bookings `/admin/bookings` (`bookings.view_all`) · Calendar `/admin/calendar` (`bookings.view_all`/`view_own`) · Reminders `/admin/reminders` (same) |
| **Catalog** | Services `/admin/services` (`services.manage`) · Products `/admin/products` (`products.view`/`products.manage`) · Categories `/admin/categories` (`categories.manage`) |
| **Team & Schedule** | Team `/admin/team` (`users.manage` OR `schedule.manage`) · Opening Hours `/admin/schedule` (`schedule.manage`) |
| **Website** | Inbox `/admin/inbox` (`inbox.manage`, unread badge) · Banners `/admin/banners` (`banners.manage`) |
| **Finance** | Expenses `/admin/expenses` (`expenses.view`) |
| **System** | Settings `/admin/settings` (`settings.business`/`payment`/`meta`/`banners.manage`) |

`Activity` `/admin/activity` and `Notifications` `/admin/notifications` remain
off-sidebar, reached from the header bells (`AdminActivityBell`,
`AdminNotificationBell`) — unchanged behaviour.

---

## 3. Merge — Users + Staff → `/admin/team`

`/admin/users` (`users.manage`) and `/admin/staff` (`schedule.manage`) were two
sidebar entries with the same "Users" icon pointing at two separate pages. They
are now a single **Team** page with tabs.

- **URL-addressable:** `/admin/team?tab=users` and `/admin/team?tab=staff`. The
  tab survives reload and is bookmarkable; the query is kept authoritative (an
  unknown or unauthorized `?tab=` is replaced with the first tab the user may
  access).
- **Permission-scoped:** the Users tab renders only with `users.manage`, the
  Staff tab only with `schedule.manage`. The tab bar is hidden when the user can
  access just one section (that section renders directly).
- **No unauthorized data loading:** panels are conditionally rendered
  (`v-if`), so the inactive section's `useAsyncData`/`fetch` never runs. A user
  with neither permission sees an "no access" state and no data request is
  made. Server-side API authorization (`users.manage` / `schedule.manage`) is
  unchanged — the UI is not the security boundary.
- **Redirects:** `/admin/users` → `/admin/team?tab=users` and `/admin/staff` →
  `/admin/team?tab=staff` (client-side `navigateTo`, `replace: true`), so old
  bookmarks keep working. Deep links were updated everywhere they are produced:
  - `AdminSidebar` → single **Team** item.
  - user-created / user-updated notifications
    (`server/api/admin/users/index.post.ts`, `server/api/admin/users/[id].put.ts`).
  - repeated-failed-login security alert (`server/utils/login-attempts.ts`).
  - activity feed routing (`AdminActivityBell.vue`, `activity.vue`).

The page is split into reusable panels to avoid one giant file:
`AdminUsersPanel.vue` and `AdminStaffPanel.vue`, rendered by
`app/pages/admin/team.vue`.

### Bug fixed while extracting
`app/pages/admin/users.vue` referenced `currentUser?.userId` in its template but
never defined `currentUser`, so the self-protection guards never fired: a Super
Admin could select their own role / deactivate their own account in the form
(the server rejects it, but the UI gave no feedback). The panel now defines
`currentUser` from the admin session, restoring the disabled controls and inline
warning.

---

## 4. Old-project remnants — investigated

| Candidate | Verdict | Evidence |
| --- | --- | --- |
| Products / Categories | **KEEP — live feature, not a remnant** | Public `AppNavbar.vue` and `AppFooter.vue` link to `/products` and `/products/:slug`; homepage renders `AppHomeBanners`/`ProductGrid`; public pages `app/pages/products/index.vue`, `[slug].vue`, `p/[slug].vue` exist. |
| Job-title option `Warehouse` | Replaced with `Stylist` | Option list only; no DB row used it. Aligns the picker with a salon. |
| `ADMIN-UX-AUDIT.md` | **STALE (old electronics-store project)** | References non-existent pages `/admin/inventory`, `/admin/orders`, `/admin/financials`, `/admin/services?tab=requests`, `/admin/services/requests/:id`, and role presets "Sales Manager"/"Warehouse Staff"/electronics variant copy. |
| `ADMIN-PANEL-MAP.md` | **Partially stale** | Omits /admin/schedule, /admin/staff, /admin/team, /admin/expenses, /admin/activity, /admin/notifications, /admin/my-bookings, /admin/calendar and the booking-ops section. |
| `admin.orders` i18n key | Unused leftover | Kept (harmless); no page consumes it. |
| `admin.finVsPrev` / `fin*` i18n keys | Unused leftovers | Kept (harmless). |

Stale docs are annotated rather than deleted, to preserve the audit trail. No
product/category data or DB schema touched.

---

## 5. UI/UX changes

- Grouped, scannable sidebar navigation (section labels / collapsed separator).
- Consistent tab pattern for the Team page (role=tablist/tab/tabpanel, keyboard
  focusable, `aria-selected`, `aria-controls`).
- Loading and empty states standardised with the existing `AdminEmptyState`
  (`AdminStaffPanel` previously rendered a bare text line; now shows the shared
  empty state with an icon and guidance pointing at the Users tab).
- Reused existing components/design tokens: `AdminPageHeader`, `AdminEmptyState`,
  `AdminStatusBadge`, `AdminConfirmDialog`, `useAdminToast`, `useAdminConfirm`.
- No new dependency, no design-system change, no Tailwind config change.

---

## 6. Files changed

Added:
- `app/pages/admin/team.vue`
- `app/components/admin/AdminUsersPanel.vue`
- `app/components/admin/AdminStaffPanel.vue`
- `ADMIN_UX_REFACTOR_REPORT.md` (this file)

Modified:
- `app/pages/admin/users.vue` → redirect page
- `app/pages/admin/staff.vue` → redirect page
- `app/components/admin/AdminSidebar.vue` → grouped nav + single Team item
- `app/components/admin/AdminActivityBell.vue` → entity→route/icon/label mapping
- `app/pages/admin/activity.vue` → entity filter + entity→route/icon/label mapping
- `server/api/admin/activity.get.ts` → entity-type whitelist (staff, expense,
  expense-category)
- `server/api/admin/users/index.post.ts`, `server/api/admin/users/[id].put.ts`,
  `server/utils/login-attempts.ts` → notification deep links
- `i18n/locales/en.json`, `i18n/locales/de.json` → `admin.team*`,
  `admin.tab*`, `admin.workingHours`, `admin.group*` keys
- `ADMIN-UX-AUDIT.md` → stale banner (annotation only); `ADMIN-PANEL-MAP.md` →
  stale banner
- `REMEDIATION_PROGRESS.md` → progress entry

---

## 7. Verification

**`npm run build` — PASS** (Nuxt 4 production build completed; only the
pre-existing `[PLUGIN_TIMINGS]` / external `postcss.config.js` warnings).

**Browser verification — 33/33 checks PASS** (local dev server on a free port,
Python Playwright + Chromium, dev database). Covered:

- Sidebar renders all seven groups (Overview, Bookings, Catalog,
  Team & Schedule, Website, Finance, System).
- Exactly one **Team** link; no `/admin/users` or `/admin/staff` sidebar entry.
- `/admin/users` → `/admin/team?tab=users`; `/admin/staff` →
  `/admin/team?tab=staff`; `/admin/team` → `?tab=users`.
- Tab switch updates the URL and `aria-selected`; full reload preserves the tab.
- Unknown `?tab=bogus` clamps to the first allowed tab.
- A user with only `schedule.manage`: sees the Staff panel, **no** Users tab,
  and **zero** requests to `/api/admin/users` — including when manually
  navigating to `?tab=users`.
- A user with no relevant permission: sees the no-access state and makes
  **zero** requests to `/api/admin/users` or `/api/admin/staff`.
- Temporary fixture accounts created for the RBAC checks were deleted
  (2/2) and the temporary dev server was stopped.

Environmental notes: i18n JSON validated for both locales; the pre-existing
dev server on the default port was left untouched.

## 8. Remaining recommendations (not implemented)

- Consider moving per-staff schedule/absences and the global **Opening Hours**
  page closer together (currently Team tab + separate `/admin/schedule`).
- Retire the stale `ADMIN-UX-AUDIT.md` / `ADMIN-PANEL-MAP.md` once this report
  is accepted, and fold the correct page map into `CONTEXT.md` or similar.
- Extract the repeated modal shell (backdrop, Escape, focus handling) into a
  shared `AdminModal` component — see Phase 2 notes.

---

# Phase 2 — Page-by-page consistency pass

Scope: Dashboard, Bookings list + detail, Calendar, Services, Products,
Categories, Expenses, Settings, Reminders, My Bookings, Banners (shared with
Settings), plus the two panels extracted in Phase 1.

## 9. Issues discovered during the review

| # | Area | Finding |
|---|------|---------|
| 1 | Dashboard | Quick action "Platform Settings" was dead code: it checked `settings.view`, a permission key that does not exist (real keys are `settings.business`, `settings.payment`, `settings.meta`). |
| 2 | Dashboard | Catalog KPI cards were shown to every admin regardless of whether the linked page is permitted. |
| 3 | Dashboard | No Team shortcut (explicit Phase-1 follow-up). |
| 4 | Settings | Tabs were not permission-scoped: a `settings.business`-only user could click Payment/Meta and trigger 403 requests; a `banners.manage`-only user could enter Settings and land on a forbidden General tab. |
| 5 | Settings | The "Announcements & Banners" tab rendered `AdminSettingsAnnouncements`, which requires `banners.manage` and is **already rendered in full** on `/admin/banners` (which also adds banner CRUD + ticker). Two entry points, one of them partial. |
| 6 | Banners | `?tab=` was not validated and was out of sync with the URL on reload/deep links. |
| 7 | Expenses | Row delete executed immediately with no confirmation. |
| 8 | Expenses | Category filter was labelled with `staffAdmin.services` ("Services"); the header description used `expenses.description` ("Description"); the modal cancel button used `calendar.close` ("Close"). |
| 9 | Expenses | Search debounce timer was untyped `any` and never cleared on unmount. |
| 10 | Expenses / Reminders / Calendar / Bookings / My Bookings / Banners | Inline "no data" markup instead of the shared `AdminEmptyState`. |
| 11 | Reminders / Calendar / My Bookings | `onUnmounted` was registered inside `onMounted` (nested lifecycle hook) for polling timers. |
| 12 | Bookings list / detail | No `requiredPermission` in page meta, unlike Calendar/Reminders — unauthorized users reached the page before the API returned 403. |
| 13 | Staff panel / General settings | Destructive actions (remove absence, remove closure day, delete logo) ran without confirmation. |
| 14 | Tabs (general) | Four separate tab-bar implementations (Team, Settings, Banners, My Bookings) with inconsistent ARIA and no keyboard navigation. |
| 15 | Docs | Several docs still cite the obsolete `settings.view` / `settings.manage` permission model, and the static `settings` role group. |
| 16 | Expenses / Calendar | Date defaults used `toISOString().slice(0, 10)` (UTC). In Europe/Berlin between 00:00 and 02:00 the "today"/"to" date was yesterday, so today's expenses and calendar day were filtered out. |
| 17 | Sidebar | The inbox unread-count request ran for every admin, including users without `inbox.manage`, producing a 403 in the console on each page and an unnecessary denied request. |

## 10. Fixes applied

### Shared primitives
- **`app/components/admin/AdminTabs.vue`** (new): one presentational tab bar with
  `role="tablist"`, `aria-selected`, `aria-controls`, roving `tabindex`, and
  RTL-aware Left/Right/Home/End keyboard navigation. Optional icon and badge.
  Adopted by Settings, Banners, Team and My Bookings.
- **`useAdminCan`** now accepts `string | string[]` with OR semantics, matching
  `definePageMeta({ requiredPermission })`. Existing single-permission callers
  are unchanged.

### Dashboard
- Replaced the dead `settings.view` check with OR of the three real settings
  permissions — the Settings quick action now appears.
- Gated the catalog KPI cards on `products.view`, `categories.manage`,
  `services.manage`.
- Added a **Manage Team** quick action for `users.manage` or `schedule.manage`
  holders.

### Settings
- Tabs are derived from the permission each panel's own API requires; the two
  tab lists and URL clamping are computed from the allowed set.
- Removed the duplicated **Announcements & Banners** tab. Old
  `/admin/settings?tab=announcements` deep links redirect to
  `/admin/banners?tab=announcements` (same component, plus banner/ticker
  controls). Users without `banners.manage` are clamped to their first allowed
  settings tab instead.
- `requiredPermission` on the page now matches the three settings permissions
  (dropped `banners.manage`); the sidebar **Settings** entry is no longer shown
  to banners-only users (they keep **Banners** under Website).
- Panels now carry `id` + `role="tabpanel"` + `aria-labelledby`.

### Banners
- URL is authoritative: invalid `?tab=` clamps to `banners`, deep links and
  reloads restore the selected tab, and the tab bar uses `AdminTabs` (with the
  banner count badge). Tab changes use `router.replace` (no per-tab history
  entries), consistent with Settings, Team and My Bookings.
- Banners list empty state uses `AdminEmptyState`.

### Expenses
- Deleting a row now opens the branded confirm dialog (amount + category).
- Empty state, page description, category filter label and cancel label fixed;
  debounce timer typed and cleared on unmount.

### Reminders, Calendar, Bookings, My Bookings
- Polling timers hoisted to top-level `onMounted` / `onUnmounted`.
- Empty states replaced with `AdminEmptyState` (with localized hints).
- Bookings list and booking detail gained the same `requiredPermission`
  guard as Calendar/Reminders.
- My Bookings tabs are URL-addressable (`?tab=upcoming|past`) and use
  `AdminTabs`.

### Confirmations
- Added branded confirmations before removing a staff absence, removing a
  studio closure day, and deleting the site logo.

### Dates and polling
- Added `todayBerlinISO()` to `app/utils/format.ts` and used it for the
  Expenses `to` filter, the new-expense default day, and the Calendar initial
  day, so "today" follows the salon timezone (Europe/Berlin).
- The sidebar only fetches/refreshes the inbox unread count when the user has
  `inbox.manage`; no more 403 console noise or denied polls for other roles.

### i18n
- Added matching `en`/`de` keys: `expenses.pageDescription`, `expenses.noneHint`,
  `expenses.deleteTitle`, `expenses.deleteMessage`, `expenses.delete`,
  `expenses.deleted`, `expenses.deleteFailed`, `expenses.cancel`,
  `reminders.noneHint`, `adminBookings.noBookingsHint`,
  `staffBookings.noUpcomingHint`, `staffBookings.noPastHint`.
- JSON key parity checked: 604 keys in each locale, no one-sided keys.

## 11. Files changed in Phase 2

Added:
- `app/components/admin/AdminTabs.vue`

Modified:
- `app/composables/useAdminSession.ts`
- `app/utils/format.ts` (`todayBerlinISO`)
- `app/components/admin/AdminSidebar.vue`
- `app/components/admin/AdminSettingsGeneral.vue`
- `app/components/admin/AdminStaffPanel.vue`
- `app/pages/admin/index.vue`
- `app/pages/admin/settings.vue`
- `app/pages/admin/banners.vue`
- `app/pages/admin/expenses.vue`
- `app/pages/admin/reminders.vue`
- `app/pages/admin/calendar.vue`
- `app/pages/admin/bookings/index.vue`
- `app/pages/admin/bookings/[id].vue`
- `app/pages/admin/my-bookings.vue`
- `app/pages/admin/team.vue` (tab markup → `AdminTabs`)
- `i18n/locales/en.json`, `i18n/locales/de.json`
- `ADMIN_UX_REFACTOR_REPORT.md`, `REMEDIATION_PROGRESS.md` (this section)

## 12. Verification for Phase 2

- **`npm run build` — PASS (exit 0)** on the final Phase 2 code, including
  `todayBerlinISO()` and the sidebar `inbox.manage` guard. Only warnings:
  two pre-existing `[PLUGIN_TIMINGS]` notices (plugin hooks take 97–98% of the
  build); no errors.
- **Browser/Playwright verification — PASS, 45/45 checks** on a temporary dev
  server (`:3012`), using `admin@amir.com` plus two disposable RBAC users
  (payment-only, banners-only) created through the admin API and deleted
  afterwards. Temporary expense + category fixtures were deleted; the server
  was stopped. Coverage:
  - sidebar/dashboard: Settings + Banners entries, Team shortcut, Settings
    quick action, catalog KPI links, no dead permission;
  - Settings: 8 permission-scoped tabs, announcements tab gone, `?tab=payment`
    survives reload, unknown tab clamps to General, legacy announcements deep
    link redirects to Banners, ArrowRight/End keyboard navigation;
  - Banners: default/ticker tabs, `?tab=announcements` deep link and reload,
    unknown tab clamps;
  - My Bookings: `?tab=past`, reload, unknown tab clamps;
  - Bookings list and Calendar render;
  - Expenses: delete asks for confirmation, cancel keeps the row, confirm
    removes it;
  - RBAC: payment-only sees one Settings tab, never requests booking settings,
    cannot open Products; banners-only sees Banners but not Settings and is
    redirected away from Settings; no 403 responses and no unexpected console
    errors.
- Static checks performed: both locale files parse and have identical key sets;
  `git diff --check` clean; no remaining code references to `settings.view`.

## 13. Not changed (deliberate)

- The inline "no active staff members" hints inside the assign/reassign modals
  stay compact instead of using the full `AdminEmptyState`.
- The modal shell (backdrop + `@keydown.escape` + panel markup) is still
  duplicated across pages. Migrating it to a shared `AdminModal` is a sensible
  next refactor but touches every form, so it is left out of this pass.
- Hardcoded Arabic strings in admin pages remain (the repo ships only `en` and
  `de` locale files; admin pages already use inline `locale === 'ar'` checks).
- Documentation files that cite `settings.view`/`settings.manage`
  (`Docs/CODE-REVIEW-REPORT.md`, `PROJECT-STATUS-REPORT.md`,
  `ADMIN-PANEL-MAP.md`, `Docs/02-sitemap.md`, `Docs/phase-*.md`) are stale but
  were not rewritten in this pass.
