# Booking Page Bug — `No stylists are currently bookable online`

**Route:** `/booking/damen-waschen-foehnen-kurz` (service: *Waschen, Föhnen, kurz*)
**Date:** 2026-10-19
**Environment:** local dev DB (`localhost:5439/amir`) + fresh dev server on
`localhost:3010` (process started for this investigation only). The pre-existing
server on `:3000` was not touched.

## Verdict

**BLOCKED — the root cause is missing dev data (zero `STAFF` users), not a code
regression.** The page and APIs are wired correctly: with one bookable staff
member configured, the UI shows the stylist and 35/35 selectable slots.

A code-side defect *was* found and **FIXED**: when no staff are configured,
`/api/availability` returned a full grid of `available:false` slots, which the UI
rendered as every appointment being **“Booked”**. It now returns an empty grid,
so the page shows the “no stylists” message instead of a misleading wall of
“Booked” buttons.

Temporary staff rows used for verification were **deleted afterwards**. No real
booking, payment, or permanent data change was made.

## Root-cause evidence (read-only)

1. Database (`prisma`, dev DB):
   - Service `damen-waschen-foehnen-kurz`: `isActive=true`, `durationMin=30`.
   - **`adminUser` with `role='STAFF': 0`.**
   - Salon hours Mon–Sat 09:00–18:00, Sunday closed.
   - `prisma/seed.mjs` / `seed-admin.mjs` create only an **ADMIN** account; no
     seed creates staff.
2. Data flow traced:
   - `app/pages/booking/[slug].vue:74` → `GET /api/staff?service=<slug>`.
   - `server/api/staff/index.get.ts:16` → `getBookableStaff(serviceId)`.
   - `server/utils/staff-availability.ts:49` filters
     `role:'STAFF' AND isActive:true`, then skips
     `staffProfile.isBookable===false` and staff whose `staffServices` mapping
     excludes the service.
   - With zero STAFF rows this returns `[]` → UI renders
     `booking.noStaff` (`[slug].vue:290`).
   - `GET /api/availability?...&staff=any` then computed availability across an
     empty staff set.
3. Actual API responses **before** the fix (0 staff):
   - `/api/staff?service=damen-waschen-foehnen-kurz` → `{ "staff": [] }`
   - `/api/availability?service=…&date=2026-10-20&staff=any` →
     `staffOptions: 0`, `slots: 35`, `available: 0`
   - Browser: “No stylists…” visible, **35 slot buttons, 0 enabled**.

## Code fix

`server/api/availability.get.ts:100`

```ts
// No bookable staff => nobody can serve any slot. Return an empty grid rather
// than a full grid of "unavailable" slots, which the UI would mislabel as
// "Booked" (there is no booking — the salon simply has no staff configured).
if (eligible.length === 0) return empty('any', [])
```

Behavior change is presentational only: online booking was already impossible
with zero staff; it no longer claims every slot is booked.

## Verification (actual runtime)

Temporary fixture (created via Prisma, **removed after the run**): one
`role='STAFF'` user, `isActive=true`, `staffProfile{displayName:'QA Stylist',
isBookable:true}`, mapped to this service.

| Check | 0 staff (dev state) | 1 temporary staff |
|---|---|---|
| `/api/staff` count | 0 | 1 |
| Availability slots / available | 0 / 0 (after fix) | 35 / 35 |
| “No stylists…” message | visible | hidden |
| Stylist chip visible / clickable | — | yes / `aria-checked="true"` |
| Enabled slot buttons | 0 | 35 |
| Click slot → selected (`bg-accent`) | — | yes |
| Console errors | none | none |

Browser automation: Playwright (existing Python install + cached Chromium; no
new dependency). Screenshots:
`/tmp/opencode/booking-before.png` (0 staff, fixed empty state) and
`/tmp/opencode/booking-after.png` (staff + selectable slots).

Regression: `verify-race` (staff selection, availability privacy, time-off,
half-open intervals, concurrency) — **all scenarios pass, 0 failures** on the
same server after the change.

## Required configuration (the actual blocker)

Online booking requires at least one **active `STAFF` user**. Exact steps:

1. Admin → **Users** → create a user with role **STAFF** (or change an existing
   user’s role to STAFF) and keep the account active.
2. Admin → **Staff** → select that user → ensure **Bookable** is checked
   (`isBookable`), optionally assign the services they perform (no service rows
   = bookable for all services). Schedule inherits salon hours unless overridden.
3. Reload `/booking/<service-slug>`: the stylist appears and free slots become
   selectable.

No production data was invented or left behind: after cleanup the dev DB again
has **0 STAFF users**, and the temporary server on `:3010` was stopped.

## Not done (by design)

- No real booking was submitted and no payment gateway was called.
- No permanent staff/booking/settings data was created or modified.
- Git history/reset/checkout/bulk deletes were not used.
