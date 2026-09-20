# Implementation Plan: Phase 02 - Auth & Admin Shell

## Architecture
- **Modules:** Auth module (session, login, logout), User Management module.
- **Responsibilities:** Guard all admin routes and APIs, provide RBAC checks, define full DB schema.
- **Dependencies:** `h3` sessions, `bcrypt`.

## Frontend
- **Nuxt pages:**
  - `/admin/login`: Login form.
  - `/admin`: Dashboard shell with 4 stat widgets (static data for now).
  - `/admin/users`: User management table and create/edit modal.
- **Components:**
  - `AdminPermissionGate.vue`: Conditionally renders children.
  - `AdminStatCard.vue`: Reusable widget.
- **Middleware:** `admin-auth.ts` (redirects to login if no session).

## Google Stitch / Design System
- Login page should be a minimal centered card.
- User management table should follow standard Admin table designs (clean, clear actions).

## Backend
- **Auth Utilities:** `server/utils/auth.ts` -> `requireAuth()`, `requirePermission(permission)`.
- **Password Utilities:** `server/utils/password.ts` -> bcrypt wrappers.
- **Nitro Routes:**
  - `POST /api/admin/auth/login`
  - `POST /api/admin/auth/logout`
  - `GET /api/admin/auth/session`
  - CRUD for `/api/admin/users`

## Database
- **Prisma models:** `AdminUser`, `AdminPermission`, `Category`, `Product`, `ProductImage`, `ProductAttribute`, `ProductSeo`, `Order`, `OrderItem`, `OrderStatusHistory`, `Service`, `ServiceFormField`, `ServiceRequest`, `ServiceRequestValue`, `ServiceRequestAttachment`, `SiteSettings`.
- **Migrations:** Generate initial migration containing the entire schema.
- **Seed:** Create super-admin and `SiteSettings` ID 1.

## API
- Endpoints documented in Overview. Return 401 for unauthorized, 403 for forbidden. 
- Omit password hashes from user GET responses.

## Security
- Passwords must be hashed using bcrypt.
- Payment gateway credentials in `SiteSettings` (even if not used yet) must be marked as encrypted or handled carefully if seeded.
- APIs require strict permission checks.

## Skills
```text
Skill: security-best-practices
Purpose: Implement secure password hashing, sessions, and RBAC.
Used for: Auth endpoints and utilities.
Phase tasks: Login, Session persistence, Permission gating.

Skill: api-security-review
Purpose: Validate that all admin endpoints are properly protected.
Used for: Reviewing backend endpoints.
Phase tasks: Nitro routing.
```

## Implementation Order
1. Define complete Prisma schema in `schema.prisma`.
2. Generate migration and write `seed.ts`.
3. Implement password utilities (bcrypt).
4. Implement Nitro auth APIs (login, logout, session).
5. Implement server auth utilities (`requireAuth`, `requirePermission`).
6. Implement User Management CRUD APIs.
7. Build frontend login page and `admin-auth` middleware.
8. Build frontend User Management pages and permissions gate components.
9. Verify RBAC flow.

## Verification
- Basic Verification:
  - Seed runs successfully.
  - Login works and sets HTTP-only cookie.
  - Trying to access `/admin/users` without `users.manage` permission fails.
  - User creation encrypts password.