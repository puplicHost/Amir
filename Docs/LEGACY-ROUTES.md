# Legacy Admin Redirects (AUDIT P3-04)

These routes remain as thin, `replace: true` redirects so old bookmarks and
external links keep working. They render no UI and hold no logic.

| Legacy route | Target | Since |
|---|---|---|
| `/admin/banners` | `/admin/website?tab=banners` (default); `/admin/settings?tab=website` when the old `tab` was `announcements` or `ticker` | 2026-10 |
| `/admin/bookings` | `/admin/appointments?tab=bookings` | 2026-10 |
| `/admin/calendar` | `/admin/appointments?tab=calendar` | 2026-10 |
| `/admin/categories` | `/admin/catalog?tab=categories` | 2026-10 |
| `/admin/expenses` | `/admin/finance?tab=expenses` | 2026-10 |
| `/admin/inbox` | `/admin/appointments?tab=inbox` | 2026-10 |
| `/admin/my-bookings` | `/admin/appointments?tab=my-bookings` | 2026-10 |
| `/admin/products` | `/admin/catalog?tab=products` | 2026-10 |
| `/admin/reminders` | `/admin/appointments?tab=reminders` | 2026-10 |
| `/admin/schedule` | `/admin/salon?tab=schedule` | 2026-10 |
| `/admin/services` | `/admin/catalog?tab=services` | 2026-10 |
| `/admin/staff` | `/admin/salon?tab=team` | 2026-10 |
| `/admin/team` | `/admin/salon?tab=team` | 2026-10 |
| `/admin/users` | `/admin/salon?tab=team&teamTab=users` | 2026-10 |

## Policy

- **Deprecation date:** 2027-04-30. After this date the files may be deleted in
  a normal release; no further notice is required.
- **Before deletion:** check the reverse-proxy/CDN access logs for 90 days and
  confirm no external referrer still hits a legacy path. Any remaining hit must
  be redirected at the proxy instead of the app.
- **Do not add new legacy redirects.** New navigation must link directly to the
  consolidated pages.

The canonical admin navigation is defined in `app/components/admin/AdminSidebar.vue`.
