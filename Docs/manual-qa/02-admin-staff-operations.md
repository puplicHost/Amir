# AMIR Frisur & Kosmetik Studio — Admin & Staff Operations Walkthrough

**Document 2 of 3 · Practical operations guide · 25 October 2026**

This document explains how the internal side of AMIR works: who can sign in, what each page is for, which actions are safe, and where the system deliberately stops and asks a human to decide. It follows the actual admin navigation order. It is based on a read-only review of the current application; no action was performed against a live database.

Three role names appear throughout:

- **ADMIN** — full access, including settings, user management, expenses, and issuing refunds.
- **MANAGER** — runs the salon day to day: bookings, staff, services, catalogue, inbox, banners. Cannot manage users, cannot change payment/business settings, cannot issue refunds or manage expenses.
- **STAFF** — sees only their own appointments and notifications. Cannot see the full booking book, prices, customers, settings, or other staff.

A user's effective rights are the role defaults plus any extra permissions an admin grants on the user record. The server checks permissions on every sensitive action, not just the buttons in the browser.

---

## 1. Roles and permissions at a glance

| Capability | ADMIN | MANAGER | STAFF |
|---|---|---|---|
| Sign in to admin | Yes | Yes | Yes |
| Dashboard | Full | Catalog/service cards; no booking KPIs unless granted | Redirected to My Bookings |
| View all bookings | Yes | Yes | No |
| View own bookings | Yes | Yes | Yes |
| Assign / reassign staff | Yes | Yes | No |
| Complete a booking | Yes | Yes | Yes, own only |
| Unassign own booking ("cancel" in staff terms) | Yes | Yes | Yes, own only |
| Cancel a booking with refund | Yes | No | No |
| Mark a refund as handled | Yes | Yes | No |
| Manage services and working hours | Yes | Yes | No |
| Manage staff profiles and schedules | Yes | Yes | No |
| Manage users and permissions | Yes | No | No |
| Manage products and categories | Yes | Yes | No |
| View / manage expenses | Yes | No | No |
| Handle inbox and banners | Yes | Yes | No |
| Business, booking, mail, SEO settings | Yes | No | No |
| Payment and Meta settings | Yes | No | No |
| View notifications | Yes | Yes | Yes |
| View activity log | Yes, full | Yes, full operational log | Own entries only |

Two important consequences:

1. A MANAGER can **mark** a refund as handled but cannot **issue** one. Issuing a refund and cancelling with refund is an ADMIN action.
2. A STAFF user's "cancel" does not cancel the customer's appointment. It removes the staff member from it and returns the booking to the unassigned queue. The customer keeps the appointment and the deposit.

---

## 2. Signing in

**Page:** `/admin/login`

The login screen offers email and password, a light/dark toggle, a language toggle (English/German), and a link back to the public site. On success:

- ADMIN and MANAGER land on the dashboard.
- A STAFF user without company-wide booking visibility lands directly on **Appointments → My Bookings**.

Failure behaviour:

- Wrong email or password: a generic "invalid email or password" message. The form does not reveal whether the email exists.
- Too many attempts: after five attempts in a minute, a "too many attempts" message and a short wait.
- Deactivated account: treated as invalid credentials.

Sessions are server-side. Logging out clears the session; using the browser back button does not restore it. If an account is deactivated while signed in, the next admin page request is rejected and the user is returned to login. This check happens on client-side navigation as well as full page loads.

The admin area requests browser notification permission on the first visit when push is configured. Denying it only disables browser push; the in-app notification list continues to work.

---

## 3. The admin shell

Every admin page sits inside the same shell:

- A collapsible dark sidebar with the studio logo, the signed-in user, "View Store", and logout.
- Navigation items are hidden when the user lacks the related permission: Dashboard, Appointments, Salon Management, Catalog, Finance, Website & Communication, Settings.
- The **Website** item carries an unread-inbox badge.
- The header has a mobile menu button, a notification bell, an activity bell, a language toggle, and the user menu.
- The sidebar collapses to icons on desktop and becomes a drawer on mobile.

