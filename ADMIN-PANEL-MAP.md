# Admin Panel Map — Mango Electronics

## Overview
This document maps every page, view, component, action, and API endpoint in the Mango Electronics Admin Panel (`/admin`). The admin panel is a private, role-based single-page application built with Nuxt 4, Vue 3, Tailwind CSS, and Prisma ORM on PostgreSQL. Access requires an authenticated session with active staff status and specific granular permissions.

---

## Pages & Features

### 1. Dashboard (`/admin`)
- **URL**: `/admin` (or `/ar/admin`, `/en/admin`)
- **Required Permission**: Any valid admin session (`dashboard.financials.view` or `financials.view` for financial totals)
- **Features & Actions**:
  - **KPI Metric Overview**: Top cards displaying Total Orders, Pending Orders count, New Service Requests count, Total Products, Total Categories, Active Services count, Low Stock Count, and Lifetime Revenue volume.
  - **Recent Orders Table**: Mini table listing the latest customer orders with Order #, Customer Name, Governorate, Status Badge, Items Count, Total Amount, and Quick Navigation.
  - **Recent Service Requests Table**: Mini table listing latest technical service requests with Request ID, Client Name, Service Type, Status Badge, and Date.
  - **Low Stock Alerts**: Highlighted list of items currently at or below their reorder threshold.
  - **System Activity Log**: Audit trail displaying the latest staff actions across categories, products, orders, and settings.
- **Buttons & Triggers**:
  - Metric Card Clicks → Deep-link to corresponding submodules (`/admin/orders`, `/admin/services`, `/admin/products`, `/admin/categories`, `/admin/inventory`).
  - "View All" on Recent Orders → Navigates to `/admin/orders`.
  - "View All" on Service Requests → Navigates to `/admin/services?tab=requests`.
  - Action link on order row → Navigates to `/admin/orders/:id`.
  - Action link on service request row → Navigates to `/admin/services/requests/:id`.
- **API Endpoints Called**:
  - `GET /api/admin/dashboard/stats`
- **Known Issues & Limitations**:
  - Financial turnover numbers are masked with bullets (`•••`) if the logged-in staff member lacks financial permissions.

---

### 2. Products List (`/admin/products`)
- **URL**: `/admin/products`
- **Required Permission**: `products.view`
- **Features & Actions**:
  - **Product Catalog Table**: Columns for Product Image, Name (AR/EN), SKU, Category, Stock Level, Cost Price, Selling Price (EGP), Discount Badge, Active/Draft Status, and Actions.
  - **Search Bar**: Live text search matching product name, SKU, or description.
  - **Category Filter**: Dropdown filtering items by specific parent category.
  - **Stock Status Filter**: All, In Stock, Low Stock (≤ min threshold), Out of Stock.
  - **Visibility Filter**: All, Active (publicly visible), Draft / Inactive.
  - **Sorting**: Newest first, Price (low to high / high to low), Stock quantity.
  - **Pagination**: Server-side pagination at 20 products per page with item count display.
  - **Empty State**: Rendered when catalog or filtered results are empty with a direct creation button.
  - **Delete Confirmation**: Deleting an item triggers a branded confirmation dialog (`AdminConfirmDialog`).
- **Buttons & Triggers**:
  - "إضافة منتج" / "Add Product" → Primary yellow CTA navigating to `/admin/products/new`.
  - Row Action "Edit" (pencil icon) → Navigates to `/admin/products/:id`.
  - Row Action "Delete" (trash icon) → Opens confirmation modal; on approval calls delete endpoint.
  - "Reset Filters" button → Clears all active query parameters.
  - Pagination Controls → Previous / Next / Page buttons.
- **API Endpoints Called**:
  - `GET /api/admin/products` (Params: `page`, `limit`, `search`, `categoryId`, `status`, `stock`, `sort`)
  - `DELETE /api/admin/products/:id`
- **Known Issues & Limitations**:
  - Products linked to fulfilled order history records cannot be hard-deleted if database foreign keys enforce integrity; they should be marked inactive instead.

---

