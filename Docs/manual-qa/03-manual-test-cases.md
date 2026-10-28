# AMIR Frisur & Kosmetik Studio — Manual Test Cases

**Document 3 of 3 · Public and admin QA runbook · 25 October 2026**

Read-only planning document. No test below was executed while preparing this runbook; every case starts as **NOT TESTED**. Cases describing features that do not exist are marked **NOT BUILT** and ask the tester to confirm that the absence is handled gracefully.

## How to use this runbook

- Run cases in order within each area. Areas are independent unless a case names a precondition.
- Record the actual result and evidence (screenshot, booking number, request id) next to each line when executing.
- `Status: NOT TESTED` means "not executed". Change it to `PASS`, `FAIL`, or `BLOCKED` only in the execution copy, not in this source document.
- Use a sandbox payment account and test data only. Never use a real customer's card, phone, or email.
- Reset test data between destructive scenarios (cancel/refund, staff absence, deactivation) so later cases are not contaminated.

## Roles used

- **GUEST** — not signed in.
- **CUSTOMER** — a member of the public with a booking or private link.
- **ADMIN** — full internal role.
- **MANAGER** — operational internal role without users, settings, expenses, or refund issuing.
- **STAFF** — internal role limited to own appointments and notifications.
- **SYSTEM** — a server-side or provider-side action performed with tools, not through the browser UI.

## Suggested preconditions

1. At least two active STAFF users, both bookable, with service eligibility and working hours.
2. At least one service with `needsDurationReview = true` and one with it false.
3. Working hours configured for most weekdays, one closed day, and one weekday deliberately left without a row.
4. Stripe and PayPal sandbox configured and enabled; a second environment or configuration snapshot with both disabled.
5. One ADMIN, one MANAGER, one STAFF, one deactivated user, and one super admin.
6. Meta pixel configured in test mode, with marketing consent initially absent.
7. At least one active product with images, attributes, a PDF, and a video; one inactive product.
8. At least one active banner, one announcement feed with three items, and an active ticker.
9. Mail provider set to `log` unless a case explicitly needs delivery.
10. Salon timezone Europe/Berlin; deposit 50%; hold 20 minutes; cancellation window 24 hours; lead time 120 minutes; slot step 15 minutes.

---

## PUBLIC-HOME

[ ] TC-001 | PUBLIC-HOME | GUEST | Open `/` on a desktop browser with a clean profile | Hero, headline, primary booking CTA, main navigation, service sections, product blocks, and footer render; no console errors; no broken image placeholders | Status: NOT TESTED
[ ] TC-002 | PUBLIC-HOME | GUEST | Configure three active hero slides with a 6-second interval, open `/`, and observe one full rotation; then use the previous/next controls | Slides advance automatically at the configured pace; manual controls change the slide immediately; the active indicator stays in sync; no layout shift | Status: NOT TESTED
[ ] TC-003 | PUBLIC-HOME | GUEST | Activate the announcement bar with three items; observe it for 15 seconds; press dismiss; scroll the page | Items advance about every five seconds; dismiss hides the bar; the hero and sticky header offsets adjust without overlap or a gap | Status: NOT TESTED
[ ] TC-004 | PUBLIC-HOME | GUEST | Activate the ticker and open `/`; observe the scrolling text, dismiss it, then reload | Ticker scrolls smoothly, has a working dismiss control, never covers the header or hero copy, and stays hidden after dismissal for the session | Status: NOT TESTED
[ ] TC-005 | PUBLIC-HOME | GUEST | With only two of the configured service sections containing active services, open `/` and click a section card | Only the populated sections appear; each card links to `/services#<section>`; empty sections are not rendered as blank headings | Status: NOT TESTED
[ ] TC-006 | PUBLIC-HOME | GUEST | With no featured categories and no featured products, open `/` and scroll through all sections | Product and category blocks are omitted entirely; no empty grid, orphan heading, or console error appears; the rest of the page remains intact | Status: NOT TESTED

## PUBLIC-SERVICES

[ ] TC-007 | PUBLIC-SERVICES | GUEST | Open `/services` with active and inactive services seeded | Only active services appear, grouped by section; each card shows name, from-price in EUR, and duration; inactive services are absent | Status: NOT TESTED
[ ] TC-008 | PUBLIC-SERVICES | GUEST | Compare a service with `needsDurationReview = true` against one with `false` on `/services` | The flagged card hides the duration and still shows price and booking action; the unflagged card shows the duration in minutes | Status: NOT TESTED
[ ] TC-009 | PUBLIC-SERVICES | GUEST | Use the section navigation to jump to each group; scroll slowly through the page | Anchors land below the sticky header, the active section highlight follows the scroll position, and the URL hash updates or remains shareable | Status: NOT TESTED
[ ] TC-010 | PUBLIC-SERVICES | GUEST | Deactivate all services and open `/services` | A clear empty state replaces the grid; no broken card, blank page, or misleading booking CTA is shown | Status: NOT TESTED
[ ] TC-011 | PUBLIC-SERVICES | GUEST | Click a service card, then repeat from a 360-pixel phone using the sticky booking bar | Both routes open `/booking/<slug>` for the chosen service; the sticky bar does not cover the last card and remains reachable | Status: NOT TESTED
[ ] TC-012 | PUBLIC-SERVICES | GUEST | Switch between English and German on `/services`; inspect names, descriptions, prices, and durations | Copy is fully translated, prices keep the EUR format appropriate to the locale, and no raw translation key is visible | Status: NOT TESTED

## PUBLIC-PRODUCTS

[ ] TC-013 | PUBLIC-PRODUCTS | GUEST | Open `/products`; use search, category, price range, attribute filters, sort, and pagination in sequence | Results update correctly; the URL reflects the active filters; clearing filters restores the full list; pagination preserves filters | Status: NOT TESTED
[ ] TC-014 | PUBLIC-PRODUCTS | GUEST | Open `/products/this-category-does-not-exist` | A friendly not-found page appears with a way back to the catalogue; no stack trace, draft data, or blank screen is exposed | Status: NOT TESTED
[ ] TC-015 | PUBLIC-PRODUCTS | GUEST | Open an active product at `/p/<slug>`; switch gallery thumbnails; play the video; open a PDF; use share and copy link | Gallery switches the main image; video plays or embeds; PDF opens or downloads; WhatsApp share and copy-link actions work | Status: NOT TESTED
[ ] TC-016 | PUBLIC-PRODUCTS | GUEST | Open `/p/this-product-does-not-exist` and an inactive product URL | Both show a not-found or unavailable state; no title, price, image, or document from an inactive product is exposed | Status: NOT TESTED
[ ] TC-017 | PUBLIC-PRODUCTS | GUEST | Look for an add-to-cart, buy, or checkout control on the listing and on a product detail page | Feature not yet built — confirm graceful empty state; no cart UI or buy button exists, and the catalogue remains a display-only showcase with sharing and contact paths | Status: NOT BUILT
[ ] TC-018 | PUBLIC-PRODUCTS | GUEST | View source on an active product page and validate the metadata | Title, meta description, Open Graph tags, and Product JSON-LD are present; price and currency are correct; the JSON parses without error | Status: NOT TESTED