If a user types a URL for a page they cannot access, the route guard sends them to their landing page rather than showing the page. Some pages additionally show an explicit "no access" empty state if the user has only some of the tabs.

---

## 4. Dashboard

**Page:** `/admin`

The dashboard is an overview, not a control panel.

- **Catalogue cards** — total products, total categories, active services. Each card is only shown to a user with the matching permission and links to the relevant catalogue or salon tab.
- **Booking cards** — today's bookings, upcoming unassigned, pending refunds, and paid revenue (the sum of deposits on paid bookings). These are only sent to users with `bookings.view_all`. A MANAGER sees them; a STAFF user does not.
- **Quick actions** — create a product, open the calendar, manage services, open settings. Actions the user cannot perform are not shown.

Clicking a booking card carries the relevant filter into the destination list. For example, "upcoming unassigned" opens All Bookings filtered to UNASSIGNED; "pending refunds" opens Payments & Refunds for a user who can handle refunds.

STAFF users never see this page: the route guard redirects them to My Bookings.

---

## 5. Appointments

**Page:** `/admin/appointments`

Appointments is a tabbed workspace. Tabs are shown according to permission:

- **Calendar** — anyone who can view all or own bookings.
- **Reminders** — anyone who can view all or own bookings.
- **My Bookings** — users with `bookings.view_own`.
- **All Bookings** — users with `bookings.view_all`.

The active tab is kept in the URL (`?tab=calendar|reminders|my-bookings|bookings`), so a link can open the right view directly.

### 5.1 Calendar

The calendar is the operational day sheet. It offers **day**, **week**, and **month** views and a staff filter. Day view is organised by staff column, including an "Unassigned" column; week view is organised by day; month view shows booking counts per day.

In day view:

- Working hours form the vertical grid; closed or non-working time is not bookable.
- Existing bookings appear as blocks with customer, service, time, and status.
- Clicking a booking opens a side panel with the booking summary and the actions the user is allowed to take: assign/reassign, reschedule, complete, and — for permitted users — cancel/refund.
- Clicking an empty part of a staff column opens **manual booking** pre-filled with that date, time, and staff member. Week and month views do not create bookings on click.
- The **reassignment queue** lists paid but unassigned bookings, nearest first. Bookings starting within 24 hours are marked urgent.
- For an unassigned booking, the panel can open a pre-filled WhatsApp message to the customer using the salon's reassignment template. German local numbers beginning with `0` are converted to the international `49…` form for the WhatsApp link. Nothing is sent automatically; the staff member reviews and sends it in WhatsApp.

Month view is a planning aid, not a detailed editor. It shows how busy each day is; switch to day or week to act.

### 5.2 Reminders

The reminders tab lists appointments due within a chosen number of hours (default 3). Email reminders are queued and sent automatically by the system; the tab shows which customers have email reminders and which are due.

WhatsApp reminders are **manual by design**. For each row the staff member can open a `wa.me` link with a pre-filled message. The customer's opt-in flag is shown for reference. The system does not send WhatsApp messages on its own, and opening the link is not proof that the message was sent.

The list refreshes on a timer while open.

### 5.3 My Bookings

This is the STAFF workspace. It shows only bookings assigned to the signed-in user, split into upcoming and past.

Available actions:

- **Complete** a booking after its start time. The server also enforces that the booking is assigned and not cancelled.
- **Cancel / unassign** one or several of their own bookings. This returns the booking to the unassigned queue and notifies the admins. It does not cancel the customer's appointment, does not refund the deposit, and does not send a customer cancellation email.
- **I'm unavailable** — report an absence range. The system records the time off, returns all overlapping assigned bookings to the unassigned queue, and sends one grouped notice to admins who can assign. Again, the customer is not cancelled or refunded; the salon is expected to rebook or contact the customer.

A STAFF user cannot open another staff member's booking by guessing its URL: the detail endpoint returns "not found" rather than exposing it.

### 5.4 All Bookings

The full booking book, with:

- free-text search,
- status filter,
- date filter,
- staff filter,
- "needs refund" filter,
- pagination, and
- URL-persisted filters so a filtered view can be linked.

