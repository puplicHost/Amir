# Phase 02: Auth & Admin Shell

## Phase Identity
- **Phase number:** 02
- **Phase name:** Auth & Admin Shell
- **Source phase document:** `phase-02-auth-admin.md`
- **Dependencies:** Phase 01 (Foundation)
- **Position in overall project:** 2nd phase. Establishes security, RBAC, and the full database schema.

## Objective
Implement the complete database schema, admin authentication with permission-based access control, and the functional Admin Panel shell with protected routing. Authorized admins can log in, see the dashboard shell, and navigate the sidebar.

## Scope
- Complete Prisma database schema (all models)
- Admin user model + password hashing
- Permission model
- Session-based authentication (Nuxt server sessions via h3)
- Admin login page
- Protected admin route middleware
- Permission-gated sidebar navigation
- Admin Dashboard shell (static layout, no real data yet)
- User Management page (CRUD)
- Database seed: initial super-admin user and default settings row

## Explicitly Out of Scope
- Public pages
- Product/order/service business logic
- Payment integration logic

## Requirements
- **Confirmed:** Complete Prisma Schema including Categories, Products, Orders, Services, SiteSettings, and Admin users.
- **Confirmed:** Session-based auth via HTTP-only cookies.
- **Confirmed:** Bcrypt password hashing.
- **Confirmed:** Granular permissions (`products.create`, `orders.view`, etc.).
- **Confirmed:** Super-admin seed.
- **Extracted:** Payment credentials in `SiteSettings` must be encrypted.

## User Impact
Admins can securely log in. Staff users see limited views based on permissions. Public users are unaffected (no public pages built yet).

## Architecture Impact
Database schema is locked. Auth middleware and session management utilities are established in Nitro. Nuxt route middleware controls access.

## Dependencies
- **Previous phases required:** Phase 01
- **Future phases depending on this phase:** Phases 03-06
- **External dependencies:** PostgreSQL, Prisma
- **Data dependencies:** Seed data required for super admin.

## Risks
- Incorrect session handling could lead to security vulnerabilities.
- Missing permissions check could expose admin APIs.

## Human Decisions
- TBD: Exact list of permissions (initial list provided in planning, human approval on final list).

## Acceptance Criteria
- Prisma schema covers all entities (as specified)
- Migrations run cleanly
- Seed creates super-admin with all permissions and default SiteSettings row
- Admin can log in at `/admin/login`
- Auth cookie is HTTP-only
- Session middleware protects all `/admin/**` routes
- User without permission receives 403 from gated API
- Admin sidebar hides nav items based on permissions
- User management CRUD works (create, edit permissions, deactivate)
- Logout clears session
- No passwords or gateway credentials returned in API responses

## Definition of Done
The phase is complete when the database contains all tables, a super-admin can log in and manage other users, and all `/admin` routes and APIs are securely protected behind session and permission checks.