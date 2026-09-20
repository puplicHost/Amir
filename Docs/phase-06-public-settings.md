# Phase 6 — Public Pages, Homepage & Settings

## 1. Overview

Complete the public-facing website: fully built Homepage, Contact page, global Navbar with real data, Footer with real contact info, and the Admin Settings panel (General, Contact, SEO/GEO, Store Config). The site becomes a finished, deployable product after this phase.

## 2. Objective

The public site is complete. The Homepage pulls real data (featured categories, active services). The Footer and Contact page show real contact info from Settings. Admins can update all configurable site information without developer involvement. The site is ready for Stitch design review and production build.

## 3. Scope

**Public:**
- Complete Homepage (all sections, real data)
- Contact page
- 404 and error pages
- Global Navbar (real data — dynamic category dropdown, logo from settings)
- Global Footer (real data — contact info from settings)

**Admin Settings (complete):**
- General settings tab (site name, tagline, logo, favicon)
- Contact settings tab (phone, WhatsApp, email, address, social links)
- SEO/GEO settings tab
- Store Config tab (currency, pagination)

**Out of scope:** Payment settings (Phase 4). User Management (Phase 2). Heavy redesign work — this phase implements the approved Stitch design.

**Important:** Frontend implementation in this phase must follow the Stitch design approved before this phase starts. The Coding Agent does not invent the visual design.

## 4. Required Frontend Work

### Homepage (`/`)

**Hero Section**
- Full-width, viewport-height or configured height
- Background image (from Settings — site hero image, TBD field) with dark overlay
- Centered content:
  - Headline (AR/EN from Settings)
  - Tagline (AR/EN from Settings)
  - Two CTA buttons: "Shop Now" (→ `/products`) and "Our Services" (→ `/services`)
- Mobile: same layout, smaller text, buttons stack vertically

**Services Section**
- Section heading (locale)
- Grid: 3 per row desktop, 2 per row mobile
- Service cards: icon/image, name, short description, link to `/services#[service-anchor]`
- Data: from `GET /api/services` (active only)

**Featured Categories Section**
- Section heading
- Grid: 3 per row desktop (full-bleed cards), 1 or 2 on mobile
- Category cards: cover image background, gradient overlay, category name, "Shop" link → `/products/[slug]`
- Data: from `GET /api/categories/featured`

**Site Banner Section**
- Promotional banner — content from Settings (banner text AR/EN, button text, button URL, background image)
- Full-width, visually distinct from other sections

**Contact Section**
- Phone number(s) with call links
- WhatsApp button
- Address / governorate
- Social media icon links
- Data: from `GET /api/settings/contact`

**Footer**
- Logo
- Site name + tagline
- Quick links: Home, Products, Services, Contact
- Contact info: phone, WhatsApp, email
- Social media links
- Copyright line: "© [year] Mango Electronics"
- Language: current locale label
- Data: from `GET /api/settings/contact` (cached)

### Navbar (complete)
- Logo: rendered from Settings logo path (fallback to text)
- Products dropdown: populated from `GET /api/categories` (active, includes "All Products" at top)
- Language toggle: AR ↔ EN
- Dark/Light toggle
- Cart icon with badge
- Mobile: hamburger → drawer with all links

### Contact Page (`/contact`)
- Page heading
- Phone numbers (primary + secondary) with tel: links
- WhatsApp button (link: `https://wa.me/[number]`)
- Email (if configured) with mailto: link
- Address / location text
- Social media links with icons
- Embedded Google Maps iframe (TBD — conditional if coordinates/embed URL in settings)
- Data: from `GET /api/settings/contact`

### Error Pages
- `error.vue` (Nuxt error page) — clean branded 404 and 500 pages
- 404: "Page not found" + search suggestion or "Go Home" link
- 500: "Something went wrong" + "Go Home" link

### Admin Settings Pages

**`/admin/settings`** (tabbed)

*Tab 1: General*
- Site Name (AR) + Site Name (EN)
- Tagline (AR) + Tagline (EN)
- Logo upload (current preview + replace)
- Favicon upload
- Hero Image upload (for homepage hero background)
- Banner Text (AR + EN)
- Banner Button Text (AR + EN)
- Banner Button URL
- Save button

*Tab 2: Contact*
- Primary Phone
- Secondary Phone (optional)
- WhatsApp Number
- Email Address (optional)
- Address / Location (AR)
- Address / Location (EN)
- Facebook URL
- Instagram URL
- Other social links (optional — TBD based on client)
- Google Maps Embed URL (optional)
- Save button

*Tab 3: SEO / GEO*
- Default Meta Title Template (AR + EN) — e.g., `{page} | Mango Electronics`
- Default Meta Description (AR + EN)
- Site Keywords (tag input)
- GEO Description (textarea) — structured description of the business for AI search engines
- Save button

*Tab 4: Store Config*
- Default Currency (text, default: EGP)
- Products per page (number, default: 16)
- Save button

## 5. Required Backend / Nitro Work

### Public Settings APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api/settings/general` | GET | Site name, tagline, logo, hero image, banner | None |
| `GET /api/settings/contact` | GET | Contact info, social links | None |
| `GET /api/settings/store` | GET | Currency, pagination config | None |

### Admin Settings APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api/admin/settings` | GET | Full settings (no credentials) | `settings.view` |
| `PUT /api/admin/settings/general` | PUT | Update general settings | `settings.manage` |
| `PUT /api/admin/settings/contact` | PUT | Update contact settings | `settings.manage` |
| `PUT /api/admin/settings/seo` | PUT | Update SEO/GEO settings | `settings.manage` |
| `PUT /api/admin/settings/store` | PUT | Update store config | `settings.manage` |
| `POST /api/admin/settings/logo` | POST | Upload logo | `settings.manage` |
| `POST /api/admin/settings/favicon` | POST | Upload favicon | `settings.manage` |
| `POST /api/admin/settings/hero` | POST | Upload hero image | `settings.manage` |