Row actions depend on permission:

- **Assign / reassign** — opens the staff picker.
- **Cancel** — for a staff-style cancellation: returns the booking to UNASSIGNED. This is available to users who can view all bookings. It is not a customer cancellation and does not refund.
- **Cancel + refund** — only for users with `bookings.refund_issue` (ADMIN). Opens the refund decision dialog.
- **Mark refund handled** — for users with `bookings.refund_handle` (ADMIN and MANAGER). This only clears the attention flag and records an optional note; it does not move money.
- **Batch selection** — select multiple assigned bookings and unassign them together. The same "queue only" rule applies.

The list is dense. On a narrow screen it is usable but requires horizontal scrolling; the day calendar is the better mobile tool.

---

## 6. Booking detail

**Page:** `/admin/bookings/<id>`

The detail page is the single-booking file. It shows:

- customer name, phone, email (if given), and note;
- service, date/time, duration, and staff member;
- booking number and source (online, phone, walk-in, WhatsApp, manual);
- payment status, provider, deposit, and provider reference;
- booking status and assignment history;
- refund state and "needs refund" flag;
- the customer mail log (confirmation, change, cancellation, refund, reminder), with status and failure reason where available.

Actions:

- **Assign / reassign.** The staff picker only offers active STAFF users who can perform the service. The server rejects assignment to someone on time off or already booked for an overlapping period. Off-schedule assignment is allowed — a manager may deliberately assign outside the staff member's normal hours. Only PAID bookings without a pending refund can be assigned.
- **Reschedule.** Moves the booking to another time and optionally another staff member. The same slot-grid, working-hours, time-off, and overlap rules apply. A booking that is completed, cancelled, or flagged for refund cannot be moved. Rescheduling sends a "booking changed" email when the customer has an email address.
- **Complete.** Allowed only from ASSIGNED and only after the appointment start time. A user without company-wide visibility can complete only their own booking.
- **Cancel with refund.** ADMIN only. The dialog offers:
  - **Full refund** — refund the full deposit through the original provider.
  - **No refund** — cancel without money movement.
  - **Custom amount** — refund a chosen part of the deposit.
  - **Outside** — cancel and record that the refund is being handled outside the system (for example cash or bank transfer).
- **Mark refund handled.** Clears the flag after a manual resolution and writes an audit entry. It is not a refund action.

Automatic refunds are only possible when the booking was paid through PayPal and the original capture reference is present. A manual/cash booking, or a booking missing its provider reference, must be refunded outside the system. If a provider refund fails, the booking stays flagged, the failure is recorded, and admins are notified.

---

## 7. Salon Management

**Page:** `/admin/salon`

Three tabs, each permission-gated: **Services**, **Team**, and **Working Hours**.

### 7.1 Services

The services tab groups treatments by section (for example women's, men's, other) and allows creating, editing, and deleting services.

A service carries:

- section, slug, name, description;
- price (the "from" price shown publicly) and duration;
- cover image;
- active/inactive state;
- sort order;
- a "duration needs review" flag.

When "duration needs review" is on, the public service card hides the duration while keeping the price and booking action. The booking page still uses the stored duration for scheduling. This flag is a content safeguard: use it when the real treatment time has not been confirmed.

Deleting a service that is referenced by bookings is not a way to erase history; the system protects booking records. Prefer deactivating a service that should no longer be sold.

### 7.2 Team → Users

The users tab lists admin accounts with name, email, job title, role, active state, last login, and permission grants.

- **Create user** — name, email, password, job title, role, optional salary, and extra permissions beyond the role defaults.
- **Edit** — role, permissions, title, salary, active state. Passwords can be reset here.
- **Deactivate** — blocks sign-in and invalidates the session on the next request.
- **Delete** — removes the account where allowed.

Guardrails enforced by the server:

- The last active non-super ADMIN cannot be demoted, deactivated, or deleted.
- A user cannot demote, deactivate, or delete themselves.
- The super admin cannot be modified or deleted by anyone.
- Salary is visible only to the super admin.
- Extra permissions are validated against the known permission catalogue.