### 2.1 Product Creator & Editor (`/admin/products/new`, `/admin/products/:id`)
- **URL**: `/admin/products/new` (Creation) and `/admin/products/:id` (Modification)
- **Required Permission**: `products.create` (creation), `products.edit` (updates)
- **Features & Actions**:
  - **Bilingual General Info**: Product Title (AR & EN), Product Subtitle / Short Pitch.
  - **WYSIWYG Rich Editor** (`AdminRichEditor.vue`): Full formatting toolbar for detailed specifications, tables, lists, text alignments, and inline image uploads.
  - **Pricing & Margins**: Base Selling Price (EGP), Compare-At Price (original price for discount calculations), Cost Price (for profit margin tracking).
  - **Inventory Parameters**: SKU identifier, Barcode, Initial Stock Count, Minimum Reorder Threshold.
  - **Category Assignment**: Dropdown connecting product to its primary category.
  - **Media Gallery Manager**:
    - Multi-file image uploader with drag-and-drop.
    - Set primary cover photo.
    - Delete unwanted gallery images.
  - **Video Embedding**: Support for YouTube, Vimeo, or direct MP4 demonstration video URL.
  - **Technical Datasheets & Documentation**: Upload engineering PDF datasheets and manuals.
  - **Dynamic Attribute Builder**: Key-value table for hardware specifications (e.g., Voltage, Chipset, Dimensions) in English and Arabic.
  - **SEO & Social Metadata**: Custom meta title, meta description, and search engine preview.
  - **Publication Switches**: Is Active (publicly visible) and Is Featured.
- **Buttons & Triggers**:
  - Top "Save Changes" / "حفظ التعديلات" → Sticky primary yellow CTA button.
  - Bottom "Save Changes" / "حفظ التعديلات" → Duplicate primary yellow CTA button.
  - "Upload Images" dropzone button → Invokes file browser.
  - "Upload Document" button → Attaches PDF manual.
  - "Add Specification" button → Appends a new blank row to the specifications table.
  - "Back" button → Returns to `/admin/products`.
- **API Endpoints Called**:
  - `GET /api/admin/products/:id` (edit mode)
  - `POST /api/admin/products` (creation)
  - `PUT /api/admin/products/:id` (update)
  - `POST /api/admin/upload` (image and document asset upload)
  - `POST /api/admin/products/upload-inline-image` (rich editor inline uploads)
  - `GET /api/admin/categories` (for category selection)
- **Known Issues & Limitations**:
  - Images larger than 10MB must be scaled before uploading.

---

### 3. Categories Management (`/admin/categories`)
- **URL**: `/admin/categories`
- **Required Permission**: `categories.manage`
- **Features & Actions**:
  - **Category Table**: Columns for Cover Image, Arabic Name, English Name, URL Slug, Featured on Homepage Toggle, Sort Order, Actions.
  - **Add Category Modal**: Dialog with fields for English Name, Arabic Name, Custom Slug, Bilingual Descriptions, Sort Order, Featured checkbox, and Cover Image uploader.
  - **Edit Category Modal**: Reuses the modal pre-filled with existing record values.
  - **Quick In-Place Sort Order**: Numeric input in table cell; changing and pressing Enter updates order immediately.
  - **Featured Toggle**: Direct button in row to feature category on homepage.
  - **Delete Category**: Confirmation modal preventing accidental removal.
- **Buttons & Triggers**:
  - "إضافة فئة" / "Add Category" → Primary yellow CTA opening create modal.
  - Row Action "Edit" (pencil icon) → Opens edit modal.
  - Row Action "Delete" (trash icon) → Triggers deletion confirmation.
  - Modal "حفظ الفئة" / "Save Category" → Submits POST or PUT.
  - Modal "Cancel" / "إلغاء" → Discards changes and closes dialog.
- **API Endpoints Called**:
  - `GET /api/admin/categories`
  - `POST /api/admin/categories`
  - `PUT /api/admin/categories/:id`
  - `DELETE /api/admin/categories/:id`
  - `POST /api/admin/upload` (cover image upload)
- **Known Issues & Limitations**:
  - Categories containing assigned products cannot be deleted until products are reassigned or removed.