## PUBLIC-ABOUT

[ ] TC-019 | PUBLIC-ABOUT | GUEST | Open `/about` and read the full page | Studio introduction, location, contact details, appointment guidance, and imagery render; no lorem ipsum or raw placeholder text is visible | Status: NOT TESTED
[ ] TC-020 | PUBLIC-ABOUT | GUEST | Use each call-to-action on `/about` | Booking actions lead to services or a service booking page; contact actions lead to `/contact` or the configured phone/WhatsApp destination | Status: NOT TESTED
[ ] TC-021 | PUBLIC-ABOUT | GUEST | Open `/about` at 360 pixels wide and scroll to the footer | Images scale without cropping key content; text remains readable; there is no horizontal scroll and no overlapping CTA | Status: NOT TESTED

## PUBLIC-CONTACT

[ ] TC-022 | PUBLIC-CONTACT | GUEST | Submit the contact form with all fields empty | Required-field messages appear for name, phone, and message; no network request creates an empty inbox entry | Status: NOT TESTED
[ ] TC-023 | PUBLIC-CONTACT | GUEST | Enter phone values `abc`, `12`, and `+49 171 2345678`, submitting each | The first two are rejected with a phone-format message; the international number is accepted | Status: NOT TESTED
[ ] TC-024 | PUBLIC-CONTACT | GUEST | Submit a valid name, phone, and message; then open the admin inbox | A success message appears and the form clears; the message appears in the inbox with the same name, phone, and text, marked unread | Status: NOT TESTED
[ ] TC-025 | PUBLIC-CONTACT | GUEST | Submit a valid message with the browser offline or the API forced to return 500 | A clear error is shown; the entered text is retained; retrying after reconnecting succeeds without duplicating the message | Status: NOT TESTED
[ ] TC-026 | PUBLIC-CONTACT | GUEST | Compare `/contact` with Settings → Contact: phone, WhatsApp, email, address, social links, map | Displayed values match the saved settings; any missing item is simply absent; the layout does not break or show `undefined` | Status: NOT TESTED
[ ] TC-027 | PUBLIC-CONTACT | GUEST | Click the WhatsApp action on `/contact` and inspect the opened URL | It opens `wa.me` with a digits-only international number and a readable pre-filled message; no spaces, plus sign, or double slash remain | Status: NOT TESTED

## PUBLIC-BOOKING

[ ] TC-028 | PUBLIC-BOOKING | GUEST | Open `/booking/<valid-service-slug>` with staff, hours, and gateways configured | Service name, from-price, duration, staff choices, date input, time grid, and guest form render; today's date is selected and slots load without error | Status: NOT TESTED
[ ] TC-029 | PUBLIC-BOOKING | GUEST | Open `/booking/this-service-does-not-exist` | A friendly 404 page appears; no booking form, staff list, or slot request is exposed | Status: NOT TESTED
[ ] TC-030 | PUBLIC-BOOKING | GUEST | With zero active or bookable staff, open a valid booking page | A plain "no staff available" message and an empty time grid appear; the submit action cannot create a booking; the page does not claim the day is fully booked | Status: NOT TESTED
[ ] TC-031 | PUBLIC-BOOKING | GUEST | With staff A and B available, select A, then any staff, then B; change the date between selections | Each change reloads slots for the current choice; no previously selected slot survives a reload; stale responses do not overwrite newer ones | Status: NOT TESTED
[ ] TC-032 | PUBLIC-BOOKING | GUEST | Seed a paid 10:00–11:00 booking for staff A; open the same day and inspect 10:00, 10:30, and 11:00 | 10:00 and 10:30 are unavailable; 11:00 is available; the half-open boundary does not mark the adjacent appointment as an overlap | Status: NOT TESTED
[ ] TC-033 | PUBLIC-BOOKING | GUEST | Choose a day whose every slot is taken | Taken times are visible but disabled and labelled; no time can be selected; changing the date or staff restores a usable grid | Status: NOT TESTED
[ ] TC-034 | PUBLIC-BOOKING | GUEST | Choose a closed weekday and a weekday with no working-hours row | Both show the empty-times message rather than a server error; no slot can be submitted; changing to an open day works | Status: NOT TESTED
[ ] TC-035 | PUBLIC-BOOKING | GUEST | Submit with empty name, then empty phone, then invalid email `a@b`, then a valid booking with email blank | Each invalid submission is blocked with a specific message; the valid submission with no email proceeds to the deposit step | Status: NOT TESTED
[ ] TC-036 | PUBLIC-BOOKING | GUEST | In two tabs, select the same last slot and submit at the same moment | Exactly one booking is created and one hold appears in admin; the other tab shows the "slot just taken" message and offers another time | Status: NOT TESTED
[ ] TC-037 | PUBLIC-BOOKING | GUEST | Disable both Stripe and PayPal, then submit a valid slot | A clear "online payment unavailable, contact the salon" message appears; no pending booking or orphan hold is created | Status: NOT TESTED
[ ] TC-038 | PUBLIC-BOOKING | GUEST | Double-click Continue on a valid slot and repeat the same request with the same idempotency key | Only one booking exists; the button is disabled while creating; the repeated request does not create a second hold or booking | Status: NOT TESTED
[ ] TC-039 | PUBLIC-BOOKING | GUEST | Enter a booking note and tick the WhatsApp reminder box; create the booking and open its admin detail | The note and opt-in flag are stored and visible; the checkbox is unticked by default; marketing consent is recorded separately | Status: NOT TESTED
[ ] TC-040 | PUBLIC-BOOKING | GUEST | Request a date beyond the 60-day horizon and a date in the past | The grid is empty or the request is rejected with a clear message; no server error, negative availability, or booking outside the horizon is created | Status: NOT TESTED
[ ] TC-041 | PUBLIC-BOOKING | GUEST | Create one booking with marketing consent rejected and one with it accepted; inspect the request and Meta events | Without consent, no `_fbp` or `_fbc` is sent and no marketing event fires; with consent, attribution cookies and events are present | Status: NOT TESTED