Deactivating a staff member does not delete their device push tokens, but notification queries exclude inactive users, so they stop receiving push and in-app notices.

### 7.3 Team → Staff

The staff tab manages the people who can be booked. A staff record is linked to a user account and adds:

- public display name;
- profile photo;
- bookable on/off;
- sort order in the public staff picker;
- service eligibility — leave empty to mean "all services", or select the specific services the person performs;
- per-staff working-hour overrides by weekday;
- absences / time off;
- studio closures.

Only active, bookable STAFF users appear on the public booking page. If a staff member is not eligible for a service, they are not offered for it. Staff schedules and absences are considered by availability; the salon's own working hours remain the outer boundary.

### 7.4 Working Hours

Seven weekday rows with open time, close time, and a closed toggle. Hours are stored in the salon timezone (Europe/Berlin by default) and drive both public availability and the calendar grid.

Invalid ranges (close before open) are rejected. A day marked closed produces no slots. If no working hours row exists for a weekday, that day is treated as closed rather than as an error.

---

## 8. Catalog

**Page:** `/admin/catalog`

Two tabs: **Products** and **Categories**.

### 8.1 Products

The product list offers search, category filter, active/inactive filter, pagination, a keywords column toggle, and quick actions. Each row links to edit, preview, duplicate, or delete. Deletion is confirmed.

### 8.2 New / Edit Product

**Pages:** `/admin/products/new` and `/admin/products/[id]/edit`

The product editor is a five-step wizard with a persistent save button:

1. **Basic info** — name (both languages), category, slug, descriptions, search keywords (up to 20), active state.
2. **Pricing** — price in EUR.
3. **Attributes** — key/value pairs in both languages.
4. **Images & media** — image gallery, optional video, optional PDF documents.
5. **SEO & AI** — meta titles/descriptions, keywords, GEO/AI description.

Validation runs per step and again on save; the first invalid step is highlighted. Images must be JPG, PNG, or WebP and at most 5 MB each. A video upload is limited to 50 MB; PDFs to 10 MB. The first image is the cover. Images can be reordered; the chosen order is saved. Existing media can be removed; removals are applied on save.

The edit page also exposes a collapsible modification history for the product, newest first, 20 entries per page.

Products are **display-only** on the public site. There is no stock quantity, cart, checkout, order, or product payment in this system. The price and documents are informational.

### 8.3 Categories

Categories carry names and descriptions in both languages, slug, cover image or video, "featured on homepage" flag, and sort order. Sort order can be edited inline. Deleting a category that still contains products is blocked or requires the products to be moved first; the catalogue is not silently orphaned.

Inactive categories and products disappear from the public catalogue. Featured categories drive the homepage category strip; if none are featured, the strip is hidden.

---

## 9. Finance

**Page:** `/admin/finance`

Two tabs: **Expenses** and **Payments & Refunds**.

### 9.1 Expenses

Expense tracking for the accountant:

- filter by date range, category, and search;
- totals for the filtered set;
- create an expense with date, category, amount, vendor/description, and optional receipt upload;
- delete an expense;
- export the filtered list as CSV.

Permissions are separate: `expenses.view`, `expenses.manage`, `expenses.export`. MANAGER and STAFF do not have them by default. This page tracks spending only; it does not calculate revenue, profit, or payroll.

### 9.2 Payments & Refunds

This tab is for bookings that need financial attention:

- headline payment statistics for users who can view all bookings;
- a list of bookings flagged `needsRefund`;
- links into the booking detail to resolve them.

A user with `bookings.refund_handle` can mark a refund handled. Only `bookings.refund_issue` can actually cancel with refund. A failed provider refund keeps the booking in the list and notifies admins; retrying is a human decision.

---

## 10. Website & Communication

**Page:** `/admin/website`

Two tabs: **Inbox** and **Banners**.

### 10.1 Inbox

Messages from the public contact form. The list has All / Unread / Read views, pagination, open, mark read/unread, and delete. Opening a message marks it read. The sidebar badge shows the unread count and refreshes on navigation.