---

### 4. Orders Management (`/admin/orders`)
- **URL**: `/admin/orders`
- **Required Permission**: `orders.view`
- **Features & Actions**:
  - **Orders Table**: Order Reference (`#ORD-XXXX`), Creation Date, Customer Name, Total Amount (EGP), Payment Method & Payment Status, Order Status Badge, Actions.
  - **Status Tabs & Filters**: All, Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, Returned.
  - **Search**: Search by Order ID, Customer Name, or Phone Number.
  - **Pagination**: 20 orders per page.
  - **Real-Time Highlighting**: Newly arrived orders glow with green flash highlight.
- **Buttons & Triggers**:
  - Row Action "View Details" (eye icon) → Navigates to `/admin/orders/:id`.
  - Filter and search inputs with instant reactive updates.
- **API Endpoints Called**:
  - `GET /api/admin/orders` (Params: `page`, `limit`, `search`, `status`, `paymentStatus`)

---

### 4.1 Order Details (`/admin/orders/:id`)
- **URL**: `/admin/orders/:id`
- **Required Permission**: `orders.view` (read) and `orders.manage` (status changes / invoices)
- **Features & Actions**:
  - **Customer Profile**: Name, Primary Phone, Alternate Phone, Delivery Address, Governorate, City, Customer Notes.
  - **Financial Summary**: Subtotal, Delivery Fee, Discount Applied, Net Payable Amount.
  - **Ordered Products Table**: Image, Title, SKU, Unit Price, Quantity, Subtotal.
  - **Order Timeline & History**: Step-by-step audit record of lifecycle changes.
  - **Status Transition Selector**: Change order state (e.g., Pending → Confirmed → Shipped → Delivered).
  - **Invoice Generation**: Instantly generate official tax invoice linked to the order.
- **Buttons & Triggers**:
  - "حفظ الحالة" / "Save Status" → Submits PUT status update.
  - "إنشاء فاتورة" / "Create Invoice" (yellow button) → Generates invoice record and opens preview.
  - "تحميل PDF" / "Download PDF" → Exports official invoice document.
- **API Endpoints Called**:
  - `GET /api/admin/orders/:id`
  - `PUT /api/admin/orders/:id/status`
  - `POST /api/admin/invoices/from-order`
  - `GET /api/invoices/:id/pdf`

---

### 5. Quote Requests (`/admin/quotes`)
- **URL**: `/admin/quotes`
- **Required Permission**: `quotes.view`
- **Features & Actions**:
  - **Quotes Table**: Quote # (`#QTE-XXXX`), Customer / Corporate Name, Phone, Status Badge, Items Count, Total Value, Date.
  - **Status Filters**: All, Pending / New, In Review, Quoted, Accepted, Rejected, Expired.
  - **Search Bar**: Quick lookup by client, company, or quote ID.
- **Buttons & Triggers**:
  - "إنشاء عرض سعر جديد" / "Create New Quote" → Navigates to `/admin/quotes/new`.
  - Row Action "View Quote" → Navigates to `/admin/quotes/:id`.
- **API Endpoints Called**:
  - `GET /api/admin/quotes`

---

### 5.1 Manual Quote Generator (`/admin/quotes/new`)
- **URL**: `/admin/quotes/new`
- **Required Permission**: `quotes.manage`
- **Features & Actions**:
  - **Client Information**: Client Name, Organization / Factory, Tax Registration #, Commercial Record, Phone, Email, Delivery City.
  - **Line Items Builder**:
    - Select products directly from the store catalog or enter custom unlisted engineering items.
    - Set Quantity, Unit Cost, and Item Discount.
  - **Commercial Terms**: Validity Period (days), Payment Terms, Delivery Lead Time, VAT Rate calculation (default 14%).
  - **PDF Generation**: Generates dual-language official quotations (Arabic and English) with company header and stamp.
- **Buttons & Triggers**:
  - "إضافة سطر" / "Add Line Item" → Appends a line item.
  - "إنشاء وتصدير عرض السعر (PDF)" → Primary yellow submit CTA.