## PUBLIC-PAYMENT

[ ] TC-042 | PUBLIC-PAYMENT | GUEST | After creating a booking, inspect the deposit section before choosing a provider | The exact deposit is shown (50% by default) with a short explanation; only enabled gateways appear; no automatic redirect occurs | Status: NOT TESTED
[ ] TC-043 | PUBLIC-PAYMENT | GUEST | Pay the deposit with a Stripe sandbox card and return to the site | The Stripe page shows the correct amount and booking reference; the return leads to the success page, which reaches the PAID state | Status: NOT TESTED
[ ] TC-044 | PUBLIC-PAYMENT | GUEST | Pay the deposit with a PayPal sandbox account and return to the site | The PayPal order shows the correct amount and currency; the return leads to the success page, which reaches the PAID state | Status: NOT TESTED
[ ] TC-045 | PUBLIC-PAYMENT | GUEST | Start payment with each provider and cancel at the provider page | The browser returns to the failure page; the booking number, deposit, enabled retry buttons, and services link are shown | Status: NOT TESTED
[ ] TC-046 | PUBLIC-PAYMENT | GUEST | From the failure page, retry the same booking with the same provider and with the other provider | A new provider attempt is created for the same booking; admin still shows one booking; no duplicate appointment or second deposit is recorded | Status: NOT TESTED
[ ] TC-047 | PUBLIC-PAYMENT | GUEST | After a confirmed payment, reload the success page twice and reopen it from history | The same PAID confirmation, details, and manage link appear; polling stops; no duplicate booking, charge, or purchase event is created | Status: NOT TESTED
[ ] TC-048 | PUBLIC-PAYMENT | GUEST | Create a booking and let the 20-minute hold expire; open the original payment link and try to pay | The server reports that the hold expired and asks for a new slot; the booking becomes EXPIRED and the slot is available again | Status: NOT TESTED
[ ] TC-049 | PUBLIC-PAYMENT | GUEST | Open a salon-generated pay link `/booking/pay/<token>` for a manual pay-link booking; also try an invalid token and an already-paid token | The valid page shows the deposit and enabled gateways and can complete payment; unknown token returns 404; paid token returns 409 without changing the booking | Status: NOT TESTED
[ ] TC-050 | PUBLIC-PAYMENT | SYSTEM | Send the same Stripe and PayPal success webhook twice, then send an invalid-signature webhook | The first valid event confirms PAID once, with one confirmation email and no duplicate refund rows; the duplicate is a no-op; the invalid signature returns 400 with no state change | Status: NOT TESTED

## PUBLIC-MANAGE

[ ] TC-051 | PUBLIC-MANAGE | CUSTOMER | Open the manage link from the success page and from the confirmation email | Service, date, time, duration, staff, booking number, deposit, and cancellation policy are shown; no other booking or admin-only data is visible | Status: NOT TESTED
[ ] TC-052 | PUBLIC-MANAGE | CUSTOMER | For a paid online booking more than 24 hours away, press Cancel, read the dialog, enter a reason, and confirm | The booking becomes CANCELLED; a refund is requested through the original provider; the page shows the refund status; the slot is released | Status: NOT TESTED
[ ] TC-053 | PUBLIC-MANAGE | CUSTOMER | Open a paid booking less than 24 hours away; also call the cancel endpoint directly | The cancel button is replaced by the late-cancellation message; the direct request is rejected; no refund or cancellation occurs | Status: NOT TESTED
[ ] TC-054 | PUBLIC-MANAGE | CUSTOMER | Open `/booking/manage/<invalid-token>` and a token from a cancelled booking | Invalid tokens show a friendly 404; a cancelled booking shows its cancelled state without exposing another customer's data | Status: NOT TESTED
[ ] TC-055 | PUBLIC-MANAGE | CUSTOMER | Look for a reschedule or change-time action on the manage page | Feature not yet built — confirm graceful empty state; only viewing and cancellation are offered, with guidance to contact the salon | Status: NOT BUILT
[ ] TC-056 | PUBLIC-MANAGE | CUSTOMER | Look for account registration, sign-in, or booking history on the public site | Feature not yet built — confirm graceful empty state; no account area exists and the private manage link is the only self-service entry point | Status: NOT BUILT

## PUBLIC-LEGAL

[ ] TC-057 | PUBLIC-LEGAL | GUEST | Open `/agb` | Feature not yet built — confirm graceful empty state; a placeholder message and contact link are shown instead of terms and conditions | Status: NOT BUILT
[ ] TC-058 | PUBLIC-LEGAL | GUEST | Open `/datenschutz` | Feature not yet built — confirm graceful empty state; a placeholder message and contact link are shown instead of a privacy policy | Status: NOT BUILT
[ ] TC-059 | PUBLIC-LEGAL | GUEST | Open `/impressum` | Feature not yet built — confirm graceful empty state; a placeholder message and contact link are shown instead of imprint data | Status: NOT BUILT
[ ] TC-060 | PUBLIC-LEGAL | GUEST | Open `/stornierung` | Feature not yet built — confirm graceful empty state; a placeholder message and contact link are shown instead of a cancellation policy | Status: NOT BUILT

## PUBLIC-CONSENT

[ ] TC-061 | PUBLIC-CONSENT | GUEST | Visit a public page with cookies cleared; then visit `/admin/login` in the same browser | The consent banner appears on public pages only; admin pages do not show it; no marketing cookie is set before a choice | Status: NOT TESTED
[ ] TC-062 | PUBLIC-CONSENT | GUEST | Choose Reject all, then inspect cookies and network requests and complete a booking | The banner closes; no `_fbp` or `_fbc` exists; the Meta pixel script is not loaded; the booking flow still works | Status: NOT TESTED
[ ] TC-063 | PUBLIC-CONSENT | GUEST | With Meta enabled and a valid pixel, choose Accept all and complete a booking | The pixel loads once; `_fbp` is set; ViewContent and InitiateCheckout fire according to the flow; no duplicate pixel instances appear | Status: NOT TESTED
[ ] TC-064 | PUBLIC-CONSENT | GUEST | Open Settings in the banner and inspect marketing before touching it; enable it and save; reload after a new visit | Marketing is unticked by default; enabling stores the choice for 180 days; reloading does not re-prompt before expiry | Status: NOT TESTED
[ ] TC-065 | PUBLIC-CONSENT | GUEST | Use the footer Cookie settings link; disable marketing; inspect cookies and subsequent Meta requests | The banner reopens with the saved choices; disabling removes `_fbp` and `_fbc`; no further marketing events fire | Status: NOT TESTED
[ ] TC-066 | PUBLIC-CONSENT | GUEST | Clear site data, choose Reject all in one browser profile, and open the site in another profile | The banner returns after clearing; the choice does not leak between profiles or browsers; no consent is assumed | Status: NOT TESTED