### Logo/Image Serving
Logo, favicon, hero image stored at `/storage/settings/`. Served via static route.

### Caching
Public settings APIs should apply short-lived server cache (e.g., 60 seconds via `defineCachedEventHandler`) — settings change rarely and should not hit DB on every page load.

## 6. Required Database Work

Extend `SiteSettings` model with new fields if not already present (check Phase 2 schema):
- `heroImagePath`
- `bannerTextAr`, `bannerTextEn`
- `bannerButtonTextAr`, `bannerButtonTextEn`, `bannerButtonUrl`
- `seoMetaTitleTemplateAr`, `seoMetaTitleTemplateEn`
- `seoMetaDescriptionAr`, `seoMetaDescriptionEn`
- `seoKeywords`
- `geoDescription`
- `googleMapsEmbedUrl`
- `defaultCurrency` (default: 'EGP')
- `productsPerPage` (default: 16)

If schema change needed: `prisma migrate dev`.

Update seed to populate default values for all new fields.

## 7. API Requirements

Documented in Section 5.

SEO meta tags on public pages:
- `useHead()` in each public page component
- Title: `{productName} | {siteNameEn}` (from settings)
- Description: product/category meta description or site default
- OG tags: og:title, og:description, og:image (product cover or site logo)
- Canonical URL

## 8. UI Requirements

### Homepage
- Hero: full-width, min 500px height desktop, 400px mobile
- Services section: cards uniform height, icon top, name bold, description muted
- Category cards: 3:2 or 16:9 aspect ratio, text on overlay
- Banner: visually breaks the page — distinct background
- Contact section: clean, icon + text for each method

### Footer
- Dark background (brand dark or near-black), light text
- Logo in white or light version
- 2–3 columns desktop, stacked mobile

### Settings
- Each tab saves independently
- Logo preview: shows current logo at 120px width
- Image uploads: drag-and-drop or click-to-browse, current image preview

## 9. Business Rules

1. SiteSettings is a singleton (one row) — always UPDATE, never INSERT after seed
2. Logo and favicon are uploaded images — stored in `/storage/settings/`
3. Public settings APIs are read-only and unauthenticated
4. If logo path is null, Navbar falls back to text "Mango Electronics"
5. If hero image is null, Homepage hero uses a solid brand color background
6. Settings cached on server for 60 seconds — changes propagate within 1 minute
7. GEO Description field: used in structured content that helps AI search engines understand the business

## 10. Implementation Guidelines

### SEO / GEO
The `ProductSeo.geoContent` (per product) and `SiteSettings.geoDescription` (site-wide) are used to populate structured text content in page bodies or `<script type="application/ld+json">` blocks. This ensures AI-powered search engines can index the content with context. Implement basic JSON-LD for:
- Organization schema on homepage
- Product schema on product landing pages (`/p/[slug]`)

### Settings Singleton Pattern
Always use `prisma.siteSettings.upsert({ where: { id: 1 }, ... })` to ensure exactly one row.

### Navbar Data Fetching
Fetch categories for the dropdown using `useAsyncData` with `server: true` in `app.vue` or a layout. Cache response client-side — categories change infrequently.

### Responsive Hero
CSS: `min-height: 500px; max-height: 85vh`. Background image via `background-image`, `background-size: cover`, `background-position: center`.

## 11. Required Skills

- `frontend-design` — homepage layout, hero, category cards
- `product-self-knowledge` — if Stitch design is referenced

## 12. Testing Requirements

### Basic Verification
- Homepage loads with all sections (hero, services, categories, banner, contact, footer)
- Services section shows data from DB
- Featured categories section shows admin-selected categories
- Contact page shows all configured contact methods
- Footer shows correct contact info
- Language switch on homepage preserves all sections in AR
- RTL layout correct on AR version of homepage
- 404 page shows for non-existent routes
- Admin can update site name in Settings → navbar updates
- Admin can upload logo → appears in navbar
- Admin can update contact info → Contact page updates

### Heavy Testing
*Requires Human Approval before running.*

## 13. Acceptance Criteria

- [ ] Homepage hero with configured headline and CTA buttons renders
- [ ] Homepage Services section shows active services (real data)
- [ ] Homepage Featured Categories shows admin-selected categories (real data)
- [ ] Homepage Banner section renders
- [ ] Homepage Contact section shows real contact info
- [ ] Contact page shows all configured contact methods with functional links (tel:, wa.me, mailto:)
- [ ] Footer shows logo, links, and contact info
- [ ] Navbar products dropdown shows "All Products" + active categories
- [ ] Logo renders in navbar from uploaded file (or falls back to text)
- [ ] SEO meta tags and OG tags render on product landing pages (verify via page source)
- [ ] JSON-LD Organization schema present on homepage
- [ ] JSON-LD Product schema present on product landing pages
- [ ] Admin Settings all tabs save correctly
- [ ] Logo upload works and immediately reflects in navbar
- [ ] 404 page is branded
- [ ] AR version of homepage is fully RTL

## 14. Phase Completion Criteria

- Implementation complete
- Basic verification complete
- No known blocking errors
- Acceptance criteria satisfied
- Stitch design reference followed (frontend does not deviate from approved design)
- Heavy testing pending human approval