- **API Endpoints Called**:
  - `POST /api/admin/quotes`
  - `GET /api/admin/products` (catalog product lookup)
  - `GET /api/admin/quotes/:id/pdf`

---

### 5.2 Quote Details (`/admin/quotes/:id`)
- **URL**: `/admin/quotes/:id`
- **Required Permission**: `quotes.view`
- **Features & Actions**:
  - Full view of client RFQ or generated quotation.
  - Status management (Mark as Accepted, Rejected, Quoted).
  - Direct conversion of accepted quotes into an official Invoice.
  - PDF downloads in Arabic and English.
- **Buttons & Triggers**:
  - Status update buttons.
  - "تحويل إلى فاتورة" / "Convert to Invoice" button.
  - "تحميل PDF" / "Download PDF" buttons.
- **API Endpoints Called**:
  - `GET /api/admin/quotes/:id`
  - `PUT /api/admin/quotes/:id`
  - `POST /api/admin/invoices/from-quote`

---

### 6. Financials & Expenses (`/admin/financials`)
- **URL**: `/admin/financials`
- **Required Permission**: `financials.view` (read) and `financials.manage` (expenses management)
- **Features & Actions**:
  - **Date Selector**: Filter ledger by specific month and year.
  - **Financial KPI Cards**:
    - Gross Revenue (Sales volume).
    - Cost of Goods Sold (COGS based on product cost price).
    - Operating Expenses Total.
    - Net Profit / Loss (Green if positive, Red if negative).
  - **Revenue & Profit Trend Chart**: Visual performance graph.
  - **Sales by Product Table**: Units sold, total revenue, gross margin per item.
  - **Operating Expenses Ledger**:
    - Expense table: Category (Salaries, Rent, Utilities, Sourcing, Marketing, Tools, Other), Description, Amount (EGP), Date, Receipt attachment, Actions.
    - Add Expense modal dialog.
  - **Export to CSV**: Generates detailed spreadsheet of the selected period.
- **Buttons & Triggers**:
  - "إضافة مصروف" / "Add Expense" → Primary yellow CTA opening modal.
  - "تصدير تقرير (CSV)" → Downloads CSV file.
  - Modal "حفظ" / "Save" → Submits new expense.
  - Row Action "Delete" on expense → Removes expense item.
- **API Endpoints Called**:
  - `GET /api/admin/financials/summary`
  - `GET /api/admin/financials/sales`
  - `GET /api/admin/financials/costs`
  - `GET /api/admin/financials/chart`
  - `GET /api/admin/financials/export`
  - `GET /api/admin/expenses`
  - `POST /api/admin/expenses`
  - `DELETE /api/admin/expenses/:id`
- **Known Issues & Limitations**:
  - Accurate profit calculation requires cost prices to be set on product records.

---

### 7. Inventory & Stock Tracking (`/admin/inventory`)
- **URL**: `/admin/inventory`
- **Required Permission**: `inventory.view` or `products.view`
- **Features & Actions**:
  - **Inventory Table**: Product Image, Title, SKU, Category, Current Quantity, Minimum Stock Level, Unit Cost, Selling Price, Total Inventory Valuation (Cost × Stock).
  - **Stock KPI Cards**: Total Stock Units in Warehouse, Total Valuation in EGP, Low Stock Items count.
  - **Status Filter**: All, Low Stock (≤ threshold), Out of Stock (0).
  - **Search**: Quick search by title or SKU.
- **Buttons & Triggers**:
  - Search and filter inputs.
  - Row click → Quick navigation to edit product stock.
  - Pagination controls.
- **API Endpoints Called**:
  - `GET /api/admin/inventory`

---

