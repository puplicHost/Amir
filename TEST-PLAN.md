# Test Plan — Amir

## How to use this plan
- Test each item manually in the browser.
- Mark status: **✅ Pass** / **❌ Fail** / **⚠️ Partial**.
- Note any bug, visual defect, or discrepancy in the "Notes" column.

---

## Round 1 — Critical User Flows (Public)

### 1.1 Homepage loads correctly
- **Steps:**
  1. Open a browser and navigate to the base URL (`/` or `/ar` / `/en`).
  2. Verify the top announcement bar, navigation bar, hero section, services section, categories section, featured products, workflow steps, and footer render.
  3. Inspect hero background image, dark gradient overlay, and bottom curved SVG.
- **Expected result:**
  - Page loads with HTTP 200 without console errors or hydration mismatches.
  - Hero displays curved arch bottom seamlessly blending into the section below.
  - Tagline "Do It Right, Do It Smart" with horizontal divider lines appears centered above the headline.
  - Single primary CTA button "تصفح المنتجات" / "Explore Products" is present.
- **Pass criteria:** All homepage sections render visually intact, fonts load correctly, and hero SVG curve has no gaps.
- **Notes:**

---

### 1.2 Product browsing and filtering
- **Steps:**
  1. Click "المنتجات" / "Products" in the navbar to open `/products`.
  2. Select a category from the category filter sidebar/dropdown.
  3. Enter a search query in the search bar (e.g. "PLC" or "Arduino").
  4. Select a sort order (Price Low to High).
  5. Click on an individual category page via `/products/:slug`.
- **Expected result:**
  - Product catalog updates reactively without full page reloads.
  - Query parameters sync with the URL (`?category=...&search=...`).
  - Active filters display corresponding product cards with image, title, price, and Add to Cart button.
- **Pass criteria:** Filtered results match the selected criteria, sorting works correctly, and category hero renders with curved shape.
- **Notes:**

---

### 1.3 Add to cart and checkout (COD)
- **Steps:**
  1. Click "إضافة للسلة" / "Add to Cart" on any product card from the homepage or catalog.
  2. Verify the button changes state to "تمت الإضافة للسلة" / "Added to Cart" and navbar cart badge increments.
  3. Click the cart icon in the navbar to open `/cart`.
  4. Change product quantity, verify subtotal recalculation, and click "إتمام الطلب" / "Checkout".
  5. Fill in the checkout form: Full Name, Phone (valid Egyptian mobile 01xxxxxxxxx), Governorate, City, Full Address.
  6. Select "الدفع عند الاستلام" / "Cash on Delivery" and submit order.
- **Expected result:**
  - Order is placed successfully and customer is redirected to the Order Confirmation page (`/orders/confirmed` or `/orders/:id`).
  - A unique order reference `#ORD-XXXX` is generated.
  - Cart is cleared from local storage.
- **Pass criteria:** Order confirmation displays complete order details and new order appears in Admin with "Pending" status.
- **Notes:**

---

### 1.4 Service request submission
- **Steps:**
  1. Navigate to `/services` from the navbar.
  2. Select any service card and click "طلب الخدمة" / "Request Service".
  3. On the service page (`/services/:id`), fill in all dynamic questionnaire fields (Name, Phone, Requirements, Details).
  4. Attach a sample specification file/image if the service form includes a file upload.
  5. Submit the service inquiry form.
- **Expected result:**
  - Form validates required inputs and phone format before submission.
  - Submission completes with a success message/modal confirming receipt.
- **Pass criteria:** Request ID is generated and inquiry immediately appears in Admin under `/admin/services` (Service Requests tab).
- **Notes:**

---

### 1.5 Contact form submission
- **Steps:**
  1. Navigate to `/contact` from the navbar or footer.
  2. Verify the hero section renders with curved bottom shape and the contact card is centered (`max-w-[600px]`).
  3. Enter Name, Egyptian phone number (`01012345678`), and Message text.
  4. Click "إرسال الرسالة" / "Send Message".
- **Expected result:**
  - Submit button shows loading spinner during request.
  - Form clears on success and displays green toast: "تم إرسال رسالتك بنجاح — سنتواصل معك قريباً ✓".
  - If phone format is invalid, displays inline validation error.
- **Pass criteria:** Message is saved to the database and appears in Admin under `/admin/inbox` with unread status.
- **Notes:**

