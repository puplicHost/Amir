# Phase 06: Public Pages, Homepage & Settings

## Phase Identity
- **Phase number:** 06
- **Phase name:** Public Pages & Settings
- **Source phase document:** `phase-06-public-settings.md`
- **Dependencies:** Phase 01, Phase 02, Phase 03, Phase 05
- **Position in overall project:** 6th and final phase. Ties everything together into a deployable application.

## Objective
Complete the public-facing website: fully built Homepage with real data, Contact page, global Navbar, Footer, and the Admin Settings panel (General, Contact, SEO/GEO, Store Config).

## Scope
- Homepage (`/`) with Hero, Services, Featured Categories, Banner, Contact.
- Contact Page (`/contact`).
- Global Navbar and Footer populated with real DB data.
- Admin Settings Panel (4 tabs).
- Error pages (404, 500).
- SEO/GEO meta tags and JSON-LD schema.

## Explicitly Out of Scope
- Major redesigns contrary to the approved Stitch design.

## Requirements
- **Confirmed:** Homepage pulls active services and featured categories.
- **Confirmed:** Settings API responses are cached (e.g., 60 seconds).
- **Confirmed:** JSON-LD implemented for Organization and Products.
- **Confirmed:** Admin can upload logo, favicon, and hero image.

## User Impact
Users get a fully functional, branded experience. Admins gain total control over the site's metadata, contact information, and branding assets.

## Architecture Impact
Completes the integration of all modules. Adds API caching layer for settings.

## Dependencies
- **Previous phases required:** Phase 03 (Categories), Phase 05 (Services).
- **External dependencies:** Google Maps (optional iframe).

## Risks
- Uncached settings API calls slowing down every page load.
- Broken responsive layouts on complex homepage grids.

## Human Decisions
- Final review of the site against the Stitch design.

## Acceptance Criteria
- Homepage hero with configured headline and CTA buttons renders
- Homepage Services section shows active services (real data)
- Homepage Featured Categories shows admin-selected categories (real data)
- Homepage Banner section renders
- Homepage Contact section shows real contact info
- Contact page shows all configured contact methods with functional links
- Footer shows logo, links, and contact info
- Navbar products dropdown shows "All Products" + active categories
- Logo renders in navbar from uploaded file (or falls back to text)
- SEO meta tags and OG tags render on product landing pages
- JSON-LD Organization schema present on homepage
- JSON-LD Product schema present on product landing pages
- Admin Settings all tabs save correctly
- Logo upload works and immediately reflects in navbar
- 404 page is branded
- AR version of homepage is fully RTL

## Definition of Done
The project is complete when the homepage loads dynamically, all settings can be modified by the admin, SEO schemas are present, and the application matches the Stitch design.