The inbox is a queue, not a mailbox: replies are sent by phone, WhatsApp, or the salon's own email client. The system does not send a reply from this screen.

### 10.2 Banners

Promotional banners with:

- placement (for example below the services section, homepage, or other defined slots);
- image upload and width variant;
- link target — a product, a category, or a static page;
- active state and ordering.

Only active banners in a valid placement appear publicly. Banner images are validated for type and size. A banner with a missing image or broken target is not shown as a broken block.

---

## 11. Settings

**Page:** `/admin/settings`

Nine tabs, filtered by permission. The tab is kept in the URL. Switching tabs with unsaved changes asks for confirmation before discarding them.

### 11.1 General & Brand

- Site names and taglines in both languages.
- Primary, dark, and accent colours.
- Logo and favicon upload with preview and removal.

The **Hero slideshow** is managed at the bottom of this tab: up to eight slides, each with an image, alt text, active state, and order; plus a rotation interval between 3 and 15 seconds (default 6). Non-image files are rejected client-side, and oversized images are refused. Fewer than two active slides means no rotation.

### 11.2 Contact & Social

Phone numbers, WhatsApp number, email, address in both languages, social links (Facebook, Instagram, TikTok, YouTube, LinkedIn, X), and a Google Maps embed URL. These feed the public contact page and footer. Missing values simply omit the element; the layout does not break.

### 11.3 SEO & AI Discovery

Meta title templates and descriptions in both languages, keywords, and a GEO/AI description used in structured data. These are site-wide defaults; individual products and categories can override them.

### 11.4 Store Config

Default currency (EUR) and products per page (16 by default). These affect the public catalogue's display and pagination.

### 11.5 Payment

PayPal switch and credentials:

- PayPal: enable, client ID, secret, webhook ID, sandbox/live mode.

Secrets are never returned to the browser in clear text; the form shows whether a secret is already stored and only sends a replacement when the field is filled. Enabling a gateway without its required credentials does not make it usable: the server treats the gateway as unavailable and the public booking page will not offer it. If both gateways are unavailable, online booking cannot be completed.

### 11.6 Booking

Salon-level booking rules:

- WhatsApp number, business name, business address.
- Slot step (15 minutes by default).
- Payment hold TTL (20 minutes for online holds).
- Deposit percentage (50% by default).
- Timezone (Europe/Berlin).
- Minimum lead time before a booking (120 minutes by default).
- Manual hold TTL (1,440 minutes by default).
- Reassignment WhatsApp templates in German and English.
- Cancellation window (24 hours by default).
- Reminder lead time (60 minutes by default) and the email-reminder switch.

Changing these affects new availability and new bookings; existing bookings keep their stored duration and price snapshots.

### 11.7 Mail

Mail provider (`log` for development, HTTP for a real provider), from address, from name, HTTP endpoint, and key. The key is masked. With the `log` provider, messages are written to the application log instead of being delivered — useful for testing, not for customers.

### 11.8 Meta Integration

Pixel ID, test event code, enable switch, and access token (masked). The browser pixel and server-side conversion events only run when the integration is enabled, a pixel is configured, and the visitor has granted marketing consent. Admin pages never load the pixel.

### 11.9 Website

- **Announcement ticker** — text in both languages, active switch, speed.
- **Announcement bar feed** — up to ten short items, each with text, type, optional link to a product/service/URL, order, active state; plus the bar's active switch and background colour. The bar auto-advances every five seconds; visitors who prefer reduced motion see a static, manually navigable version. The bar can be dismissed by the visitor.

---

## 12. Notifications

**Page:** `/admin/notifications`

The notification centre lists system notices: new bookings, assignments, reassignments, staff cancellations, refund attention, and similar operational events. It supports type and read/unread filters and pagination.

- Opening a notification or pressing "mark read" clears it.
- "Mark all read" clears the visible set.
- A notification can carry a deep link to the relevant booking or page; permission checks still apply at the destination.
- The header bell shows the unread state.
- When Firebase is configured, admins can receive browser push. Permission is requested on the first admin visit; denial or missing configuration silently disables push. Push is not a replacement for the in-app list.

