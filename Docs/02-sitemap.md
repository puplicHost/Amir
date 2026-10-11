# 02 — Sitemap
## Amir

---

## Public Area

### Home
- **Route:** `/` (EN) | `/ar/` (AR)
- **Purpose:** Entry point, brand intro, discovery
- **Sections:**
  - Hero (background image, overlay, headline, 2 CTAs: "Shop Now" → Products, "Our Services" → Services)
  - Services overview cards (up to 6 services, 3/row desktop, 2/row mobile)
  - Featured Categories (admin-selected, 3/row desktop)
  - Site Banner (promotional)
  - Contact section (phone, location, social links)
  - Footer
- **Dependencies:** Categories API (featured), Services API (active services)

---

### Products

#### All Products
- **Route:** `/products` | `/ar/products`
- **Purpose:** Full product catalog with discovery tools
- **Sections:**
  - Hero (category imagery)
  - Sidebar or top bar: Category filter, Price range filter, Attribute filter
  - Search bar
  - Product grid (4/row desktop, 2/row mobile)
  - Pagination
- **Dependencies:** Products API, Categories API, Attributes API

#### Category Page
- **Route:** `/products/[category-slug]` | `/ar/products/[category-slug]`
- **Purpose:** Products filtered to one category
- **Sections:**
  - Category hero (category cover image/video, category name)
  - Same filtering/search as All Products (pre-filtered to category)
  - Product grid
  - Pagination
- **Dependencies:** Category API (by slug), Products API (by category)

#### Product Landing Page
- **Route:** `/p/[product-slug]` | `/ar/p/[product-slug]`
- **Purpose:** Dedicated shareable page per product (for ads, social sharing)
- **Sections:**
  - Product images
  - Product name, price, description
  - Product attributes/specs
  - Add to Cart
  - Share buttons
- **Dependencies:** Product API (by slug)
- **Note:** This is a focused product page, not the full catalog experience

---

### Cart
- **Route:** `/cart` | `/ar/cart`
- **Purpose:** Review cart before checkout
- **Sections:**
  - Cart items list (image, name, quantity control, price, remove)
  - Order summary (subtotal, total)
  - Checkout CTA
- **Dependencies:** Cart state (client-side, localStorage or Pinia)

---

### Checkout
- **Route:** `/checkout` | `/ar/checkout`
- **Purpose:** Collect customer info and complete order
- **Sections:**
  - Customer information form (name, phone, governorate/address, email optional)
  - Order summary
  - Payment method selection (COD default; online payment if enabled)
  - Place Order button
- **Dependencies:** Cart state, Settings API (payment methods), Orders API (POST)

#### Order Confirmation
- **Route:** `/checkout/success` | `/ar/checkout/success`
- **Purpose:** Confirm order placed successfully
- **Sections:**
  - Order number
  - Summary of ordered items
  - What happens next (team will contact, COD info)
- **Dependencies:** Order data from checkout

---

### Services
- **Route:** `/services` | `/ar/services`
- **Purpose:** Present all available services with submission forms
- **Sections:**
  - Services intro
  - One section per service: description + dedicated submission form
  - Each form is dynamic (rendered from service config in Admin)
- **Dependencies:** Services API (with form fields)

#### Service Success
- **Route:** `/services/success` | `/ar/services/success`
- **Purpose:** Confirm service request submitted
- **Sections:**
  - Confirmation message
  - What happens next

---

### Contact
- **Route:** `/contact` | `/ar/contact`
- **Purpose:** All available contact methods
- **Sections:**
  - Phone numbers
  - WhatsApp link
  - Email (if provided)
  - Governorate / Location
  - Social media links
  - Embedded map (TBD — depends on client data)
- **Dependencies:** Settings API (contact info)

---

## Admin Area

All admin routes are protected. Authentication required.

### Auth

#### Login
- **Route:** `/admin/login`
- **Purpose:** Admin authentication

---

### Dashboard
- **Route:** `/admin`
- **Purpose:** Business overview
- **Widgets:** Total orders, pending orders, total revenue (COD confirmed), new service requests (unread), product count, low stock alerts (TBD)
- **Dependencies:** Orders API (summary), Services API (unread count), Products API (count)

---

### Product Management
- **Route:** `/admin/products`
- **Purpose:** View and manage all products
- **Sections:**
  - Table: image thumbnail, name, category, price, status, actions
  - Search, pagination, filter by category/status
  - Actions: Edit, Delete, View Landing Page
- **Actions:** Create Product (→ multi-step form)