## PUBLIC-I18N

[ ] TC-067 | PUBLIC-I18N | GUEST | With launch mode off, open `/`, switch to German, and navigate to another public page | English is the unprefixed default; German uses `/de`; the switcher preserves the page; `<html lang>` updates to the active locale | Status: NOT TESTED
[ ] TC-068 | PUBLIC-I18N | GUEST | With launch mode on, open `/` and try `/en`; inspect internal links and the language switcher | German is the only locale; URLs have no prefix; no switcher is shown; `/en` is not a valid public route | Status: NOT TESTED
[ ] TC-069 | PUBLIC-I18N | GUEST | Switch languages on the booking, success, failed, and manage pages; trigger a validation error | All labels, validation messages, dates, and currency formats follow the locale; no raw key such as `booking.title` appears | Status: NOT TESTED
[ ] TC-070 | PUBLIC-I18N | GUEST | Inspect canonical and hreflang tags on an English and a German public page | Each page declares the correct canonical and alternate locale; metadata is not duplicated; no admin-only Arabic strings appear on public pages | Status: NOT TESTED

## ADMIN-AUTH

[ ] TC-071 | ADMIN-AUTH | GUEST | Open `/admin` and `/admin/bookings` while signed out | Both redirect to `/admin/login`; no admin markup, booking data, or customer data appears in the HTML before the redirect | Status: NOT TESTED
[ ] TC-072 | ADMIN-AUTH | ADMIN | Sign in with valid credentials and inspect the session cookie and the user record | Login lands on the dashboard; the session cookie is HttpOnly, Secure where HTTPS is used, and SameSite-scoped; last login time updates | Status: NOT TESTED
[ ] TC-073 | ADMIN-AUTH | GUEST | Enter a wrong password six times within one minute, then try the correct password immediately and after a minute | The first failures return a generic 401; subsequent attempts return 429 with a wait message; the correct password works after the limit resets | Status: NOT TESTED
[ ] TC-074 | ADMIN-AUTH | ADMIN | Sign out, press the browser back button, and call an admin API directly | The session is cleared; the back button does not restore admin content; the direct API call returns 401 | Status: NOT TESTED
[ ] TC-075 | ADMIN-AUTH | STAFF | Sign in as a STAFF user; open `/admin`; inspect the sidebar | Login lands on `/admin/appointments?tab=my-bookings`; `/admin` redirects to the same place; only My Bookings, notifications, and the shell are offered | Status: NOT TESTED
[ ] TC-076 | ADMIN-AUTH | MANAGER | Sign in as MANAGER; open Settings, Users, and Finance by URL and inspect the corresponding APIs | The pages redirect or deny access; the APIs return 403; allowed pages such as Appointments, Salon, Catalog, and Website remain usable | Status: NOT TESTED
[ ] TC-077 | ADMIN-AUTH | ADMIN | Deactivate a user who is signed in in another browser; let that user navigate and call an API; then reactivate and sign in | The next navigation redirects to login; the API rejects the session; after reactivation, login succeeds normally | Status: NOT TESTED

## ADMIN-DASHBOARD

[ ] TC-078 | ADMIN-DASHBOARD | ADMIN | Compare dashboard catalogue and booking cards with the catalog, services, and filtered booking lists | Counts match the underlying lists; paid revenue equals the sum of deposits on PAID bookings; pending refunds equals the flagged count | Status: NOT TESTED
[ ] TC-079 | ADMIN-DASHBOARD | MANAGER | Open the dashboard and inspect cards and quick actions | Booking KPIs are visible; user, settings, and expense actions are absent; each visible link opens a page the manager can use | Status: NOT TESTED
[ ] TC-080 | ADMIN-DASHBOARD | STAFF | Open `/admin` directly and inspect the rendered response | The user is redirected to My Bookings; no revenue, customer list, or catalogue management data is rendered for the staff role | Status: NOT TESTED
[ ] TC-081 | ADMIN-DASHBOARD | ADMIN | Click each KPI card and return to the dashboard | The destination opens with the matching filter (today, unassigned, refunds, paid); browser back restores the dashboard without errors | Status: NOT TESTED

## ADMIN-APPOINTMENTS

[ ] TC-082 | ADMIN-APPOINTMENTS | ADMIN | Open `/admin/appointments`; switch all four tabs; deep-link `?tab=bookings`; try an unknown tab value | All permitted tabs load; the deep link opens All Bookings; an unknown tab falls back to the first allowed tab without an error | Status: NOT TESTED
[ ] TC-083 | ADMIN-APPOINTMENTS | ADMIN | Apply status, date, staff, needs-refund, and search filters in All Bookings; reset; paginate | Results match the filters; the URL carries them; reset clears all; pagination keeps the filters; no stale rows remain | Status: NOT TESTED
[ ] TC-084 | ADMIN-APPOINTMENTS | ADMIN | Select two assigned bookings, choose batch cancel, enter a reason, and confirm | Both bookings become UNASSIGNED; their assignment history is closed; the customer is not cancelled or refunded; admins receive a grouped notice | Status: NOT TESTED
[ ] TC-085 | ADMIN-APPOINTMENTS | STAFF | Open My Bookings; complete a started appointment; try completing one before its start, an unassigned one, and another staff member's booking | Only the started own booking completes; the other attempts are rejected with clear messages; the list refreshes | Status: NOT TESTED
[ ] TC-086 | ADMIN-APPOINTMENTS | STAFF | Use "I'm unavailable" for a range overlapping two assigned bookings | Both bookings return to the UNASSIGNED queue; the time-off record is created; one grouped admin notice is sent; no customer cancellation or refund occurs | Status: NOT TESTED
[ ] TC-087 | ADMIN-APPOINTMENTS | ADMIN | Open Reminders with a 3-hour window; inspect email and WhatsApp rows; click a WhatsApp link | Due bookings appear; email reminders show their state; the WhatsApp link opens `wa.me` with a normalized number and a prefilled message; nothing sends automatically | Status: NOT TESTED
[ ] TC-088 | ADMIN-APPOINTMENTS | ADMIN | Create a manual booking with payment mode paid in salon, selecting a staff member | The booking is PAID and ASSIGNED immediately; an assignment history row exists; the staff member is notified; an audit entry is written | Status: NOT TESTED
[ ] TC-089 | ADMIN-APPOINTMENTS | ADMIN | Create manual bookings in pending and pay-link modes; reuse an occupied slot; try a closed day and a date outside the horizon | Pending and pay-link bookings hold the slot for the configured TTL; the pay link opens the payment page; conflicting or invalid slots return clear 409/400 errors | Status: NOT TESTED

