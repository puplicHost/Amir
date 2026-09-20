# Phase 3 — Products & Categories

## 1. Overview

Build the complete product and category system: Admin Panel management (CRUD), public product catalog, category pages, product landing pages, and the dynamic Products dropdown navigation. This is the core commerce content layer.

## 2. Objective

Admins can create and manage categories and products through the Admin Panel. Customers can browse the full product catalog on the public site, filter by category/price/attributes, search, and view individual product landing pages. The navbar Products dropdown populates dynamically from the database.

## 3. Scope

**Admin:**
- Category CRUD (list, create, edit, delete)
- Product CRUD with multi-step add form
- Product image upload with server-side compression
- Product deletion with image cleanup
- Product landing page link/action

**Public:**
- `/products` — All Products page with hero, search, filters, grid, pagination
- `/products/[slug]` — Category page with hero and filtered products
- `/p/[slug]` — Product Landing Page
- Dynamic Products dropdown in navbar

**Out of scope:** Cart, checkout, orders, services.

## 4. Required Frontend Work

### Admin Pages

**`/admin/categories`**
- Table: Name (AR + EN), Slug, Product Count, Featured, Actions (Edit, Delete)
- "Add Category" button → `/admin/categories/new`
- Delete: confirmation modal; cannot delete if products exist in category (show error)

**`/admin/categories/new` and `/admin/categories/[id]/edit`**
- Form fields:
  - Name (AR) — required
  - Name (EN) — required
  - Slug — auto-generated from EN name, editable
  - Description (AR) — rich text or textarea
  - Description (EN) — rich text or textarea
  - Cover Image — upload input (single image)
  - Cover Video URL — optional text input
  - Feature on Homepage — toggle

**`/admin/products`**
- Table: Cover image thumbnail, Name (EN), Category, Price, Status (Active/Inactive), Actions
- Search by name
- Filter by category, filter by status
- Pagination (20/page)
- Actions: Edit, Delete (with confirmation), View Landing Page (opens in new tab)
- "Add Product" button → multi-step form

**`/admin/products/new` and `/admin/products/[id]/edit`**

Multi-step form with step indicator:

*Step 1 — Basic Info*
- Name (AR) — required
- Name (EN) — required
- Slug — auto-generated from EN name, editable
- Category — select from categories
- Description (AR) — textarea
- Description (EN) — textarea
- Active — toggle (default: true)

*Step 2 — Pricing*
- Price (EGP) — required, number input
- Compare-at Price (optional) — shows strikethrough original on public site

*Step 3 — Attributes*
- Dynamic key-value pairs
- Key (AR), Key (EN), Value (AR), Value (EN)
- Add / remove rows
- Examples: "Brand / العلامة التجارية", "Voltage / الجهد"

*Step 4 — Images*
- Drag-and-drop image upload zone
- Multiple images allowed
- Reorder via drag
- Mark one as cover (defaults to first)
- Preview thumbnails
- Remove individual images

