# Admin Panel UX Audit — Mango Electronics

An in-depth user experience audit of the Mango Electronics Admin Panel (`/admin`). This audit identifies friction points, redundant navigation steps, missing shortcuts, and areas where routine administrative workflows require excessive clicks.

---

## Page: Products List (`/admin/products`)

### Problem: No quick toggle for product active/inactive visibility
### Current flow: 
To hide an out-of-stock or temporary item from public view, the admin must: (1) click "Edit" on the row, (2) wait for full product page with rich text editor and image galleries to load, (3) scroll down to the publication switches, (4) uncheck "Active", (5) click "Save Changes", and (6) click "Back to products". Total: 6 steps (~25 seconds).
### Suggested fix: 
Turn the static status badge in the table into an interactive 1-click toggle button that directly updates `isActive` via `PUT /api/admin/products/:id`.
### Priority: High

---

## Page: Products List (`/admin/products`)

### Problem: Missing product duplication / clone action
### Current flow: 
Electronics stores catalog many similar hardware items (e.g., Arduino Uno vs Nano, sensors of different voltages, capacitors of varying ratings). Creating a variant requires clicking "Add Product", manually retyping descriptions, re-entering dynamic technical specifications, selecting categories, and setting pricing from scratch. Total: 15+ manual fields (~5 minutes per item).
### Suggested fix: 
Add a "Duplicate" (نسخ) action icon to each table row. Clicking it clones all fields, attributes, and specifications into a new draft item with a unique slug and "(Copy)" suffix.
### Priority: High

---

## Page: Customer Inbox (`/admin/inbox`)

### Problem: No bulk "Mark All as Read" action
### Current flow: 
When multiple customer inquiries arrive, the admin must open each message modal individually or click the envelope icon on each row one by one. For 20 messages, this requires 20 to 40 individual clicks.
### Suggested fix: 
Add a "تعليم الكل كمقروء" ("Mark All as Read") button in the inbox top header actions toolbar that marks all unread contact messages as read in 1 click.
### Priority: High

---

## Page: Inventory Management (`/admin/inventory`)

### Problem: Stock counts are completely read-only on the inventory page
### Current flow: 
When physical stock arrives at the warehouse, the inventory manager reviewing `/admin/inventory` cannot adjust stock counts inline. They must: (1) click the product link, (2) wait for full product editor to load, (3) scroll down to inventory section, (4) change stock count, (5) save product, and (6) navigate back to `/admin/inventory`. Total: 6 steps per product.
### Suggested fix: 
Make the "Current Stock" cell an inline numeric input (with quick Save on Enter or blur) that updates the product's stock directly and instantly recalculates total inventory valuation.
### Priority: High

---

## Page: Service Requests (`/admin/services?tab=requests`)

### Problem: Cannot transition request status from the requests table
### Current flow: 
To update an engineering inquiry status (e.g. from "New" to "In Progress" or "Completed"), the admin must: (1) click "عرض الطلب" / "Review", (2) navigate to `/admin/services/requests/:id`, (3) scroll to the status selector, (4) pick the new status, (5) click save, and (6) navigate back to `/admin/services`. Total: 6 steps.
### Suggested fix: 
Embed an interactive status dropdown directly in the "Status" column of the requests table that calls `PUT /api/admin/services/requests/:id/status` in 1 click with immediate feedback.
### Priority: High

---

## Page: Orders Management (`/admin/orders`)

### Problem: Missing bulk status update and export for selected orders
### Current flow: 
When preparing a daily batch of 15 packages for courier pickup, the admin must open each order individually to print slips or change status to "Shipped".
### Suggested fix: 
Add row checkboxes with a floating bulk action bar: "تغيير حالة المحدد" ("Change Status for Selected") and "تصدير المحدد" ("Export Selected").
### Priority: Medium

---

## Page: Categories Management (`/admin/categories`)

### Problem: Featured toggle requires opening the edit modal
### Current flow: 
To feature or unfeature a category on the homepage, the admin must: (1) click "Edit", (2) wait for modal to open with form fields, (3) check/uncheck the "Featured" box, and (4) click "Save Category". Total: 4 clicks.
### Suggested fix: 
Allow clicking directly on the "مميز" / "Featured" star badge in the table to toggle homepage visibility in 1 click (similar to how Sort Order is already editable inline).
### Priority: Medium

---

## Page: Financials & Expenses (`/admin/financials`)

### Problem: No quick date presets (Today, This Week, This Month, Last Month)
### Current flow: 
Admin must manually pick year and month from numeric dropdowns every time they want to compare the current month with previous cycles.
### Suggested fix: 
Add quick pill buttons: "هذا الشهر" ("This Month"), "الشهر الماضي" ("Last Month"), "هذا العام" ("This Year").
### Priority: Medium

---

## Page: Product Creator & Editor (`/admin/products/new`, `/:id`)

### Problem: Form is a single monolithic page with 10+ vertical sections
### Current flow: 
The product editor requires scrolling through title, rich text, pricing, inventory, categories, media galleries, videos, documents, specifications, and SEO meta tags. Finding a specific setting requires significant vertical scrolling.
### Suggested fix: 
Add sticky sub-navigation tabs or a floating table of contents at the top ("General", "Pricing & Stock", "Media", "Specs", "SEO") that smooth-scrolls or tabs to the relevant section.
### Priority: Medium

---

## Page: Navigation & Global Admin Shell

### Problem: Missing global search shortcut (`Cmd+K` / `Ctrl+K`)
### Current flow: 
To find a customer order while editing a product, the admin must look at the sidebar, click "Orders", wait for page load, click the search bar, type the order number, and hit Enter.
### Suggested fix: 
Implement a global command palette shortcut (`Ctrl+K` / `Cmd+K`) accessible anywhere in the admin to instantly jump to orders, products, services, or settings.
### Priority: Low

---

## Page: Users & Permissions (`/admin/users`)

### Problem: Permission assignment requires checking 15+ individual checkboxes
### Current flow: 
When creating a new warehouse staff or sales account, the admin has to read and check 10 to 15 granular permission boxes individually.
### Suggested fix: 
Add role template preset buttons at the top of the modal: "مدير مبيعات" ("Sales Manager"), "أمين مخزن" ("Warehouse Staff"), "دعم فني" ("Support"), which auto-select the standard permission set with 1 click.
### Priority: Low

---

## Page: Settings (`/admin/settings`)

### Problem: Save bar is hidden until changes are made, causing doubt about saved state
### Current flow: 
Admin modifies a setting (e.g., store phone number), but because the save bar only appears at the bottom of the viewport, they might navigate away without noticing unsaved changes.
### Suggested fix: 
Add a browser beforeunload confirmation dialog when dirty state is active and display a clear indicator in the active tab header.
### Priority: Low
