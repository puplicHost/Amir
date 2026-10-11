# Phase 01: Foundation

## Phase Identity
- **Phase number:** 01
- **Phase name:** Foundation
- **Source phase document:** `phase-01-foundation.md`
- **Dependencies:** None
- **Position in overall project:** 1st phase. This sets up the foundational skeleton that all subsequent phases build upon.

## Objective
Establish the complete project skeleton: Nuxt 3, Nitro, Prisma, PostgreSQL, Docker, configured for bilingual RTL/LTR support, light/dark mode, shadcn-vue, Tailwind with the Amir design system tokens, and Nuxt i18n. This phase produces a running, correctly structured base with no business features.

## Scope
- Project scaffolding (Nuxt 3, Nitro, Prisma, PostgreSQL, Docker)
- Design system token setup (colors, typography, spacing, radius)
- shadcn-vue installation and theme configuration
- Tailwind CSS configuration aligned to design system
- Nuxt i18n setup (AR/EN, RTL/LTR)
- Dark/Light mode implementation
- Global layout components (Navbar shell, Footer shell, Admin layout shell)
- Environment configuration (.env structure, Docker Compose)
- Project directory structure
- Health check API and database connection verification

## Explicitly Out of Scope
- Any business features
- Actual page content
- Database models (only the connection is established)
- Functional APIs beyond `/api/health`
- Payment setup
- User auth setup

## Requirements
- **Confirmed:** Nuxt 3, Nitro, Prisma, PostgreSQL, Docker stack.
- **Confirmed:** Bilingual AR/EN support with correct RTL/LTR directionality.
- **Confirmed:** Light/Dark mode via Tailwind class strategy.
- **Confirmed:** Design tokens derived from Stitch and brand palette (Archive, Inter, Cairo fonts).
- **Confirmed:** `AppNavbar.vue`, `AppFooter.vue`, `AdminLayout.vue`, `AdminSidebar.vue` skeletons.

## User Impact
Users and admins will see a styled skeleton homepage and an admin layout shell that respects language and theme preferences. No features will be functional yet, but the look and feel (typography, colors, layout structure) will be established.

## Architecture Impact
This phase creates the core Dockerized deployment topology, the Nuxt/Nitro file structure, the Prisma ORM initialization, and the CSS/Tailwind theming foundation. 

## Dependencies
- **Previous phases required:** None
- **Future phases depending on this phase:** All phases (02 to 06)
- **External dependencies:** Docker, PostgreSQL image
- **Design dependencies:** Brand design system (Colors, Typography)

## Risks
- Incorrect design token configuration might lead to inconsistent UI in later phases.
- i18n and RTL layout issues if not set up globally at this stage.

## Human Decisions
- None required for this structural skeleton, provided the design system tokens are strictly followed.

## Acceptance Criteria
- Docker Compose starts app + database cleanly
- `/api/health` returns `{ status: 'ok' }`
- Prisma connects to PostgreSQL
- Homepage renders in EN (LTR)
- Homepage renders in AR (RTL) — layout flips correctly
- Dark mode works: toggle switches CSS variables
- Language toggle persists across navigation
- Archive font applied to headings
- Cairo font applied to Arabic body text
- Brand colors (#2B71AE, #285E8E, #F5CC07) visible in design system
- No console errors or TypeScript errors

## Definition of Done
The phase is considered complete when the Nuxt application runs in Docker, successfully connects to PostgreSQL, renders the skeleton pages without console errors in both AR and EN, and passes the basic verification steps. Heavy testing is not required.