---

### 1.6 Quote request submission
- **Steps:**
  1. Navigate to the RFQ / Quote Request flow if available on public catalog or product detail page.
  2. Select products, specify requested quantities, and fill in company/client details.
  3. Submit quotation request.
- **Expected result:**
  - Customer receives confirmation with quotation reference `#QTE-XXXX`.
- **Pass criteria:** Quote request is recorded in database and visible in `/admin/quotes`.
- **Notes:**

---

## Round 2 — Admin Core Functions

### 2.1 Login and logout
- **Steps:**
  1. Open `/admin/login` in an incognito window.
  2. Attempt login with incorrect credentials.
  3. Enter valid admin credentials and submit.
  4. Verify successful redirection to `/admin`.
  5. Click the "تسجيل الخروج" / "Logout" button at the bottom of the sidebar.
- **Expected result:**
  - Invalid credentials display clear error message.
  - Valid login sets encrypted session cookie and opens dashboard.
  - Logout terminates session and redirects back to `/admin/login`.
- **Pass criteria:** Unauthenticated direct access to `/admin/*` redirects to `/admin/login`.
- **Notes:**

---

### 2.2 Add/Edit/Delete product (with images)
- **Steps:**
  1. In admin sidebar, go to "المنتجات" / "Products" (`/admin/products`).
  2. Click "إضافة منتج" / "Add Product" (`/admin/products/new`).
  3. Enter Bilingual Titles, SKU, Category, Selling Price (1000 EGP), Cost Price (700 EGP), Stock Count (15).
  4. Add rich description text in editor.
  5. Upload 2 product images, set one as cover image.
  6. Add 1 technical datasheet PDF.
  7. Add 2 specifications (e.g. Voltage: 220V).
  8. Click "حفظ المنتج" / "Save Product".
  9. Locate the created product in the products table and click "Edit".
  10. Change price to 1200 EGP and click "Save Changes".
  11. Return to catalog table and click delete icon, then confirm.
- **Expected result:**
  - Product creates without errors, appears in catalog, displays updated price upon edit, and deletes cleanly.
- **Pass criteria:** Image uploads succeed with Sharp processing, record persists in database, and delete action removes record.
- **Notes:**

---

### 2.3 Add/Edit/Delete category (with cover image)
- **Steps:**
  1. In admin sidebar, go to "الفئات" / "Categories" (`/admin/categories`).
  2. Click "إضافة فئة" / "Add Category".
  3. Enter Name (AR: "متحكمات دقيقة", EN: "Microcontrollers"), slug, upload cover image, and enable "Featured".
  4. Click "حفظ الفئة" / "Save Category".
  5. Verify category appears in table with thumbnail and featured badge.
  6. Click "Edit", modify Arabic title, and save.
  7. Click "Delete", confirm dialog.
- **Expected result:**
  - Modal opens, saves, updates, and deletes with immediate table reactivity.
- **Pass criteria:** Category renders on public homepage and catalog when active and removes cleanly upon deletion.
- **Notes:**

---

### 2.4 Order status management + invoice generation
- **Steps:**
  1. In admin sidebar, go to "الطلبات" / "Orders" (`/admin/orders`).
  2. Select an existing order and click "عرض التفاصيل" / "View Details" (`/admin/orders/:id`).
  3. Change status from "Pending" to "Confirmed", click "حفظ الحالة" / "Save Status".
  4. Change status to "Shipped" and save.
  5. Click "إنشاء فاتورة" / "Create Invoice".
  6. Verify invoice preview modal opens, then click "تحميل PDF" / "Download PDF".
- **Expected result:**
  - Status updates update the order timeline history.
  - Invoice record is created with correct tax, items, and total.
  - Official PDF downloads with proper Arabic & English formatting.
- **Pass criteria:** Order status reflects changes across dashboard and customer views; invoice PDF contains valid company header.
- **Notes:**

---

### 2.5 Quote management + convert to invoice
- **Steps:**
  1. In admin sidebar, go to "عروض الأسعار" / "Quote Requests" (`/admin/quotes`).
  2. Click "إنشاء عرض سعر جديد" / "Create New Quote" (`/admin/quotes/new`).
  3. Enter client name, company, tax number, and add 2 catalog items + 1 custom item.
  4. Click "إنشاء وتصدير عرض السعر (PDF)".
  5. Verify PDF download.
  6. Open the created quote in `/admin/quotes/:id`, set status to "Accepted".
  7. Click "تحويل إلى فاتورة" / "Convert to Invoice".