## ADMIN-CALENDAR

[ ] TC-090 | ADMIN-CALENDAR | ADMIN | Open Appointments → Calendar in day view; navigate dates; inspect staff columns, the Unassigned column, and closed hours | The grid shows staff columns plus Unassigned; bookings sit at the correct times; closed hours are not bookable; date navigation reloads the correct day | Status: NOT TESTED
[ ] TC-091 | ADMIN-CALENDAR | ADMIN | Switch to week and month views; navigate forward and back; click a day in month view | Week groups bookings by day; month shows daily counts; navigation stays on the chosen period; month cells do not silently create or edit bookings | Status: NOT TESTED
[ ] TC-092 | ADMIN-CALENDAR | ADMIN | Click a booking, assign it from the side panel, then reschedule it; close the panel and refresh the grid | The panel shows the correct summary and permitted actions; assignment and reschedule succeed; the grid reflects both changes without a full reload | Status: NOT TESTED
[ ] TC-093 | ADMIN-CALENDAR | ADMIN | Inspect the unassigned queue with bookings 2 hours, 12 hours, and 3 days away; open the WhatsApp action | The queue is sorted nearest first; bookings under 24 hours are marked urgent; the WhatsApp message uses the configured template and a normalized phone number | Status: NOT TESTED
[ ] TC-094 | ADMIN-CALENDAR | ADMIN | Click an empty slot in day view; inspect the pre-filled manual booking modal; cancel it | The modal opens with the clicked date, time, and staff; cancelling closes it without creating a booking or hold | Status: NOT TESTED
[ ] TC-095 | ADMIN-CALENDAR | ADMIN | Filter by one staff member; clear the filter; repeat in an environment with no bookable staff | The filter shows only that staff member's bookings; clearing restores all; with no staff, the grid renders an empty or unassigned state without crashing | Status: NOT TESTED

## ADMIN-BOOKINGS

[ ] TC-096 | ADMIN-BOOKINGS | ADMIN | Open a booking detail from the list; compare all cards with the list row and inspect the mail log and assignment history | Customer, service, time, payment, assignment, notes, and refund state match; the mail log lists attempts with status; no secret or unrelated booking data appears | Status: NOT TESTED
[ ] TC-097 | ADMIN-BOOKINGS | ADMIN | Assign an eligible staff member, then reassign to another eligible member | Status becomes ASSIGNED; the new assignment history row is open; the previous row is closed; both staff are notified; a customer change email is queued | Status: NOT TESTED
[ ] TC-098 | ADMIN-BOOKINGS | ADMIN | Try to assign a staff member who is inactive, ineligible for the service, on time off, or already booked for an overlap | Each attempt is rejected with a specific message; the booking's assignee and status do not change | Status: NOT TESTED
[ ] TC-099 | ADMIN-BOOKINGS | ADMIN | Complete a started ASSIGNED booking; repeat before start; repeat from UNASSIGNED; repeat as STAFF on another user's booking | Only the started assigned booking completes; the other attempts are rejected; a STAFF user cannot complete a booking that is not theirs | Status: NOT TESTED
[ ] TC-100 | ADMIN-BOOKINGS | ADMIN | Cancel a paid Stripe booking with full refund, confirm, and inspect the booking, refund row, customer email, and audit log | The booking is CANCELLED; a refund row is created and reaches SUCCEEDED; the customer is emailed where an address exists; the audit entry records the mode and actor | Status: NOT TESTED
[ ] TC-101 | ADMIN-BOOKINGS | ADMIN | Cancel two paid bookings, one with a custom partial amount and one with "outside"; repeat the same cancellation | The custom amount is recorded and does not exceed the deposit; outside mode makes no provider call; repeating does not issue a second refund | Status: NOT TESTED
[ ] TC-102 | ADMIN-BOOKINGS | ADMIN | Open a booking flagged needsRefund; try to assign and reschedule; then mark refund handled with a note | The flag is visible; assign and reschedule are blocked; marking handled clears the flag and writes an audit entry without moving money | Status: NOT TESTED
[ ] TC-103 | ADMIN-BOOKINGS | STAFF | Open another staff member's booking URL, then the user's own booking URL | The other booking returns not found or no access; the own booking opens with only the actions the staff role permits | Status: NOT TESTED

## ADMIN-SALON

[ ] TC-104 | ADMIN-SALON | ADMIN | Open `/admin/salon`; switch Services, Team, and Hours tabs; deep-link each tab | All three tabs load for an admin; the URL keeps the active tab; switching does not lose unsaved state without warning | Status: NOT TESTED
[ ] TC-105 | ADMIN-SALON | ADMIN | Create a service with section, names, price, duration, and cover image; edit it; deactivate it and check the public site | The service appears publicly while active; edits persist; deactivation removes it from the public list and booking entry points | Status: NOT TESTED
[ ] TC-106 | ADMIN-SALON | ADMIN | Toggle "duration needs review" on one service and off on another; check the public card and the booking page | The flagged card hides duration; the unflagged card shows it; the booking page still uses the stored duration for slots | Status: NOT TESTED
[ ] TC-107 | ADMIN-SALON | ADMIN | Set a weekday closed, enter a close time earlier than open, then save a valid range; check public availability | Invalid ranges are rejected; the closed day offers no slots; the valid range is reflected in availability and the calendar | Status: NOT TESTED
[ ] TC-108 | ADMIN-SALON | MANAGER | Open Salon Management and try the Users sub-tab and user APIs | Services, staff, and hours remain available; the users tab and user APIs are denied because MANAGER lacks user management | Status: NOT TESTED

## ADMIN-TEAM

