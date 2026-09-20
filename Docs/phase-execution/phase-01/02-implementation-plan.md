# Implementation Plan: Phase 01 - Foundation

## Architecture
- **Modules:** Nuxt 3 application with integrated Nitro server.
- **Responsibilities:** Provide the root application context, layout shells, theme management, i18n routing, and database connection.
- **Dependencies:** PostgreSQL (via Docker), Prisma.
- **Data flow:** App starts -> Prisma connects to DB -> Nitro exposes `/api/health` -> Nuxt renders pages using i18n and Tailwind tokens.

## Frontend
- **Nuxt configuration:** Add i18n, Tailwind, and shadcn-vue modules.
- **Layouts:**
  - `layouts/default.vue`: Public layout wrapping `AppNavbar` and `AppFooter`.
  - `layouts/admin.vue`: Admin layout wrapping `AdminSidebar` and top bar.
- **Components:** 
  - `components/app/AppNavbar.vue`
  - `components/app/AppFooter.vue`
  - `components/admin/AdminLayout.vue`
  - `components/admin/AdminSidebar.vue`
- **Pages:**
  - `pages/index.vue` (skeleton public homepage)
  - `pages/admin/index.vue` (skeleton admin dashboard)
- **State management:** Locale preference (cookie), Theme preference (localStorage/cookie).
- **Responsive behavior:** Navbar and Sidebar need mobile placeholders.

## Google Stitch / Design System
- **Design tokens:** 
  - `primary-dark`: #285E8E
  - `primary`: #2B71AE
  - `accent`: #F5CC07
- **Typography:** Archive (Headings), Inter (Body LTR), Cairo (Body RTL).
- **Dark mode:** Tailwind `class` strategy.

## Backend
- **Nitro server routes:**
  - `server/api/health.get.ts` returning `{ status: 'ok' }`.
- **Database initialization on startup:** Verify Prisma client connection.

## Database
- **Prisma models:** None. Empty `schema.prisma` with `datasource db` pointing to PostgreSQL.
- **Migrations:** `prisma migrate dev` should run and create a baseline empty database.

## API
- **Endpoint:** `GET /api/health`
- **Authentication:** None.
- **Response shape:** `{ "status": "ok" }`

## Security
- Avoid hardcoding database URLs. Use `.env`.
- Ensure standard Nuxt security headers if applicable.

## Storage
- No active storage requirements in this phase.

## Skills
```text
Skill: frontend-design
Purpose: To properly implement Tailwind tokens, dark mode, and typography.
Used for: Setting up tailwind.config.ts and css variables.
Phase tasks: UI Shell configuration.

Skill: codebase-design
Purpose: Establish scalable Nuxt directory structure.
Used for: Scaffolding layouts, components, server routes.
Phase tasks: File creation and Docker setup.
```

## Implementation Order
1. Scaffold Nuxt 3 project and directory structure.
2. Setup Docker and `docker-compose.yml` for Node and PostgreSQL.
3. Initialize Prisma and test database connection.
4. Implement Nitro `/api/health`.
5. Install and configure Tailwind, shadcn-vue, and custom CSS design tokens.
6. Configure Nuxt i18n for AR/EN and RTL/LTR support.
7. Build global layout shells (`AppNavbar`, `AppFooter`, `AdminSidebar`).
8. Create skeleton pages (`/` and `/admin`).
9. Verification of all environments and toggles.

## Verification
- Basic Verification:
  - Run `docker compose up`.
  - Hit `http://localhost:3000/api/health` (verify 200 OK).
  - Open homepage; toggle EN/AR and verify layout RTL/LTR changes.
  - Toggle Dark/Light mode and verify CSS changes.
  - Check browser console for errors.