Notifications are sanitised: they carry booking numbers, service names, and times rather than full customer contact details.

---

## 13. Activity

**Page:** `/admin/activity`

An audit trail of changes. It can be filtered by entity type and action and is paginated, newest first. Each row shows the entity, action, a detail string, the user, and the timestamp. Entity types currently covered are products, categories, services, staff, expenses, and expense categories.

Users without company-wide booking visibility see only their own audit entries.

**Known coverage gap:** booking changes are written to the audit log by several booking actions, but the Activity page's entity filter does not include bookings. Do not rely on this page as the complete booking history; use the booking detail's assignment history and mail log, and the notification feed, for booking operations.

---

## 14. Legacy routes

The following old addresses redirect to their current homes and preserve useful query parameters:

| Old route | New home |
|---|---|
| `/admin/bookings` | Appointments → All Bookings |
| `/admin/calendar` | Appointments → Calendar |
| `/admin/my-bookings` | Appointments → My Bookings |
| `/admin/reminders` | Appointments → Reminders |
| `/admin/team` | Salon Management → Team |
| `/admin/staff` | Salon Management → Team → Staff |
| `/admin/users` | Salon Management → Team → Users |
| `/admin/services` | Salon Management → Services |
| `/admin/schedule` | Salon Management → Working Hours |
| `/admin/catalog` (already current) | Catalog |
| `/admin/products` | Catalog → Products |
| `/admin/categories` | Catalog → Categories |
| `/admin/expenses` | Finance → Expenses |
| `/admin/inbox` | Website → Inbox |
| `/admin/banners` | Website → Banners (announcement/ticker tabs go to Settings → Website) |

Bookmark the new routes. Old links keep working, but the redirects are client-side and add a small delay.

---

## 15. The staff panel in detail

A STAFF user's world is deliberately small:

1. Sign in → My Bookings.
2. See upcoming and past appointments assigned to them.
3. Open an appointment to see the customer name, phone, service, time, and note.
4. Complete it after the start time.
5. If they cannot work a shift, use **I'm unavailable** for the date range, or unassign individual bookings.

What STAFF cannot do:

- See other staff members' bookings or the full booking book.
- See revenue, deposits, refunds, customer lists, or prices beyond the service information needed for the appointment.
- Assign or reschedule.
- Cancel a customer's appointment or issue a refund.
- Change services, hours, users, catalogue, settings, or banners.
- Access the Activity page beyond their own entries.

When a staff member unassigns a booking or reports an absence, the salon receives a notification. The customer is **not** automatically told. A human must contact the customer and either reassign or cancel with the appropriate refund decision. This is the most important operational rule in the staff panel.

---

## 16. Operational edge cases

### 16.1 No staff are configured

Public booking shows no staff and no slots. The admin can still create services and hours, but no online booking can complete. The fix is operational: create or activate a staff profile, mark it bookable, and give it service eligibility.

### 16.2 A service's duration is under review

The public card hides the duration. The service remains bookable using the stored duration. Use this when the real treatment time is not yet confirmed; update the duration and clear the flag when it is.

### 16.3 A day is full or closed

The public grid shows taken times or an empty message. The calendar shows the day's real load. Neither is an error state; do not "fix" it by widening hours unless the salon is genuinely open.

### 16.4 Both payment gateways are off (or misconfigured)

Online booking cannot complete. A booking attempt is refused rather than left pending. Existing unpaid holds still expire and release their slots. Enable a gateway with complete credentials to restore online booking.

### 16.5 Two customers reach the last slot together

The server serialises bookings per salon and day. One succeeds; the other gets a "slot just taken" response and is invited to choose another time. Do not manually create a second booking for the same slot and staff member: assignment also checks overlaps.

### 16.6 A payment fails or is abandoned

The customer can retry the same booking from the failure page. A retry creates a new provider attempt, not a new booking. If the customer pays twice through two attempts, the second confirmation is ignored by the idempotent payment handling; investigate any provider-side duplicate charge through the provider dashboard and the refund flow.

### 16.7 A payment arrives after the hold expires

