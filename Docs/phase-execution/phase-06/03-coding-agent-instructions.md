# Coding Agent Instructions: Phase 06 - Public Pages & Settings

## Phase Command
Implement Phase 06 — Public Pages, Homepage & Settings.

## Objective
Finalize the public-facing application by implementing the Homepage, Contact page, dynamic Navbar/Footer, Admin Settings, and SEO schema.

## Allowed Scope
- Homepage and Contact page implementation.
- Global Navbar and Footer updates.
- Admin Settings UI (4 tabs) and APIs.
- Error pages (404, 500).
- SEO/GEO meta tags and JSON-LD.

## Forbidden Scope
- Do not implement custom marketing features not specified (e.g., popups, newsletters).

## Required Skills
- `frontend-design`

## Frontend Tasks
- Build Homepage with 5 distinct sections.
- Build Contact page.
- Build `error.vue` for Nuxt.
- Build Admin Settings tabs (General, Contact, SEO/GEO, Store Config).
- Update global layouts to use real data.

## Backend Tasks
- Build Admin Settings endpoints (text fields + image uploads).
- Build Cached Public Settings endpoints.
- Ensure logo/favicon/hero images are served correctly from `/storage/settings/`.

## Database Tasks
- Update `SiteSettings` model if missing fields, migrate, and seed.
- Remember `SiteSettings` is a singleton (ID 1). Always use `upsert` or `update`.

## API Tasks
- Use `defineCachedEventHandler` for public settings APIs to prevent DB thrashing.

## Security Tasks
- Protect settings APIs with `settings.manage` and `settings.view`.

## UI/UX Tasks
- The Homepage must perfectly match the approved Stitch design.

## Business Rules
- If logo is missing, Navbar falls back to text.
- If hero image is missing, Homepage falls back to solid brand color.

## Validation
- Validate image uploads (images only, reasonable size limits).

## Error Handling
- Create branded 404 and 500 error pages.

## Verification
- Upload logo -> Verify navbar updates.
- Check Homepage in AR -> Verify RTL layout.
- Check source code for JSON-LD.

## Acceptance Criteria
- [ ] Homepage hero with configured headline and CTA buttons renders
- [ ] Homepage Services section shows active services (real data)
- [ ] Homepage Featured Categories shows admin-selected categories (real data)
- [ ] Homepage Banner section renders
- [ ] Homepage Contact section shows real contact info
- [ ] Contact page shows all configured contact methods with functional links
- [ ] Footer shows logo, links, and contact info
- [ ] Navbar products dropdown shows "All Products" + active categories
- [ ] Logo renders in navbar from uploaded file (or falls back to text)
- [ ] SEO meta tags and OG tags render on product landing pages
- [ ] JSON-LD Organization schema present on homepage
- [ ] JSON-LD Product schema present on product landing pages
- [ ] Admin Settings all tabs save correctly
- [ ] Logo upload works and immediately reflects in navbar
- [ ] 404 page is branded
- [ ] AR version of homepage is fully RTL

## Completion Criteria
Stop when all Acceptance Criteria are met. The application is now considered complete.

## Human Approval Points
- Final visual review against Stitch designs.

## Do Not
- Do not forget to cache public settings.
- Do not leave placeholder text in the final build unless specifically instructed.