- **Expected result:**
  - Official PDF quote generated with 14% VAT.
  - Conversion creates a new Invoice record containing all quote line items.
- **Pass criteria:** Quote record is created, status updates persist, and conversion creates valid linked invoice.
- **Notes:**

---

### 2.6 Service requests inbox
- **Steps:**
  1. In admin sidebar, go to "الخدمات" / "Services" (`/admin/services`).
  2. Switch to the "طلبات الخدمات" / "Service Requests" tab.
  3. Click "عرض الطلب" / "Review" on the request submitted in Round 1.4.
  4. Review submitted customer answers and uploaded attachments.
  5. Update status to "In Progress" or "Quoted".
- **Expected result:**
  - All form answers match customer submission.
  - File attachments are downloadable.
  - Status updates successfully.
- **Pass criteria:** Request details render completely and status updates persist in database.
- **Notes:**

---

## Round 3 — Admin Advanced Features

### 3.1 Financials — monthly summary accuracy
- **Steps:**
  1. Go to "المالية والمصاريف" / "Financials" (`/admin/financials`).
  2. Verify Gross Sales matches sum of fulfilled orders for the current month.
  3. Verify COGS matches the product cost prices of fulfilled orders.
  4. Click "إضافة مصروف" / "Add Expense".
  5. Select category "صيانة وأدوات" / "Tools", enter amount 500 EGP, description, and save.
  6. Check that Total Expenses increases by 500 EGP and Net Profit decreases by 500 EGP.
  7. Click "تصدير تقرير (CSV)" / "Export Report".
- **Expected result:**
  - Mathematical formula `Net Profit = Gross Revenue - COGS - Total Expenses` holds true.
  - CSV file downloads with complete transaction logs.
- **Pass criteria:** Financial ledger numbers calculate accurately and CSV contains valid accounting columns.
- **Notes:**

---

### 3.2 Inventory stock movements
- **Steps:**
  1. Go to "المخزون" / "Inventory" (`/admin/inventory`).
  2. Check current stock level for a test product.
  3. Place a public store order containing 2 units of that product.
  4. Return to `/admin/inventory` and refresh.
  5. Verify stock quantity decreased by 2.
  6. If stock is ≤ minimum threshold, verify it appears under "Low Stock" filter.
- **Expected result:**
  - Inventory decrements automatically upon order checkout.
  - Inventory valuation recalculates in real time (`Quantity × Cost Price`).
- **Pass criteria:** Stock levels synchronize with order placements and low stock thresholds trigger alert flags.
- **Notes:**

---

### 3.3 Users and permissions
- **Steps:**
  1. Go to "المستخدمون" / "Users" (`/admin/users`).
  2. Click "إضافة مسؤول" / "Add User".
  3. Create staff user with only `orders.view` and `orders.manage` permissions (no financial, product, or settings access).
  4. Open incognito window, log in with the new staff account.
  5. Check sidebar navigation: only Orders should be accessible; Products, Settings, Financials should be hidden.
  6. Attempt direct navigation to `/admin/financials` or `/admin/settings`.
- **Expected result:**
  - Sidebar filters items based on assigned permissions.
  - Direct URL access to unauthorized pages is blocked with 403 Forbidden or redirect.
- **Pass criteria:** Granular permission system strictly prevents unauthorized read or write access.
- **Notes:**

---

### 3.4 Announcement bar management
- **Steps:**
  1. Go to "البنرات" / "Banners" (`/admin/banners`) or "الإعدادات → الإعلانات" (`/admin/settings`).
  2. Edit the announcement ticker text (AR & EN).
  3. Change background color to `#1e3a5f` and text color to `#FFFFFF`.
  4. Save ticker settings.
  5. Open public homepage in another tab and verify top ticker displays the updated text and colors.
- **Expected result:**
  - Public announcement bar updates immediately upon save.
- **Pass criteria:** Live ticker reflects edited copy, speed, and styling without errors.
- **Notes:**

---