*Step 5 — SEO*
- Meta Title (AR) — with character count hint
- Meta Title (EN) — with character count hint
- Meta Description (AR)
- Meta Description (EN)
- Keywords — tag input (comma-separated)
- GEO Content — textarea: brief structured description for AI crawlers (what this product is, what it's used for, who needs it)

### Public Pages

**Products Dropdown (Navbar)**
- Fetch categories on app load (cached)
- Dropdown: "All Products" link + one entry per active category
- Mobile: flattened into drawer links

**`/products`** (All Products)
- Hero section: rotating/static category imagery or brand banner
- Filters sidebar (desktop) or filter drawer (mobile):
  - Category (checkboxes or pills)
  - Price Range (min/max inputs or slider)
  - Attributes (dynamic — derived from active product attributes)
- Search bar (top)
- Sort: Default, Price Low-High, Price High-Low, Newest
- Product grid: 4 columns desktop, 2 columns mobile, cards
- Pagination: page numbers or load-more (determine in Stitch design)
- Empty state: no products found, suggest browsing all

**`/products/[slug]`** (Category Page)
- Hero: category cover image/video with overlay and category name
- Same filter/search grid as /products, pre-filtered to category
- Breadcrumb: Home → Products → [Category Name]

**`/p/[slug]`** (Product Landing Page)
- Image gallery (main image + thumbnails)
- Product name (current locale)
- Price (with compare-at if set, strikethrough)
- Category badge
- Description (current locale)
- Attributes table (current locale keys/values)
- "Add to Cart" button (Cart implemented Phase 4)
- Share buttons: copy link, WhatsApp share
- SEO meta tags rendered server-side (title, description, OG tags)
- Breadcrumb: Home → Products → [Category] → [Product Name]

### Components
- `ProductCard.vue` — used in grid (image, name, price, category, add-to-cart)
- `CategoryCard.vue` — used on homepage and category sections
- `ProductImageGallery.vue` — landing page image viewer
- `ProductFilters.vue` — filter sidebar/drawer
- `ProductGrid.vue` — responsive grid wrapper
- `AppPagination.vue` — reusable pagination component
- `MultiStepForm.vue` — step indicator + content wrapper
- `ImageUploadZone.vue` — drag-and-drop image upload with preview

## 5. Required Backend / Nitro Work

### Category APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api/categories` | GET | List all categories (public + admin) | None (public) |
| `GET /api/categories/featured` | GET | Featured categories for homepage | None |
| `GET /api/categories/[slug]` | GET | Category by slug | None |
| `POST /api/admin/categories` | POST | Create category | `categories.manage` |
| `PUT /api/admin/categories/[id]` | PUT | Update category | `categories.manage` |
| `DELETE /api/admin/categories/[id]` | DELETE | Delete category (guard: no products) | `categories.manage` |
| `POST /api/admin/categories/[id]/cover` | POST | Upload cover image | `categories.manage` |

### Product APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api/products` | GET | List products with filters/pagination | None |
| `GET /api/products/[slug]` | GET | Product by slug (public) | None |
| `GET /api/admin/products` | GET | Admin product list with full data | `products.view` |
| `POST /api/admin/products` | POST | Create product | `products.create` |
| `PUT /api/admin/products/[id]` | PUT | Update product | `products.edit` |
| `DELETE /api/admin/products/[id]` | DELETE | Delete product + cleanup images | `products.delete` |
| `POST /api/admin/products/[id]/images` | POST | Upload product images | `products.edit` |
| `DELETE /api/admin/products/[id]/images/[imageId]` | DELETE | Remove single image | `products.edit` |
| `PUT /api/admin/products/[id]/images/order` | PUT | Reorder images | `products.edit` |

### Query Parameters for `GET /api/products`
- `category` — slug
- `search` — full-text on name fields
- `minPrice`, `maxPrice`
- `attributes` — JSON array of key-value filters
- `sort` — `price_asc`, `price_desc`, `newest`
- `page`, `limit` (default 16 per page on public)

### Image Processing
- Use `sharp` for image compression on upload
- Store in `/storage/products/[productId]/[filename]`
- Serve as static via Nitro or separate static path
- On product delete: remove directory `/storage/products/[productId]/`

## 6. Required Database Work

All models defined in Phase 2 schema. No new models needed.

Ensure indexes:
- `Product.slug` — unique
- `Product.categoryId` — indexed for filter queries
- `Product.isActive` — indexed
- `Category.slug` — unique
- `Category.featuredOnHomepage` — indexed

## 7. API Requirements

Documented in Section 5.

Public product list API response should include: id, slug, nameAr, nameEn, price, compareAtPrice, coverImage (path), category (id, slug, nameAr, nameEn), isActive.

Product detail API response includes all of the above plus: full descriptions, all images, all attributes, SEO fields.

## 8. UI Requirements

- Product cards: image 1:1 ratio, lazy loaded
- Category cover image: 16:9 ratio recommended for hero display
- Category page hero: full-width, minimum 300px height, cover image with brand dark blue overlay
- Product grid empty state: icon + "No products found" + "Browse all" link
- Product landing page OG image: use cover image
- Admin product table: image thumbnail 48×48px
- Multi-step form: clear progress indicator, validation before advancing steps
- File size limit: 5MB per image (client-side validation before upload)

## 9. Business Rules

1. Product slug must be unique — auto-generated from EN name, editable before save
2. Category slug must be unique
3. Deleting a category that has products: blocked with error message ("Remove or reassign products first")
4. Deleting a product: must delete all stored image files before DB deletion
5. Image upload: server compresses to max 1200px wide, JPEG quality 80
6. Compare-at price must be greater than actual price (if set)
7. Only active products appear on public pages
8. Only active categories appear in public navigation
9. Featured categories appear on homepage (up to ~6 — excess hidden until admin deselects others)
10. Product landing page (`/p/[slug]`) is publicly accessible even for inactive products? — **TBD: confirm with client.** Assumption: inactive products return 404 on public pages.

## 10. Implementation Guidelines

### Image Storage
- Store at `/storage/products/[productId]/` outside of the Nuxt public folder
- Serve via a Nitro route `GET /uploads/products/[productId]/[filename]` that streams the file
- Use `sharp` npm package for compression

### Slug Generation
Utility: `generateSlug(nameEn: string): string` — lowercase, replace spaces with hyphens, remove special characters. Add suffix (`-2`, `-3`) if slug already exists.

### Server-Side Rendering for Public Pages
All public product/category pages should use `useAsyncData` for SSR — important for SEO.

### GEO Content Field
The SEO step includes a "GEO Content" textarea. Prompt in the Admin form: *"Describe this product in 2–3 sentences for AI search engines: what it is, who uses it, and what problem it solves."*

## 11. Required Skills

- `frontend-design` — product grid, filters, landing page layout
- `codebase-design` — image storage architecture, query layer

## 12. Testing Requirements

### Basic Verification
- Create a category with cover image → appears in nav dropdown
- Create a product with all fields + images → appears in public grid
- Product landing page renders with SSR meta tags
- Category page shows only products in that category
- Search returns relevant results
- Price filter correctly bounds results
- Pagination works
- Delete product → images removed from filesystem
- Delete category with products → returns error

### Heavy Testing
*Requires Human Approval before running.*

## 13. Acceptance Criteria

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

## 14. Phase Completion Criteria

- Implementation complete
- Basic verification complete
- No known blocking errors
- Acceptance criteria satisfied
- Heavy testing pending human approval
