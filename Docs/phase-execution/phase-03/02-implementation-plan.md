# Implementation Plan: Phase 03 - Products & Categories

## Architecture
- **Modules:** Catalog Module, Admin Product/Category Module, Image Upload Service.
- **Responsibilities:** Product discovery, SSR SEO, File handling.
- **Data flow:** Admin -> API -> Storage/DB. Public -> API -> Vue (SSR).

## Frontend
- **Admin Pages:**
  - `/admin/categories` (list, create modal/page, edit)
  - `/admin/products` (list, table)
  - `/admin/products/new` & `[id]/edit` (multi-step form: Basic, Pricing, Attributes, Images, SEO)
- **Public Pages:**
  - `/products` (grid, filters, search, pagination)
  - `/products/[slug]` (category filtered view)
  - `/p/[slug]` (single product landing page)
- **Components:**
  - `ProductCard.vue`, `CategoryCard.vue`, `ProductGrid.vue`, `ProductFilters.vue`, `MultiStepForm.vue`, `ImageUploadZone.vue`.
- **Navigation:** Dynamically load active categories into Navbar.

## Google Stitch / Design System
- **Crucial:** Strictly follow the approved Stitch designs for the product grid, filter sidebar/drawer, and product landing page layout.

## Backend
- **APIs (Admin):**
  - CRUD for Categories and Products.
  - Image upload endpoints handling `multipart/form-data`.
- **APIs (Public):**
  - Read-only endpoints for catalog fetching, sorting, filtering, and pagination.
- **Image Processing:** Use `sharp` to process uploads (resize, compress) before saving to `/storage/products/[id]/`.
- **Static file serving:** Expose `/uploads/products/**` via Nitro or Nuxt public mapping.

## Database
- Models are already present. Ensure correct nested writes for Attributes, SEO, and Images during Product creation/update.

## Security
- API protection via Phase 2 `requirePermission('products.manage')` etc.
- File upload validation: check mime types (images only), restrict size to 5MB. Path traversal protection on filenames.

## Storage
- Location: `/storage/products/[productId]/[filename]`
- Deletion logic: `fs.rm` directory when product is deleted.

## Skills
```text
Skill: frontend-design
Purpose: Ensuring complex public grids and admin forms meet design standards.
Used for: Product grids, filter sidebars.
Phase tasks: UI Implementation.

Skill: codebase-design
Purpose: Architecting the image upload and static serving layer.
Used for: Nitro endpoints and fs operations.
Phase tasks: Image storage.
```

## Implementation Order
1. Implement Backend Image upload and static serving service.
2. Implement Admin Category APIs and Frontend.
3. Implement Admin Product CRUD APIs (complex nested structures).
4. Implement Admin Product multi-step Frontend.
5. Verify Admin flows and file storage.
6. Implement Public Category/Product APIs (with filters/pagination).
7. Build Public Catalog pages (`/products`, `/products/[slug]`).
8. Build Product Landing Page (`/p/[slug]`).
9. Update Navbar to load dynamic categories.

## Verification
- Basic Verification:
  - Upload image > verify compressed file on disk.
  - Delete product > verify file removed from disk.
  - Check public SSR meta tags on `/p/[slug]`.