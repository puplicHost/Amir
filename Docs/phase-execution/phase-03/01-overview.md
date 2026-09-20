# Phase 03: Products & Categories

## Phase Identity
- **Phase number:** 03
- **Phase name:** Products & Categories
- **Source phase document:** `phase-03-products-categories.md`
- **Dependencies:** Phase 01, Phase 02 (Database, Auth)
- **Position in overall project:** 3rd phase. Builds the core commerce data models and public catalog.

## Objective
Admins can create and manage categories and products through the Admin Panel. Customers can browse the full product catalog on the public site, filter by category/price/attributes, search, and view individual product landing pages. The navbar Products dropdown populates dynamically.

## Scope
- Admin Category CRUD
- Admin Product CRUD (multi-step form)
- Image upload + compression + reordering
- Public `/products` (catalog)
- Public `/products/[slug]` (category page)
- Public `/p/[slug]` (product landing page)
- Dynamic products dropdown in navbar

## Explicitly Out of Scope
- Cart, checkout, orders
- Services

## Requirements
- **Confirmed:** Product deletion deletes stored image files.
- **Confirmed:** Categories cannot be deleted if products exist.
- **Confirmed:** Images compressed to max 1200px width, JPEG 80 quality.
- **Confirmed:** Image storage locally in `/storage/products/[id]/`.
- **Confirmed:** Public SSR rendering using `useAsyncData`.

## User Impact
Admins can populate the store. Customers can view the entire catalog and share product links.

## Architecture Impact
Introduces file storage mechanisms and static file serving from Nitro. Establishes the public SSR catalog structure.

## Dependencies
- **Previous phases required:** Phase 02
- **Future phases depending on this phase:** Phase 04 (Cart needs products), Phase 06 (Homepage needs featured categories).
- **Design dependencies:** Google Stitch designs MUST be completed and approved before frontend work begins.

## Risks
- Image processing issues (`sharp` installation).
- SSR performance if large product grids are poorly optimized.
- Orphaned files if deletion logic fails.

## Human Decisions
- TBD: Confirmation on inactive products returning 404. (Assuming Yes).

## Acceptance Criteria
- Admin can create, edit, delete categories
- Category cover image uploads and displays
- Category appears in navbar dropdown when active
- Featured category appears on homepage (shell)
- Admin can create product with all 5 form steps
- Product images upload, compress, and display
- Product images reorder correctly
- Deleting product removes image files
- Public `/products` page shows active products
- Category filter, price filter, attribute filter, search all work
- Pagination works
- Category page (`/products/[slug]`) shows category hero and filtered products
- Product landing page (`/p/[slug]`) renders with correct SSR meta
- Share: copy link and WhatsApp share work on landing page
- Inactive products do not appear on public pages

## Definition of Done
The phase is complete when admins can fully manage products and images, and public users can smoothly browse and filter the catalog with proper SSR.