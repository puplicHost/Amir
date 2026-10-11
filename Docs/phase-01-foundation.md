# Phase 1 — Foundation

## 1. Overview

Establish the complete project skeleton: Nuxt 3 + Nitro + Prisma + PostgreSQL + Docker, configured for bilingual RTL/LTR support, light/dark mode, shadcn-vue, Tailwind with the Amir design system tokens, and i18n. This phase produces no business features — it produces a running, correctly structured base that every subsequent phase builds on.

## 2. Objective

When this phase completes, the development team can start any Phase 2+ task without foundational blockers. The app runs in Docker, connects to the database, renders a skeleton homepage in both Arabic and English, and applies the Amir color palette and typography.

## 3. Scope

- Project scaffolding (Nuxt 3, Nitro, Prisma, PostgreSQL, Docker)
- Design system token setup (colors, typography, spacing, radius)
- shadcn-vue installation and theme configuration
- Tailwind CSS configuration aligned to design system
- Nuxt i18n setup (AR/EN, RTL/LTR)
- Dark/Light mode implementation
- Global layout components (Navbar shell, Footer shell, Admin layout shell)
- Environment configuration (.env structure, Docker Compose)
- Project directory structure

**Out of scope:** Any business features, actual page content, database models, or APIs.

## 4. Required Frontend Work

### Layout Components
- `AppNavbar.vue` — public navbar shell: logo placeholder, nav links placeholder, language toggle, dark/light toggle, cart icon placeholder
- `AppFooter.vue` — footer shell with contact info placeholders
- `AdminLayout.vue` — admin sidebar + top bar shell
- `AdminSidebar.vue` — sidebar navigation shell

### Design System Setup
- Configure Tailwind `tailwind.config.ts` with:
  - Brand colors: `primary-dark (#285E8E)`, `primary (#2B71AE)`, `accent (#F5CC07)`
  - Extended type scale from design system
  - Dark mode: `class` strategy
- Configure CSS variables in `assets/css/main.css` for light/dark tokens
- Load fonts: `Archive` (for headings) + `Inter` (for body) + `Cairo` (for Arabic body)

### i18n
- Install and configure `@nuxtjs/i18n`
- AR and EN locale files: `locales/ar.json`, `locales/en.json`
- Route strategy: prefix for AR (`/ar/...`), default for EN
- RTL direction: apply `dir="rtl"` and `lang="ar"` on HTML element when locale is AR
- Language toggle component: switches locale, persists in cookie

### Dark Mode
- Toggle component: reads/sets class on `<html>`, stores in localStorage
- Respects `prefers-color-scheme` as default on first visit

### Skeleton Pages
- `/` — empty homepage shell with Navbar + Footer
- `/admin` — empty admin shell with AdminLayout

## 5. Required Backend / Nitro Work

- Nitro server starts cleanly
- Health check endpoint: `GET /api/health` → `{ status: 'ok' }`
- Database connection test on startup (Prisma)

## 6. Required Database Work

- Prisma initialized with PostgreSQL provider
- Initial `schema.prisma` with no models yet (just connection)
- `prisma migrate dev` runs cleanly
- Database reachable from Nitro via env variable

## 7. API Requirements

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/health` | GET | Confirm server + DB running | None |

## 8. UI Requirements

- Amir color palette visible on skeleton page
- Archive font rendering for headings
- Cairo font rendering when locale is AR
- Dark mode toggle works: switches between dark/light CSS variable sets
- Language toggle works: switches between AR (RTL) and EN (LTR)
- Logo area in navbar shows text "Amir" or placeholder until logo asset is integrated

## 9. Business Rules

None in this phase.

## 10. Implementation Guidelines

### Project Structure
```
/
├── assets/
│   └── css/main.css          # CSS variables, font imports
├── components/
│   ├── app/                  # AppNavbar, AppFooter
│   └── admin/                # AdminSidebar, AdminLayout
├── layouts/
│   ├── default.vue           # Public layout
│   └── admin.vue             # Admin layout
├── locales/
│   ├── ar.json
│   └── en.json
├── pages/
│   ├── index.vue
│   └── admin/
│       └── index.vue
├── server/
│   └── api/
│       └── health.get.ts
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

### Docker Compose
- `app` service: Nuxt/Node
- `db` service: PostgreSQL 16
- `DATABASE_URL` env var wired through

### Environment Variables (.env.example)
```
DATABASE_URL=postgresql://...
NUXT_SESSION_SECRET=...
NODE_ENV=development
```

### Tailwind Dark Mode
Use `darkMode: 'class'` in Tailwind config. All dark variants via `dark:` prefix.

## 11. Required Skills

- `frontend-design` — for applying design system tokens correctly
- `codebase-design` — for establishing the directory structure

## 12. Testing Requirements

### Basic Verification
- App starts without errors in Docker
- `/api/health` returns 200
- Database connection succeeds on startup
- Homepage renders in EN (LTR) without console errors
- Homepage renders in AR (RTL) without console errors
- Dark mode toggle switches theme correctly
- Font loading verified in browser (Archive, Inter, Cairo)

### Heavy Testing
*Requires Human Approval before running.*

## 13. Acceptance Criteria

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

## 14. Phase Completion Criteria

- Implementation complete
- Basic verification complete
- No known blocking errors
- Acceptance criteria satisfied
- Heavy testing pending human approval