### 3.5 Settings (logo, colors, contact info, payment toggle)
- **Steps:**
  1. Go to "الإعدادات" / "Settings" (`/admin/settings`).
  2. Under General: update brand tagline, upload a new favicon.
  3. Under Store: update workshop operating hours or phone number.
  4. Under Payment Methods: toggle Card Payment or Vodafone Cash on/off.
  5. Verify sticky bottom save bar appears with active "حفظ التعديلات" / "Save Changes" yellow CTA.
  6. Click "Save Changes".
  7. Check public `/contact` and checkout pages to verify updated info and payment options.
- **Expected result:**
  - Changes persist in database.
  - Toggled payment methods appear or disappear from checkout.
- **Pass criteria:** Settings update across public pages and API cache invalidates properly.
- **Notes:**

---

### 3.6 Admin Inbox (contact messages + FCM notification)
- **Steps:**
  1. Verify the unread badge count in sidebar next to "صندوق الوارد" / "Inbox".
  2. Submit a new contact message on public `/contact`.
  3. Verify unread badge increments by 1.
  4. Go to `/admin/inbox`.
  5. Verify new message appears at the top with bold styling and blue dot indicator.
  6. Click the message row: verify styled modal opens (`max-w-lg`, dark blue `#1e3a5f` header, initials avatar, phone, formatted message box).
  7. Close modal and verify message row is now marked read and badge decrements.
  8. Click delete icon on message row, confirm dialog, verify message is removed.
- **Expected result:**
  - Real-time unread count syncs between inbox page and sidebar badge.
  - Message modal renders with requested design.
  - Delete action cleanly deletes record from `ContactMessage` table.
- **Pass criteria:** Inbox CRUD, unread counting, and modal styling function without errors.
- **Notes:**

---

## Round 4 — UI/UX & Responsive

### 4.1 Mobile layout (375px width)
- **Steps:**
  1. Open DevTools, toggle Device Mode, and set screen width to 375px (iPhone SE).
  2. Test Homepage:
     - Header and logo scale correctly without clipping.
     - Services grid displays 2 cards per row (`grid-cols-2`), padding `p-3`, titles `text-sm line-clamp-2`, bullets hidden.
     - Categories grid displays 2 cards per row (`grid-cols-2`), card height `h-32`.
     - Products grid displays 2 cards per row (`grid-cols-2`), titles `text-xs line-clamp-2`, prices clear, category chip hidden.
     - Workflow grid displays 2 cards per row (`grid-cols-2`).
  3. Test Admin Panel:
     - Mobile hamburger button opens slide-out drawer.
     - Tables allow horizontal swipe without breaking viewport width (`overflow-x-auto`).
- **Expected result:**
  - No horizontal page scroll on body (`overflow-x: hidden`).
  - All text, badges, and action buttons fit comfortably without overlapping.
- **Pass criteria:** 375px viewport displays compact 2-column cards on public homepage and clean responsive admin drawer.
- **Notes:**

---

### 4.2 Dark mode toggle (admin only)
- **Steps:**
  1. Navigate to public pages (`/`, `/products`, `/contact`, `/services`). Verify that no dark mode toggle button exists in public navbar or drawer.
  2. Open Admin Panel (`/admin`).
  3. Click the Sun/Moon toggle button in the top admin header.
  4. Verify admin switches between light background (`#F8FAFC` / white) and dark background (`#0B1520` / `#162032`).
  5. Verify table borders, cards, and text contrast remain legible.
- **Expected result:**
  - Public pages default to light mode with no visible theme toggle.
  - Admin header allows toggling theme and persists preference in storage.
- **Pass criteria:** Public navbar has no theme switch; admin theme toggles cleanly with WCAG AA contrast.
- **Notes:**

---

### 4.3 Arabic/English language switch
- **Steps:**
  1. Click the Language switch button in public navbar (switch between "English" and "العربية").
  2. Verify HTML `dir` attribute updates (`rtl` for Arabic, `ltr` for English).
  3. Verify text alignment, icon rotations (e.g. arrows), and layout mirror seamlessly.
  4. Switch language in admin header.
- **Expected result:**
  - Route prefix updates (`/ar/*` ↔ `/en/*`).
  - Translations update across navigation, buttons, and headings.
  - Chevrons and arrow icons invert direction properly in RTL.
- **Pass criteria:** Zero untranslated fallback strings on core pages and correct RTL/LTR visual flow.
- **Notes:**

---