The system does not confirm the slot. It flags the booking `needsRefund` and notifies admins. Resolve it in Finance → Payments & Refunds or the booking detail: refund fully, refund a custom amount, or mark it handled if the money was returned outside the system. Do not assign or reschedule a flagged booking.

### 16.8 Admin cancels with refund

Choose the refund mode deliberately:

- **Full** — the deposit goes back to the original method.
- **None** — the salon keeps the deposit; record the reason.
- **Custom** — partial refund.
- **Outside** — money is returned by cash/bank transfer and the system only records the decision.

If the provider call fails, the booking stays flagged and admins are notified. Retry from the booking detail or resolve outside the system.

### 16.9 Staff cancel or absence

Returns bookings to the queue; does not cancel or refund. Reassign if possible. If the appointment cannot be covered, an ADMIN must cancel with the correct refund decision and the customer must be contacted.

### 16.10 Deactivating a user

The session dies on the next request. If the user was the last active non-super ADMIN, the action is refused. The super admin is protected. Deactivating a staff member also removes them from public availability; their existing assigned bookings remain assigned until a human unassigns or reassigns them.

### 16.11 Salary and sensitive data

Salary is visible only to the super admin. Secrets (PayPal keys, webhook ID, Meta token, mail key) are masked in the interface and never returned in clear text. Do not paste secrets into notes, banners, product descriptions, or support messages.

---

## 17. A practical daily routine

**Morning**

1. Open the dashboard: check today's bookings, unassigned queue, and pending refunds.
2. Open Appointments → Calendar in day view. Confirm every booking has a staff member.
3. Check reminders for the next few hours; send WhatsApp reminders manually where the customer opted in.
4. Check the inbox for overnight contact messages.

**During the day**

1. Complete appointments as they finish.
2. Reassign rather than cancel whenever possible.
3. If a staff member reports an absence, clear the queue and contact affected customers.
4. Watch for refund-attention notifications and resolve them the same day.

**End of day**

1. Confirm no paid booking for today is still unassigned.
2. Check that completed bookings are marked complete.
3. Review the notification list for anything unresolved.

**Weekly**

1. Review upcoming week in calendar; balance staff load.
2. Check staff schedules, absences, and studio closures.
3. Reconcile refunds and expenses; export the expense CSV for the accountant if needed.
4. Review services and products for stale prices, missing images, or inactive items that should return.
5. Review user accounts and permissions; remove access for people who have left.

---

## 18. Current limitations to plan around

- **No customer accounts.** Customers use private links; the salon cannot offer a login/history area.
- **No customer rescheduling.** Customers can view and cancel only. Rescheduling is an admin action.
- **No product sales online.** Catalogue is display-only; there is no cart, order, stock, or product payment.
- **No automatic WhatsApp.** Reminders and reassignment messages are prepared as links and sent manually.
- **No automatic customer notification on staff unassign/absence.** A human must contact the customer.
- **Legal pages are placeholders.** Terms, privacy, imprint, and cancellation policy still need real content.
- **Activity coverage is partial.** The filter covers catalogue/staff/expense entities, not bookings.
- **Some admin copy is not fully localised.** Parts of the interface contain hardcoded English or Arabic-source strings even when the UI language is German or English. This is cosmetic, not a permission or data issue.
- **Dense tables on phones.** The admin area works at 360 px, but the calendar is the practical mobile surface; wide tables scroll horizontally.

---

## 19. Who to call for what

- **Customer cannot book online** → check staff availability, working hours, slot conflicts, and whether at least one gateway is enabled with complete credentials.
- **Customer paid but has no confirmation** → check the booking's payment status and provider reference; use the success page's status, not the customer's screenshot, as the source of truth.
- **Refund needed** → ADMIN decides the mode; MANAGER can only mark handled. Resolve `needsRefund` items promptly.
- **Staff cannot see a booking** → confirm it is assigned to them and that their account is active.
- **Manager cannot open Settings/Users/Finance** → expected by role. Grant extra permissions on the user record only when the responsibility is real.
- **Suspicious login or permission change** → deactivate the account, review the Activity log and last-login column, then reset the password.
