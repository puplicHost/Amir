# 03 — User Journeys
## Mango Electronics

---

## Roles

1. **Customer** — Public visitor: shops, browses, submits service requests
2. **Admin** — Super-admin: full access to all Admin Panel functionality
3. **Staff User** — Admin-created user with limited permissions

---

## Customer Journeys

---

### J-C1: Browse and Purchase a Product

**Goal:** Find and buy an electronic component or tool.

```
Lands on Homepage
    ↓
Sees Featured Categories section
    ↓
Clicks a category (e.g., "Electronic Tools")
    ↓
Category Page loads — filtered product grid
    ↓
Browses products, uses price filter or attribute filter
    ↓
Clicks on a product card
    ↓
[Product Landing Page — /p/[slug]]
    ↓
Views images, description, specs
    ↓
Clicks "Add to Cart"
    ↓
Cart badge updates in navbar
    ↓
Clicks cart icon
    ↓
[Cart Page]
    ↓
Reviews items, adjusts quantities, removes if needed
    ↓
Clicks "Proceed to Checkout"
    ↓
[Checkout Page]
    ↓
Fills in: Name, Phone, Governorate/Address, (optional email)
    ↓
Selects payment method: Cash on Delivery (or online if enabled)
    ↓
Clicks "Place Order"
    ↓
[Order Confirmation Page]
    ↓
Sees order number + "Team will contact you to confirm"
```

**Alternative: Product not found in catalog**

```
Customer uses search bar on /products
    ↓
No results → sees empty state
    ↓
Empty state suggests: "Can't find it? Request it via our Product Search Service"
    ↓
Link to Services page → Product Search service section
    ↓
Fills service form → submits request
```

---

### J-C2: Direct Share Link Purchase

**Goal:** Customer receives a product link via social media or WhatsApp.

```
Clicks shared link (e.g., /p/arduino-mega-2560)
    ↓
[Product Landing Page]
    ↓
Views product focused on that item only (no catalog)
    ↓
Adds to Cart
    ↓
Proceeds through checkout → Order placed
```

---

### J-C3: Submit a Service Request

**Goal:** Request repair, IoT system installation, PLC work, fire alarm installation, pneumatic systems service, product search, or bulk supply.

```
Lands on Homepage
    ↓
Sees Services section
    ↓
Clicks "Learn More" or service card
    ↓
[Services Page /services]
    ↓
Reads service description
    ↓
Finds the relevant service section
    ↓
Fills the service-specific form:
  - Required: Name, Phone, Governorate
  - Service-specific fields (varies by service)
  - Optional: description, file/image upload
    ↓
Submits form
    ↓
[Service Success Page]
    ↓
"Your request has been received. We'll contact you shortly."
```

**Error path:**
```
Submits form with missing required fields
    ↓
Inline validation highlights missing fields
    ↓
Customer fills and resubmits
```

---

### J-C4: Navigate via Products Dropdown

**Goal:** Quickly reach a product category from any page.

```
Hovers / taps "Products" in navbar
    ↓
Dropdown appears:
  - "All Products" (top)
  - [Category 1]
  - [Category 2]
  - ...dynamic list...
    ↓
Clicks desired category
    ↓
[Category Page]
```

---

## Admin Journeys

---

### J-A1: Add a New Product

**Goal:** Add a new item to the store catalog.

```
Admin logs in → /admin
    ↓
Navigates to Products
    ↓
Clicks "Add Product"
    ↓
[Multi-step form /admin/products/new]

Step 1 — Basic Info:
  - Product name (AR + EN)
  - Description (AR + EN)
  - Category selection
  - Active/inactive toggle
    ↓
Step 2 — Pricing:
  - Price (EGP)
  - Compare-at price (optional)
    ↓
Step 3 — Attributes:
  - Add key-value pairs (e.g., "Brand: Arduino", "Voltage: 5V")
    ↓
Step 4 — Images:
  - Upload images (server compresses on upload)
  - Drag to reorder
  - Mark cover image
    ↓
Step 5 — SEO:
  - Meta title (AR + EN)
  - Meta description (AR + EN)
  - Keywords
  - GEO content (brief structured description for AI crawlers)
    ↓
Clicks "Publish"
    ↓
Product saved → redirects to Products table
    ↓
Product now visible on public site
```