### 4.4 Empty states (no products, no orders, etc.)
- **Steps:**
  1. Test empty states across admin tables by applying impossible search queries (e.g. search for "xyz99999"):
     - Products list (`/admin/products`)
     - Orders list (`/admin/orders`)
     - Quotes list (`/admin/quotes`)
     - Services requests (`/admin/services`)
     - Customer Inbox (`/admin/inbox`)
  2. Test public product catalog search with zero results.
- **Expected result:**
  - Clean centered empty state component (`AdminEmptyState.vue`) renders with relevant icon, descriptive text, and reset action.
  - Table headers remain intact or gracefully collapse without JavaScript exceptions.
- **Pass criteria:** All empty states render informative messages and offer a recovery action button.
- **Notes:**

---

### 4.5 Error handling (wrong URL, server error)
- **Steps:**
  1. Navigate to a non-existent route: `/some-random-broken-path-123`.
  2. Navigate to a non-existent product slug: `/p/non-existent-product-slug`.
  3. Navigate to a non-existent category: `/products/invalid-category-slug`.
  4. Submit an invalid payload via curl or disabled JavaScript to `/api/contact`.
- **Expected result:**
  - 404 errors render the custom branded error page (`app/error.vue`) with "Page Not Found", status 404, and "Go Back Home" CTA.
  - Invalid API requests return structured JSON `{ statusCode: 400, message: '...' }` without unhandled server crashes.
- **Pass criteria:** Error pages display without Nuxt default crash screens; no internal 500 ENOENT errors.
- **Notes:**

---

## Round 5 — Performance & SEO

### 5.1 Homepage load time
- **Steps:**
  1. Open Chrome DevTools → Network tab (Disable Cache, Throttling: Fast 3G).
  2. Reload homepage (`/`).
  3. Observe DOMContentLoaded, Largest Contentful Paint (LCP), and total transfer size.
- **Expected result:**
  - LCP is below 2.5 seconds on broadband / fast connections.
  - First paint occurs without flash of unstyled content (FOUC).
  - Nitro SSR pre-renders critical HTML structure.
- **Pass criteria:** LCP < 2.5s on desktop broadband, total initial payload < 1.5MB gzip.
- **Notes:**

---

### 5.2 Product page meta tags and structured data
- **Steps:**
  1. Open any product detail page (`/p/:slug`).
  2. View page source (`Ctrl+U` / `Cmd+U`).
  3. Inspect `<head>` tags:
     - `<title>` matches product name + brand.
     - `<meta name="description">` contains product summary.
     - `<meta property="og:title">`, `<meta property="og:image">`, `<meta property="og:url">`.
  4. Verify Schema.org structured data JSON-LD (`"@type": "Product"` or `"Organization"`).
- **Expected result:**
  - All SEO and OpenGraph tags are populated server-side in the initial SSR HTML.
- **Pass criteria:** SSR source contains complete SEO meta tags and valid JSON-LD schema.
- **Notes:**

---

### 5.3 Sitemap.xml accessible
- **Steps:**
  1. In the browser, navigate to `/sitemap.xml`.
  2. Inspect XML response.
- **Expected result:**
  - Returns valid XML with `Content-Type: application/xml` or `text/xml`.
  - Lists all active public routes (`/`, `/products`, `/services`, `/contact`) and dynamic product/category URLs.
- **Pass criteria:** HTTP 200 response with valid, parseable XML format.
- **Notes:**

---

### 5.4 robots.txt correct
- **Steps:**
  1. In the browser, navigate to `/robots.txt`.
  2. Inspect directives.
- **Expected result:**
  - Allows search crawlers on public store routes (`Allow: /`).
  - Disallows crawlers on private admin routes (`Disallow: /admin`).
  - References the sitemap (`Sitemap: https://.../sitemap.xml`).
- **Pass criteria:** Robots file correctly protects `/admin` while enabling public indexing.
- **Notes:**

---

### 5.5 Images lazy loading
- **Steps:**
  1. Open homepage or product catalog page in DevTools Network tab (Filter: Img).
  2. Clear network log and reload page without scrolling.
  3. Observe loaded images.
  4. Scroll down slowly toward below-the-fold sections and footer.
- **Expected result:**
  - Critical above-the-fold assets (logo, hero image) load immediately.
  - Below-the-fold product card images and category covers have `loading="lazy"` and load on demand as viewport approaches them.
- **Pass criteria:** Off-screen images are not fetched until scrolled into view, reducing initial bandwidth consumption.
- **Notes:**