#### Add Product
- **Route:** `/admin/products/new`
- **Multi-step form:**
  1. Basic Info (name AR/EN, description AR/EN, category)
  2. Pricing (price, compare-at price if applicable)
  3. Attributes (dynamic key-value properties)
  4. Images (upload, reorder, compress on server)
  5. SEO (meta title, meta description, keywords, GEO tags)
- **Dependencies:** Categories API, Attributes API, Image Upload API

#### Edit Product
- **Route:** `/admin/products/[id]/edit`
- **Purpose:** Edit existing product (same form, pre-filled)

---

### Category Management
- **Route:** `/admin/categories`
- **Purpose:** View and manage categories
- **Table:** Name AR/EN, slug, product count, featured (yes/no), actions
- **Actions:** Create, Edit, Delete

#### Category Form
- **Route:** `/admin/categories/new` | `/admin/categories/[id]/edit`
- **Fields:** Name (AR), Name (EN), slug (auto-generated), description (AR/EN), cover image upload, cover video URL (optional), feature on homepage (toggle)

---

### Order Management
- **Route:** `/admin/orders`
- **Purpose:** View and manage customer orders
- **Table:** Order number, customer name, phone, total, items count, status, payment method, date
- **Filters:** Status, date range, payment method
- **Actions:** View order detail, update status

#### Order Detail
- **Route:** `/admin/orders/[id]`
- **Sections:** Customer info, ordered items, totals, status history, status update action

---

### Service Management
- **Route:** `/admin/services`
- **Tabs:** Services Config | Service Requests

#### Services Config
- **Purpose:** Manage service definitions and their forms
- **Table:** Service name AR/EN, active/inactive, form fields count, actions
- **Actions:** Create service, edit service, configure form, activate/deactivate

#### Service Form Builder
- **Route:** `/admin/services/[id]/form`
- **Purpose:** Configure the dynamic form for a service
- **Fields per form field:** Field label (AR/EN), field type (text, textarea, select, file upload, phone), required/optional, options list (for select)

#### Service Requests
- **Route:** `/admin/services/requests`
- **Table:** Request ID, customer name, service name, date, status, actions
- **Filters:** Service type, status, date
- **Actions:** View detail, update status (New → In Review → Done / Closed)

#### Service Request Detail
- **Route:** `/admin/services/requests/[id]`
- **Sections:** All submitted form fields and values, attached files/images, status update

---

### Settings
- **Route:** `/admin/settings`
- **Tabs / Sections:**
  1. **General:** Site name (AR/EN), tagline (AR/EN), logo upload, favicon
  2. **Contact:** Phone numbers, WhatsApp, email, location/governorate, social links
  3. **Payment:** Enable/disable COD, enable/disable online payment, payment gateway credentials (encrypted at rest), active payment methods
  4. **Store Config:** Currency (EGP default), pagination sizes, featured products (TBD)
  5. **SEO / GEO:** Default meta title template, default meta description, site keywords, structured data settings

---

### User Management
- **Route:** `/admin/users`
- **Purpose:** Manage admin users and their permissions
- **Table:** Name, email, role/permissions, last login, actions
- **Actions:** Create user, edit permissions, deactivate

#### Permission Model (proposed)
Permissions control access to Admin Panel sections:

| Permission | Controls |
|-----------|---------|
| `products.view` | View products |
| `products.create` | Create products |
| `products.edit` | Edit products |
| `products.delete` | Delete products |
| `orders.view` | View orders |
| `orders.manage` | Update order status |
| `services.view` | View service requests |
| `services.manage` | Update service request status |
| `services.config` | Configure services and forms |
| `categories.manage` | Create/edit/delete categories |
| `settings.view` | View settings |
| `settings.manage` | Edit settings |
| `users.manage` | Create/manage admin users |

A super-admin has all permissions. Regular users have assigned subsets.

---

## Navigation Structure

```
Public Nav:
├── Home
├── Products ▼
│   ├── All Products
│   └── [Category 1] ... [Category N]  ← dynamic from DB
├── Services
└── Contact

Mobile Nav (drawer):
├── Same links
├── Language Toggle (AR / EN)
└── Dark/Light Toggle

Admin Nav (sidebar):
├── Dashboard
├── Products
├── Categories
├── Orders
├── Services
│   ├── Services Config
│   └── Service Requests
├── Users
└── Settings
```

---

## URL Strategy

- Public EN: `/products`, `/services`, `/contact`
- Public AR: `/ar/products`, `/ar/services`, `/ar/contact`
- Product landing: `/p/[slug]` — designed for sharing, short URL
- Admin: `/admin/...` — protected, no language prefix needed
- Slugs: auto-generated from EN product/category names, lowercase, hyphenated