---

### J-A2: Manage an Incoming Order

**Goal:** Process and update a customer order.

```
Admin on Dashboard
    ↓
Sees "New Orders" widget showing pending count
    ↓
Navigates to Orders
    ↓
[Orders table /admin/orders]
    ↓
Filters by "Pending"
    ↓
Clicks order row
    ↓
[Order Detail /admin/orders/[id]]
    ↓
Reviews: customer name, phone, address, items, totals, payment method
    ↓
Updates status: Pending → Processing (team is preparing)
    ↓
Later: → Shipped | Delivered | Cancelled
    ↓
Status updated, visible in table
```

---

### J-A3: Manage an Incoming Service Request

**Goal:** Review and respond to a submitted service request.

```
Admin on Dashboard
    ↓
Sees "Unread Service Requests" badge
    ↓
Navigates to Services → Service Requests
    ↓
Sees table with new requests (status: New)
    ↓
Clicks request row
    ↓
[Service Request Detail]
    ↓
Reviews all submitted fields (name, phone, description, attached images)
    ↓
Updates status: New → In Review
    ↓
Contacts customer via phone/WhatsApp (outside platform)
    ↓
Updates status: → Done | Closed
```

---

### J-A4: Configure a New Service

**Goal:** Add a new engineering service with its own dynamic form.

```
Admin navigates to Services → Services Config
    ↓
Clicks "Add Service"
    ↓
Fills: Service name (AR + EN), description (AR + EN), icon/image (optional), active toggle
    ↓
Saves service
    ↓
Navigates to service → "Configure Form"
    ↓
[Form Builder /admin/services/[id]/form]
    ↓
Adds form fields one by one:
  - Label (AR + EN)
  - Field type: text | textarea | select | file | phone
  - Required or optional
  - Options (for select fields)
    ↓
Saves form
    ↓
Service and form now appear on public /services page
```

---

### J-A5: Manage Categories

**Goal:** Create a category that appears in the store and homepage.

```
Admin navigates to Categories
    ↓
Clicks "Add Category"
    ↓
Fills: Name (AR + EN), description (AR + EN), slug (auto-generated), cover image upload, cover video URL (optional)
    ↓
Toggles "Feature on Homepage" → ON
    ↓
Saves category
    ↓
Category appears:
  - In Products dropdown nav (dynamic)
  - On /products page category filter
  - On Homepage "Featured Categories" section (if featured)
  - Has its own public page at /products/[slug]
```

---

### J-A6: Create a Staff User with Limited Permissions

**Goal:** Allow a team member to manage orders only, without access to settings or products.

```
Admin navigates to Users
    ↓
Clicks "Add User"
    ↓
Fills: Name, Email, Password
    ↓
Assigns permissions:
  ✓ orders.view
  ✓ orders.manage
  ✗ products.create / edit / delete
  ✗ settings.manage
  ✗ users.manage
    ↓
Saves user
    ↓
Staff logs in at /admin/login
    ↓
Sees only Orders in sidebar (other items hidden by permission)
```

---

## Staff User Journey

### J-S1: Process Orders (Limited Role)

```
Staff logs into /admin
    ↓
Dashboard shows only order-relevant widgets
    ↓
Navigates to Orders
    ↓
Updates order statuses as needed
    ↓
Cannot access Products, Settings, Categories, or Users
```

---

## Key Business Rules Identified from Journeys

1. Customer does not need an account to shop or submit service requests.
2. Product Landing Page (`/p/[slug]`) is distinct from the catalog — optimized for sharing.
3. Service forms are dynamic — adding a new service does not require developer code changes.
4. Category cover media serves both the category page hero AND the homepage featured section.
5. Deletion of a product must clean up its server-stored images.
6. Payment method visibility on checkout is controlled by Settings.
7. Admin permissions gate both nav visibility and API access.
8. Order status is a linear lifecycle: Pending → Processing → Shipped → Delivered (Cancelled possible at any stage before Delivered).
9. Service request status lifecycle: New → In Review → Done / Closed.
10. Language-switching preserves the current page context (same product/category in other language).
