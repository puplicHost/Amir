# Coding Agent Instructions: Phase 03 - Products & Categories

## Phase Command
Implement Phase 03 — Products & Categories.

## Objective
Build the Admin management tools for Categories and Products, implement file uploads, and construct the public SSR product catalog.

## Allowed Scope
- Category CRUD (Admin & API).
- Product CRUD (Admin & API) with Multi-step form.
- File upload, compression (using `sharp`), and storage in local `/storage`.
- Public catalog pages (`/products`, `/products/[slug]`, `/p/[slug]`).
- Dynamic navbar dropdown for categories.

## Forbidden Scope
- Cart and Checkout features.
- Modifications to database schema (already defined).

## Required Skills
- `frontend-design`
- `codebase-design`

## Frontend Tasks
- Build Category management table and form.
- Build Product management table and 5-step form (Basic, Pricing, Attributes, Images, SEO).
- Implement Drag-and-drop ImageUploadZone.
- Build public `/products` grid with functional filters (category, price, search).
- Build product landing page `/p/[slug]` with SEO meta tags.

## Backend Tasks
- Implement file upload route using `readMultipartFormData`.
- Use `sharp` to compress images (max 1200px width, 80 quality JPEG/WEBP).
- Implement Nitro static file serving for `/storage`.
- Build robust filter queries for the public API using Prisma.

## Database Tasks
- Use existing schema. Ensure transactional writes when creating a Product along with its SEO, Attributes, and Images.

## API Tasks
- Build protected admin endpoints (CRUD).
- Build unauthenticated public endpoints (list, get by slug).

## Security Tasks
- Validate image mime types and 5MB size limit.
- Prevent directory traversal vulnerabilities in file serving.
- Enforce RBAC permissions.

## UI/UX Tasks
- Follow approved Stitch designs exactly.
- Ensure loading skeletons and empty states are present.

## Business Rules
- Auto-generate unique slugs.
- Prevent category deletion if products exist.
- Delete images from filesystem when a product is deleted.
- Inactive products must return 404 publicly.

## Validation
- Form validation on all admin forms before submission.
- Ensure Compare-At price > Price.

## Error Handling
- Gracefully handle file upload failures.

## Verification
- Create category, create product, upload images.
- Verify images on disk.
- Delete product, verify images removed.
- Load public catalog, verify filters work.
- Load `/p/[slug]`, view page source to confirm SSR meta tags.

## Acceptance Criteria
- [ ] Admin can create, edit, delete categories
- [ ] Category cover image uploads and displays
- [ ] Category appears in navbar dropdown when active
- [ ] Featured category appears on homepage (shell)
- [ ] Admin can create product with all 5 form steps
- [ ] Product images upload, compress, and display
- [ ] Product images reorder correctly
- [ ] Deleting product removes image files
- [ ] Public `/products` page shows active products
- [ ] Category filter, price filter, attribute filter, search all work
- [ ] Pagination works
- [ ] Category page (`/products/[slug]`) shows category hero and filtered products
- [ ] Product landing page (`/p/[slug]`) renders with correct SSR meta
- [ ] Share: copy link and WhatsApp share work on landing page
- [ ] Inactive products do not appear on public pages

## Completion Criteria
Stop when all Acceptance Criteria are met, the public catalog operates smoothly with SSR, and admin uploads are processed and stored correctly.

## Human Approval Points
- None required to complete this phase.

## Do Not
- Do not implement Cart/Checkout.
- Do not deviate from Stitch design.
- Do not forget file cleanup on deletion.