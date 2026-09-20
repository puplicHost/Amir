# Implementation Plan: Phase 06 - Public Pages & Settings

## Architecture
- **Modules:** Site Settings, Global Layout, Homepage, SEO.
- **Responsibilities:** Centralize site configuration and render the main landing pages.
- **Data flow:** Admin Settings -> DB (Singleton) -> API (Cached) -> Nuxt Global State -> Navbar/Footer/Homepage.

## Frontend
- **Pages:**
  - `pages/index.vue`
  - `pages/contact.vue`
  - `error.vue`
  - `/admin/settings`
- **Components:**
  - Replace shell components (`AppNavbar`, `AppFooter`) with data-driven components.
  - Homepage sections (`HeroSection`, `ServicesGrid`, `FeaturedCategories`, `Banner`, `ContactSection`).
- **State:** Use `useAsyncData` to fetch settings at the layout level and inject into components.

## Google Stitch / Design System
- This phase brings the core Stitch designs to life. Strictly adhere to the visual hierarchy, spacing, and typography of the homepage.

## Backend
- **APIs:**
  - Admin: `PUT` / `POST` endpoints for settings and image uploads.
  - Public: `GET /api/settings/...` (Use `defineCachedEventHandler` with `maxAge: 60`).
- **Storage:**
  - `/storage/settings/` for logo, favicon, and hero image.

## Database
- Add any missing fields to `SiteSettings` (e.g., `heroImagePath`, `bannerText`, SEO fields).
- Ensure the seed script populates default values.

## Security
- Settings management requires `settings.manage` permission.

## SEO
- Inject JSON-LD using `useHead` in `app.vue` (Organization) and `/p/[slug].vue` (Product).
- Meta tags dynamically pulled from settings.

## Skills
```text
Skill: frontend-design
Purpose: Implementing complex homepage layouts.
Used for: Homepage components.
Phase tasks: Vue component creation.

Skill: copywriting
Purpose: (If needed) To ensure fallback text in seed is professional.
Used for: Seed script.
Phase tasks: Database seeding.
```

## Implementation Order
1. Update `SiteSettings` Prisma model if necessary, run migration, update seed.
2. Build Backend Admin Settings APIs (CRUD + File Uploads).
3. Build Admin Settings UI.
4. Build Backend Public Cached Settings APIs.
5. Update Nuxt layouts (`default.vue`, `AppNavbar`, `AppFooter`) to consume real settings data.
6. Build Homepage UI components.
7. Build Contact Page UI.
8. Implement SEO meta tags and JSON-LD logic.
9. Implement Error pages (`error.vue`).

## Verification
- Basic Verification:
  - Update site name in admin -> verify Navbar updates immediately (or within cache window).
  - Check page source for JSON-LD scripts.
  - Ensure RTL flips correctly on the homepage.