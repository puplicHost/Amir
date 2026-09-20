# Coding Agent Instructions: Phase 01 - Foundation

## Phase Command
Implement Phase 01 — Foundation.

## Objective
Scaffold the Nuxt 3 + Nitro + Prisma + PostgreSQL project in Docker, fully configured with i18n (AR/EN), Tailwind, shadcn-vue, dark mode, and design system tokens.

## Allowed Scope
- Initializing Nuxt 3 project.
- Setting up Docker and `docker-compose.yml`.
- Setting up Prisma and an empty `schema.prisma`.
- Configuring Tailwind CSS and `assets/css/main.css` for design tokens.
- Configuring `@nuxtjs/i18n` for English and Arabic.
- Implementing dark/light mode toggle.
- Creating shell layouts (`default.vue`, `admin.vue`) and components (`AppNavbar.vue`, `AppFooter.vue`, `AdminSidebar.vue`).
- Creating skeleton pages (`pages/index.vue`, `pages/admin/index.vue`).
- Creating `server/api/health.get.ts`.

## Forbidden Scope
- Do not implement any business logic.
- Do not create Prisma models (tables).
- Do not build actual authentication logic.
- Do not implement the real homepage content or any product logic.

## Required Skills
- `frontend-design`
- `codebase-design`

## Frontend Tasks
- Add Tailwind CSS and configure `primary-dark`, `primary`, and `accent` colors.
- Setup `assets/css/main.css` with CSS variables for light and dark modes according to the design system.
- Setup typography: `Archive`, `Inter`, `Cairo`.
- Setup i18n with route prefixes (`/ar/...` for Arabic, default for English).
- Bind `dir="rtl"` to HTML when Arabic is selected.
- Create theme toggle and language toggle components.
- Build layout shells with placeholders.

## Backend Tasks
- Create a basic Nitro endpoint at `/api/health`.

## Database Tasks
- Initialize Prisma with PostgreSQL provider.
- Configure `.env` and `docker-compose.yml` to spin up a PostgreSQL 16 container.

## API Tasks
- `GET /api/health` -> `{ "status": "ok" }`.

## UI/UX Tasks
- Follow the approved design system tokens.
- Ensure proper visual hierarchy in the skeleton layout.

## Business Rules
- NA for this phase.

## Validation
- Ensure `.env.example` is documented.
- Ensure Docker containers spin up without errors.

## Error Handling
- Server should crash loudly if DB is unreachable on startup (or log properly).

## Verification
- Start the application.
- Verify 200 OK from `/api/health`.
- Render homepage in LTR and RTL.
- Switch between dark and light modes.
- Confirm zero browser console errors.
- Confirm zero TypeScript build errors.

## Acceptance Criteria
- [ ] Docker Compose starts app + database cleanly
- [ ] `/api/health` returns `{ status: 'ok' }`
- [ ] Prisma connects to PostgreSQL
- [ ] Homepage renders in EN (LTR)
- [ ] Homepage renders in AR (RTL) — layout flips correctly
- [ ] Dark mode works: toggle switches CSS variables
- [ ] Language toggle persists across navigation
- [ ] Archive font applied to headings
- [ ] Cairo font applied to Arabic body text
- [ ] Brand colors (#2B71AE, #285E8E, #F5CC07) visible in design system
- [ ] No console errors or TypeScript errors

## Completion Criteria
Stop when all Acceptance Criteria are met, the Docker environment runs perfectly, and basic verification succeeds. Provide a concise completion message.

## Human Approval Points
- None required to complete this phase.

## Do Not
- Do not implement future phases.
- Do not expand scope.
- Do not invent requirements.
- Do not redesign approved Stitch UI.
- Do not perform Git/GitHub operations.
- Do not perform heavy testing automatically.
- Do not add unnecessary dependencies.
- Do not claim completion without verification.