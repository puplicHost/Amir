# Coding Agent Instructions: Phase 02 - Auth & Admin Shell

## Phase Command
Implement Phase 02 — Auth & Admin Shell.

## Objective
Implement the complete database schema, session-based auth, RBAC, and the admin user management UI.

## Allowed Scope
- Modifying `schema.prisma` to include all project models.
- Writing DB seed script.
- Building backend auth logic (h3 sessions, bcrypt).
- Building backend User Management CRUD APIs.
- Creating Nuxt route middleware for admin protection.
- Building `/admin/login`, `/admin/users`, and updating `/admin` shell.

## Forbidden Scope
- Do not build public-facing pages.
- Do not implement product/category management logic yet.
- Do not integrate real payment gateways.

## Required Skills
- `security-best-practices`
- `api-security-review`

## Frontend Tasks
- Build `/admin/login` page.
- Build `/admin/users` page with table and modal forms.
- Create `AdminPermissionGate.vue` component.
- Implement `admin-auth.ts` middleware.
- Update `AdminSidebar.vue` to respect permissions.

## Backend Tasks
- Create session utilities using h3.
- Build auth endpoints (login, logout, session).
- Build user management APIs.
- Enforce permissions via `requirePermission` utility.

## Database Tasks
- Define ALL models as specified in `phase-02-auth-admin.md`.
- Run migration.
- Write `prisma/seed.ts` for super-admin and `SiteSettings`.

## API Tasks
- Validate login payload.
- Return 401/403 for unauthorized access.
- Filter out password hashes from responses.

## Security Tasks
- Bcrypt for passwords.
- HTTP-only cookies for sessions.
- RBAC checks on every protected endpoint.

## UI/UX Tasks
- Follow approved admin design system constraints.

## Business Rules
- Only `users.manage` permission holders can manage users.
- Super-admin cannot be deleted.
- Deactivated users have sessions invalidated.

## Validation
- Email format validation.
- Password strength validation (e.g. min 8 chars).

## Error Handling
- Display clear error on invalid login.
- Handle 403 gracefully in frontend if a user navigates to an unauthorized route.

## Verification
- Seed runs cleanly.
- Login creates session.
- Unauthorized API calls fail.
- Sidebar reflects permissions.

## Acceptance Criteria
- [ ] Prisma schema covers all entities (as specified)
- [ ] Migrations run cleanly
- [ ] Seed creates super-admin with all permissions
- [ ] Default SiteSettings row seeded
- [ ] Admin can log in at `/admin/login`
- [ ] Auth cookie is HTTP-only
- [ ] Session middleware protects all `/admin/**` routes
- [ ] User without permission receives 403 from gated API
- [ ] Admin sidebar hides nav items based on permissions
- [ ] User management CRUD works (create, edit permissions, deactivate)
- [ ] Logout clears session
- [ ] No passwords or gateway credentials returned in API responses

## Completion Criteria
Stop when all Acceptance Criteria are met, the database is fully seeded, auth works securely, and User Management CRUD operates correctly.

## Human Approval Points
- None required to complete this phase.

## Do Not
- Do not implement future phases.
- Do not redesign approved UI.
- Do not perform heavy testing automatically.
- Do not return sensitive data in APIs.