[ ] TC-109 | ADMIN-TEAM | ADMIN | Open Team → Users; create a user with a role; try the same email again | The new user appears with role defaults and active state; the duplicate email is rejected with a clear message | Status: NOT TESTED
[ ] TC-110 | ADMIN-TEAM | ADMIN | Grant a MANAGER the refund-issue permission, sign in as that manager, then remove the permission | The extra grant takes effect on the next session refresh; the manager can issue a refund; after removal the action is denied again | Status: NOT TESTED
[ ] TC-111 | ADMIN-TEAM | ADMIN | Try to demote, deactivate, and delete the last active non-super admin; repeat on your own account; try to edit the super admin | The last-admin actions are blocked; self-demotion, self-deactivation, and self-deletion are blocked; the super admin cannot be modified or deleted | Status: NOT TESTED
[ ] TC-112 | ADMIN-TEAM | ADMIN | View the user list as the super admin and as a non-super admin; inspect the user API response | Salary is visible only to the super admin; the non-super response does not contain salary values; no secret or password hash is returned | Status: NOT TESTED
[ ] TC-113 | ADMIN-TEAM | ADMIN | Edit a staff profile: display name, photo, bookable flag, sort order, and service eligibility; inspect public booking | The public staff picker reflects the changes; an ineligible staff member is not offered for the excluded service; an unbookable one disappears | Status: NOT TESTED
[ ] TC-114 | ADMIN-TEAM | ADMIN | Add a per-staff schedule override, an absence, and a studio closure; check availability and existing bookings | Availability excludes the affected times; an absence returns overlapping assigned bookings to the queue; the closure blocks the day | Status: NOT TESTED

## ADMIN-CATALOG

[ ] TC-115 | ADMIN-CATALOG | ADMIN | Open Catalog → Products; search, filter by category and status, paginate, and toggle the keywords column | Results match the filters; pagination works; the keywords column shows saved keywords; edit, preview, duplicate, and delete actions are available | Status: NOT TESTED
[ ] TC-116 | ADMIN-CATALOG | ADMIN | Create a product through the five-step wizard with missing fields, then complete it | Missing name, category, or price blocks the relevant step and focuses the first invalid step; a complete product saves and appears in the list | Status: NOT TESTED
[ ] TC-117 | ADMIN-CATALOG | ADMIN | Upload an image over 5 MB, a non-image file, a video over 50 MB, and a PDF over 10 MB; then upload valid files | Each oversized or wrong-type file is rejected with a message; valid files upload; the chosen image order and cover are saved | Status: NOT TESTED
[ ] TC-118 | ADMIN-CATALOG | ADMIN | Edit a product; remove an image, a video, and a document; reorder the remaining images; save and open the public page | Removals and order persist; the public gallery uses the new cover and order; the modification history timeline loads newest first | Status: NOT TESTED
[ ] TC-119 | ADMIN-CATALOG | ADMIN | Create a category with cover media and featured flag; reorder categories; try deleting a category that still has products | The category appears publicly when active; sort order persists; featured controls the homepage strip; deletion with products is blocked or requires moving them | Status: NOT TESTED
[ ] TC-120 | ADMIN-CATALOG | ADMIN | Deactivate a product, check the listing, category page, homepage, and direct URL; reactivate it | The inactive product disappears from all public lists and featured blocks; the direct URL is unavailable; reactivation restores it | Status: NOT TESTED

## ADMIN-FINANCE

[ ] TC-121 | ADMIN-FINANCE | ADMIN | Open Finance → Expenses; filter by date, category, and search; export CSV | The list and totals match the filters; the CSV contains the same filtered rows and expected columns; no unfiltered rows leak into the export | Status: NOT TESTED
[ ] TC-122 | ADMIN-FINANCE | ADMIN | Create an expense with a receipt; edit or delete it; submit an invalid amount | The expense appears in the list and totals; the receipt is accessible; deletion removes it; an invalid amount is rejected | Status: NOT TESTED
[ ] TC-123 | ADMIN-FINANCE | MANAGER | Open `/admin/finance` and call an expenses API as MANAGER and as STAFF | The route redirects or denies; the API returns 403; no expense totals, receipts, or vendor data are exposed | Status: NOT TESTED
[ ] TC-124 | ADMIN-FINANCE | ADMIN | Open Finance → Payments & Refunds; compare the list and headline stats with flagged bookings and the dashboard | The list contains exactly the flagged bookings; the stats match the dashboard's pending-refund and revenue figures | Status: NOT TESTED
[ ] TC-125 | ADMIN-FINANCE | MANAGER | Mark a flagged booking as refund handled with a note; inspect the booking and audit log | The flag clears; the booking leaves the list; the note and actor appear in the audit log; no provider refund is attempted | Status: NOT TESTED
[ ] TC-126 | ADMIN-FINANCE | SYSTEM | Force a provider refund failure (invalid key or sandbox rejection) from an admin cancellation | The booking remains flagged; the failure is recorded; admins are notified; the UI does not report a false success | Status: NOT TESTED

## ADMIN-WEBSITE

[ ] TC-127 | ADMIN-WEBSITE | ADMIN | Open Website → Inbox; switch All, Unread, and Read; open a message; delete another | Filters work; opening marks the message read; the sidebar unread badge decrements; deletion removes the message; pagination remains stable | Status: NOT TESTED
[ ] TC-128 | ADMIN-WEBSITE | ADMIN | Create a banner with placement, link target, image, and active state; view the public placement; deactivate it | The active banner appears in the chosen placement; the link works; an inactive banner is absent; a broken target or missing image does not render a broken block | Status: NOT TESTED
[ ] TC-129 | ADMIN-WEBSITE | ADMIN | Add announcement items up to ten; try an eleventh; reorder; toggle active and background; observe the public bar | Ten items are accepted and the eleventh is blocked; order persists; the public bar advances about every five seconds; reduced motion shows a static manual version | Status: NOT TESTED
[ ] TC-130 | ADMIN-WEBSITE | ADMIN | Configure ticker text, speed, and active state; check the public ticker; dismiss it; disable the ticker | The ticker shows the saved copy and speed, can be dismissed, does not overlap the header, and disappears when disabled | Status: NOT TESTED
[ ] TC-131 | ADMIN-WEBSITE | ADMIN | Open legacy `/admin/inbox` and `/admin/banners?tab=announcements` | The first redirects to Website → Inbox with the filter preserved; the second redirects to Settings → Website for announcements; no dead page appears | Status: NOT TESTED

## ADMIN-SETTINGS