### 8. Services & Maintenance (`/admin/services`)
- **URL**: `/admin/services`
- **Required Permission**: `services.view` (read), `services.manage` (status/requests), `services.config` (create/edit/fields)
- **Features & Actions**:
  - **Two Primary Tabs**:
    1. **Services Configuration**:
       - Engineering services table: Title (AR & EN), Active status, Featured (Sponsored) badge, Form fields count badge, Inquiries count badge, Actions.
       - Add Service modal: Title (AR/EN), Description (AR/EN), Visual Icon Picker (20 icons: Wrench, Cpu, Zap, Radio, Flame, Shield, Hammer, etc.), Card Background Color swatches (6 choices), Short Category Tag (AR/EN), Sort Order, Active & Featured checkboxes.
       - Edit Service modal: Opens pre-filled data and submits updates via PUT.
       - Share Link button (↗): Copies public landing page link.
       - Form Builder link: Accesses custom questionnaire builder.
       - Delete Service: Protected if linked requests exist.
    2. **Service Requests / Inquiries Tab**:
       - Table of customer service requests: Request ID, Service Type, Customer Name, Contact Phone, Submission Date, Status badge, Actions.
       - Filter by status (New, In Progress, Quoted, Completed, Cancelled).
  - **Dynamic Form Builder** (`/admin/services/:id/form`):
    - Create custom inquiry forms with fields: Text, Number, Phone, Email, Textarea, Dropdown Select, File Upload, Date.
    - Drag-and-drop reordering of questions.
  - **Request Review** (`/admin/services/requests/:id`):
    - Detailed review of answers, customer uploads, and lifecycle status updates.
- **Buttons & Triggers**:
  - "إضافة خدمة" / "Add Service" → Primary yellow CTA opening creation modal.
  - Row Action "تعديل" / "Edit" (pencil icon) → Opens edit modal.
  - Row Action "تعديل النموذج" / "Form Builder" → Navigates to `/admin/services/:id/form`.
  - Row Action "شير" / "Share" → Copies link to clipboard.
  - Row Action "حذف" / "Delete" → Deletes service if no requests exist.
- **API Endpoints Called**:
  - `GET /api/admin/services`
  - `POST /api/admin/services`
  - `PUT /api/admin/services/:id`
  - `DELETE /api/admin/services/:id`
  - `GET /api/admin/services/:id/form`
  - `POST /api/admin/services/:id/form/fields`
  - `PUT /api/admin/services/:id/form/fields/:fieldId`
  - `DELETE /api/admin/services/:id/form/fields/:fieldId`
  - `PUT /api/admin/services/:id/form/order`
  - `GET /api/admin/services/requests`
  - `GET /api/admin/services/requests/:id`
  - `PUT /api/admin/services/requests/:id/status`

---

### 9. Customer Contact Inbox (`/admin/inbox`)
- **URL**: `/admin/inbox`
- **Required Permission**: `inbox.view` (read) and `inbox.manage` (delete)
- **Features & Actions**:
  - **Inbox Table**: Sender Name (bold + blue dot indicator if unread), Phone Number, Message preview (truncated with line clamp), Date/Time, Status badge (Read / Unread), Actions.
  - **Tabs**: All, Unread (with count badge), Read.
  - **Message Detail Modal**:
    - Header in dark blue `#1e3a5f` with sender initials avatar, name, and phone.
    - Right-aligned timestamp badge.
    - Full text box with word wrapping.
    - Action buttons: Delete (red outline) and Close (blue outline).
  - **Automatic Read Marking**: Opening a message marks it as read and decrements the unread count.
  - **Manual Actions**: Mark as read row button, Delete message with confirmation dialog.
  - **Pagination**: 20 messages per page.
  - **Real-Time Sidebar Sync**: Unread badge count displayed on sidebar entry.
- **Buttons & Triggers**:
  - Filter tabs (All, Unread, Read).
  - Row click → Opens message modal.
  - Row Action "Mark as read" (envelope icon).
  - Row Action "Delete" (trash icon).
  - Modal Action "Delete" → Calls delete endpoint.
  - Modal Action "Close" → Closes dialog.
- **API Endpoints Called**:
  - `GET /api/admin/inbox` (Params: `page`, `limit`, `isRead`)
  - `PUT /api/admin/inbox/:id/read`
  - `DELETE /api/admin/inbox/:id`

---