[ ] TC-132 | ADMIN-SETTINGS | ADMIN | Open Settings; switch tabs; deep-link `?tab=payment`; edit a field and switch away without saving | Only permitted tabs appear; the deep link opens Payment; the unsaved-changes dialog appears and can cancel or discard the switch; reset restores saved values | Status: NOT TESTED
[ ] TC-133 | ADMIN-SETTINGS | ADMIN | Change site names, taglines, colours, logo, and favicon; save; inspect the public header, footer, and metadata | Saved values appear publicly; colours apply consistently; an invalid image is rejected; removing the logo falls back gracefully | Status: NOT TESTED
[ ] TC-134 | ADMIN-SETTINGS | ADMIN | Change phone, WhatsApp, email, address, social links, and map URL; save; inspect contact and footer | Public pages reflect the saved values; a missing or malformed map or social URL does not break the page or create an unsafe embed | Status: NOT TESTED
[ ] TC-135 | ADMIN-SETTINGS | ADMIN | Change slot step, hold TTL, deposit percentage, lead time, cancellation window, reminder settings, and reassignment templates; save; create a booking | Values persist within their validation bounds; new holds, deposits, lead-time checks, cancellation policy, and reminders use the new values; existing bookings keep snapshots | Status: NOT TESTED
[ ] TC-136 | ADMIN-SETTINGS | ADMIN | Enable Stripe with valid sandbox keys, then disable it; remove a required key; inspect the public booking page and API responses | Enabled and complete makes Stripe available publicly; disabled or incomplete removes it; secrets are masked and never returned in clear text | Status: NOT TESTED
[ ] TC-137 | ADMIN-SETTINGS | ADMIN | Configure the Meta pixel and token; visit the public site with and without marketing consent; then disable the integration | With consent and enabled, the pixel and server events run; without consent or when disabled, nothing fires; the token remains masked | Status: NOT TESTED
[ ] TC-138 | ADMIN-SETTINGS | ADMIN | Switch mail provider between log and HTTP; change from address and name; save; trigger a confirmation | The settings persist; the key is masked; with log, no external delivery occurs; with a valid HTTP provider, the confirmation is attempted with the new sender | Status: NOT TESTED
[ ] TC-139 | ADMIN-SETTINGS | ADMIN | Manage hero slides: upload until eight, try a ninth, reorder, toggle active, set interval 2 and 20 then 6; inspect the public hero | Eight slides are accepted and the ninth is blocked; order and active state persist; the interval is clamped to 3–15; non-image files are rejected; the public hero matches | Status: NOT TESTED

## ADMIN-NOTIFICATIONS

[ ] TC-140 | ADMIN-NOTIFICATIONS | ADMIN | Open Notifications; filter by type and read state; paginate; mark one read; mark all read | Filters and pagination work; unread counts update; a single mark-read persists after reload; mark-all clears the visible unread set | Status: NOT TESTED
[ ] TC-141 | ADMIN-NOTIFICATIONS | ADMIN | Open a notification with a deep link to a booking; repeat with a STAFF user and a restricted destination | The permitted destination opens the correct record; a restricted destination redirects safely without exposing the record | Status: NOT TESTED
[ ] TC-142 | ADMIN-NOTIFICATIONS | ADMIN | On a browser with push configured, visit admin for the first time; allow permission; trigger a test notification; repeat with permission denied | Allowing registers a device token and delivers a push; denying stops the prompt and leaves the in-app list working; missing Firebase config disables push silently | Status: NOT TESTED
[ ] TC-143 | ADMIN-NOTIFICATIONS | ADMIN | Deactivate a user with a stored push token; trigger a notification; reactivate and repeat | The deactivated user receives no push or in-app notification; after reactivation and a new token registration, delivery resumes | Status: NOT TESTED

## ADMIN-ACTIVITY

[ ] TC-144 | ADMIN-ACTIVITY | ADMIN | Open Activity; filter by entity and action; paginate; compare an entry with the change just made | Entries are newest first; the actor, action, entity, details, and timestamp match; filters and pagination work; no unrelated entity appears | Status: NOT TESTED
[ ] TC-145 | ADMIN-ACTIVITY | STAFF | Open Activity as STAFF, then as MANAGER; compare the visible rows | STAFF sees only their own entries; MANAGER sees the operational log for permitted entities; no salary, secret, or unrelated personal data appears | Status: NOT TESTED
[ ] TC-146 | ADMIN-ACTIVITY | ADMIN | Look for a booking entity filter or a booking cancellation entry on Activity | Feature not yet built — confirm graceful absence; the entity list excludes bookings, so booking history must be checked on the booking detail and notification feed | Status: NOT BUILT

## STAFF-PANEL

[ ] TC-147 | STAFF-PANEL | STAFF | Sign in as STAFF and inspect the sidebar, header, and available pages | Only My Bookings and notifications are reachable; no dashboard, revenue, catalogue, settings, or user management is shown; the shell remains usable | Status: NOT TESTED
[ ] TC-148 | STAFF-PANEL | STAFF | Open upcoming and past bookings; open a booking detail | Only bookings assigned to the signed-in user appear; customer contact and the booking note are visible; deposit and refund controls are absent | Status: NOT TESTED
[ ] TC-149 | STAFF-PANEL | STAFF | Complete a started own booking; try before start, an unassigned booking, and another staff member's booking | The started own booking completes; the other attempts are blocked; the list and status update correctly | Status: NOT TESTED
[ ] TC-150 | STAFF-PANEL | STAFF | Unassign an own assigned booking with a reason; check the admin queue, the customer booking, and the mail log | The booking returns to UNASSIGNED; admins are notified; the booking remains PAID and active for the customer; no customer cancellation email is sent | Status: NOT TESTED
[ ] TC-151 | STAFF-PANEL | STAFF | Report "I'm unavailable" for a range with two assigned bookings; inspect the queue and customer records | The absence is recorded; both bookings return to the queue; one grouped admin notice is sent; the customer bookings are not cancelled or refunded | Status: NOT TESTED
[ ] TC-152 | STAFF-PANEL | STAFF | Request admin URLs and APIs for all bookings, users, settings, expenses, and another staff member's booking | Every request is redirected, returns 404, or returns 403; no customer list, revenue, settings, or other staff data is exposed | Status: NOT TESTED

## SECURITY

[ ] TC-153 | SECURITY | GUEST | Call admin APIs for users, bookings, settings, expenses, and notifications without a session | Every endpoint returns 401 or 403; error bodies contain no records, counts, or secrets; no admin HTML is served | Status: NOT TESTED
[ ] TC-154 | SECURITY | CUSTOMER | Submit a booking with a tampered price, deposit, duration, or service id; compare the stored booking with the service record | The server ignores client-supplied money and duration values and uses the service snapshot; the deposit matches the configured percentage | Status: NOT TESTED
[ ] TC-155 | SECURITY | SYSTEM | Fire ten parallel booking requests for the same last slot and staff member | Exactly one request succeeds; the others receive 409; no overlapping rows exist; the slot holds are consistent; no duplicate deposits are created | Status: NOT TESTED
[ ] TC-156 | SECURITY | GUEST | Try invalid, guessed, and reused manage and pay tokens; compare responses and timing | Invalid tokens return 404 without data; a token only exposes its own booking; responses do not enable practical enumeration of other bookings | Status: NOT TESTED
[ ] TC-157 | SECURITY | SYSTEM | Send a webhook with an invalid signature, then replay a valid success event three times | The invalid request is rejected with no state change; the valid event confirms once; replays do not duplicate confirmation, email, or refund rows | Status: NOT TESTED
[ ] TC-158 | SECURITY | ADMIN | Enter script and HTML payloads in a contact message, booking note, product description, category name, and banner text; view them in admin and public pages | Payloads render as text or sanitised markup; no script executes; no event handler survives; the layout is not broken | Status: NOT TESTED
[ ] TC-159 | SECURITY | ADMIN | Upload a file with an image extension but executable content, a double extension, and a traversal-style filename | The upload is rejected or stored and served as an inert file; the filename is sanitised; no file is written outside the intended directory | Status: NOT TESTED
[ ] TC-160 | SECURITY | GUEST | Exceed login and booking/payment rate limits; inspect API responses and logs for secrets | Login returns 429 after five attempts per minute; booking/payment endpoints throttle abusive bursts; no password, secret key, token, or full payment payload appears in responses or logs | Status: NOT TESTED

## MOBILE

[ ] TC-161 | MOBILE | GUEST | At 360 pixels wide, open home, services, products, about, and contact; use the navigation drawer | No horizontal scroll; the drawer opens, closes, and traps focus sensibly; text is readable; interactive targets are at least about 44 pixels | Status: NOT TESTED
[ ] TC-162 | MOBILE | GUEST | At 360 pixels, complete a booking through staff, date, slot, details, and payment choice; trigger a validation error | Staff cards and slot grid remain usable; the form and error message stay visible; the sticky CTA does not cover fields; payment buttons are reachable | Status: NOT TESTED
[ ] TC-163 | MOBILE | ADMIN | At 360 pixels, open the admin shell and each main page; open a table and a modal | The sidebar becomes a drawer; tables scroll horizontally without breaking the layout; primary actions remain reachable; modals fit and scroll | Status: NOT TESTED
[ ] TC-164 | MOBILE | ADMIN | At 360 pixels, open the day calendar; open a booking side panel; create a manual booking | The agenda or staff columns remain readable; the side panel uses the available width; the manual booking modal is usable and its actions are not clipped | Status: NOT TESTED
[ ] TC-165 | MOBILE | GUEST | Enable the operating system's reduce-motion preference; open the home page, announcement bar, ticker, and booking success polling state | The hero stops auto-advancing; announcement and ticker auto-scroll stop; spinners and transitions are reduced; manual controls still work and no content is hidden | Status: NOT TESTED

---

## Summary

| Area | Total | NOT BUILT | NOT TESTED |
|---|---:|---:|---:|
| PUBLIC-HOME | 6 | 0 | 6 |
| PUBLIC-SERVICES | 6 | 0 | 6 |
| PUBLIC-PRODUCTS | 6 | 1 | 5 |
| PUBLIC-ABOUT | 3 | 0 | 3 |
| PUBLIC-CONTACT | 6 | 0 | 6 |
| PUBLIC-BOOKING | 14 | 0 | 14 |
| PUBLIC-PAYMENT | 9 | 0 | 9 |
| PUBLIC-MANAGE | 6 | 2 | 4 |
| PUBLIC-LEGAL | 4 | 4 | 0 |
| PUBLIC-CONSENT | 6 | 0 | 6 |
| PUBLIC-I18N | 4 | 0 | 4 |
| ADMIN-AUTH | 7 | 0 | 7 |
| ADMIN-DASHBOARD | 4 | 0 | 4 |
| ADMIN-APPOINTMENTS | 8 | 0 | 8 |
| ADMIN-CALENDAR | 6 | 0 | 6 |
| ADMIN-BOOKINGS | 8 | 0 | 8 |
| ADMIN-SALON | 5 | 0 | 5 |
| ADMIN-TEAM | 6 | 0 | 6 |
| ADMIN-CATALOG | 6 | 0 | 6 |
| ADMIN-FINANCE | 6 | 0 | 6 |
| ADMIN-WEBSITE | 5 | 0 | 5 |
| ADMIN-SETTINGS | 8 | 0 | 8 |
| ADMIN-NOTIFICATIONS | 4 | 0 | 4 |
| ADMIN-ACTIVITY | 3 | 1 | 2 |
| STAFF-PANEL | 6 | 0 | 6 |
| SECURITY | 8 | 0 | 8 |
| MOBILE | 5 | 0 | 5 |
| **Total** | **165** | **8** | **157** |

## Prioritisation

If the available test time is short, protect the money and the calendar first. Run **PUBLIC-BOOKING**, **PUBLIC-PAYMENT**, **SECURITY**, and **ADMIN-BOOKINGS** before anything cosmetic: a defect there can double-book a slot, take a deposit without an appointment, or refund the wrong amount, and those are the failures that damage customer trust and the salon's cash position. Next run **ADMIN-APPOINTMENTS**, **ADMIN-CALENDAR**, **ADMIN-SALON**, and **STAFF-PANEL**, because they decide whether the team can actually run a normal day and recover from an absence. Then cover **PUBLIC-MANAGE**, **PUBLIC-CONSENT**, **PUBLIC-I18N**, and **MOBILE**, which affect self-service, legal exposure, and the majority of real visitors. **ADMIN-TEAM**, **ADMIN-FINANCE**, **ADMIN-SETTINGS**, and **PUBLIC-HOME/SERVICES/PRODUCTS/CONTACT** follow, since their failures are usually recoverable by an admin. Leave **ADMIN-ACTIVITY**, **PUBLIC-LEGAL**, and the remaining polish cases for the end, but do not treat the placeholder legal pages as cosmetic: they are a compliance gap that should be resolved before launch even though they are expected to "pass" as graceful placeholders. Any FAIL in SECURITY, PUBLIC-PAYMENT, or PUBLIC-BOOKING should block release; a FAIL in MOBILE or PUBLIC-I18N can ship only with a documented, dated decision.

## Coverage note

The cases were derived from the public pages, all admin pages and panels, the Prisma schema, and the shared booking, permission, payment, refund, reminder, and notification utilities. The following supporting server areas were not read line by line and are covered through their UI and shared logic rather than endpoint-by-endpoint inspection: the admin settings handlers, expense and expense-category handlers, banner and announcement handlers, inbox handlers, studio-closure handlers, customer mail templates and mailer transport, and the rate-limit middleware. Where a case depends on those areas, the expected result is stated at the behaviour level and should be confirmed against the running environment. No `[?]` markers were needed because no case relies on an unread page or panel.