### 10. Banners & Homepage Ticker (`/admin/banners`)
- **URL**: `/admin/banners`
- **Required Permission**: `banners.manage`
- **Features & Actions**:
  - **Banners Management Section**:
    - Table of promotional banners: Image preview, Placement (`top`, `below_hero`, `below_services`, `above_footer`), Container Width (`100%`, `75%`, `50%`), Active status, Actions.
    - Add / Edit Banner modal: Image upload, placement picker, width selector, target URL, scheduling dates.
    - Delete banner.
  - **Homepage Announcement Ticker Section**:
    - Enable/Disable ticker switch.
    - Bilingual message (Arabic & English).
    - Call to action link URL and button label.
    - Scroll animation speed slider (seconds).
    - Background color and text color pickers.
    - Live banner preview.
- **Buttons & Triggers**:
  - "إضافة بانر" / "Add Banner" → Primary yellow CTA opening modal.
  - "حفظ الشريط" / "Save Ticker" → Primary yellow CTA submitting ticker settings.
  - Row Actions "Edit" and "Delete".
- **API Endpoints Called**:
  - `GET /api/admin/banners`
  - `POST /api/admin/banners`
  - `PUT /api/admin/banners/:id`
  - `DELETE /api/admin/banners/:id`
  - `POST /api/admin/banners/upload`
  - `PUT /api/admin/settings/ticker`

---

### 11. Users & Access Control (`/admin/users`)
- **URL**: `/admin/users`
- **Required Permission**: `users.manage`
- **Features & Actions**:
  - **Staff Users Table**: Name, Email, Job Title, Permissions List Summary, Last Login Date, Active Status Badge, Actions.
  - **Add User Modal**: Name, Email, Password, Job Title, Super Admin toggle, granular checkboxes for 13 permission domains.
  - **Edit User Modal**: Update profile info, reset password, adjust permissions.
  - **Deactivate / Activate**: Instant toggle of staff access.
  - **Delete User**: Protected against deleting the currently authenticated account.
- **Buttons & Triggers**:
  - "إضافة مسؤول" / "Add User" → Primary yellow CTA opening creation modal.
  - Row Action "Edit" (pencil icon) → Opens edit modal.
  - Row Action "Delete" (trash icon) → Confirmation dialog and removal.
- **API Endpoints Called**:
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `PUT /api/admin/users/:id`
  - `DELETE /api/admin/users/:id`

---

### 12. Settings (`/admin/settings`)
- **URL**: `/admin/settings`
- **Required Permission**: `settings.view` (read) and `settings.manage` (save)
- **Features & Actions**:
  - **Tabbed Configuration Interface**:
    1. **General**: Brand Name (AR/EN), Tagline (AR/EN), Header & Dark Mode Logos, Tab Favicon, Primary Brand Color & Dark Palette pickers.
    2. **Store & Contact**: Official address, phone lines, support email, operating hours.
    3. **Payment Gateways**: Toggle Cash on Delivery (COD), Credit Card (Paymob), Mobile Wallets (Vodafone Cash, InstaPay) with custom payment instructions.
    4. **SEO & Social**: Meta title template, meta descriptions, OpenGraph share thumbnail.
    5. **Meta Pixel & CAPI**: Pixel ID, Server Conversions API Token, Test Event Code, Domain Verification Meta Tag.
    6. **Announcements**: Sliding multi-message top announcement bar with schedule controls.
    7. **Quote Templates**: Official legal terms, bank wire account info, and stamp details for exported PDF invoices.
- **Buttons & Triggers**:
  - Sticky bottom `AdminSettingsSaveBar.vue` with "حفظ التعديلات" / "Save Changes" yellow CTA (activates when changes exist).
  - File upload buttons for Logo, Favicon, and Hero background image.
- **API Endpoints Called**:
  - `GET /api/admin/settings`
  - `PUT /api/admin/settings/general`
  - `PUT /api/admin/settings/store`
  - `PUT /api/admin/settings/payment`
  - `PUT /api/admin/settings/seo`
  - `PUT /api/admin/settings/meta`
  - `PUT /api/admin/settings/contact`
  - `PUT /api/admin/settings/quotes`
  - `POST /api/admin/settings/logo`
  - `POST /api/admin/settings/favicon`
  - `POST /api/admin/settings/hero`
