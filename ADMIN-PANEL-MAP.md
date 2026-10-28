# Admin Panel Map — Amir

> **PARTIALLY STALE — see `ADMIN_UX_REFACTOR_REPORT.md` for the current map.**
> This map predates the current panel: it omits `/admin/schedule`,
> `/admin/staff`, `/admin/team`, `/admin/expenses`, `/admin/activity`,
> `/admin/notifications`, `/admin/my-bookings`, `/admin/calendar` and the
> booking-operations dashboard section. Users and Staff are now merged into
> `/admin/team` (tabs `?tab=users` / `?tab=staff`).

## Overview
This document maps every page, view, component, action, and API endpoint in the Amir Admin Panel (`/admin`). The admin panel is a private, role-based single-page application built with Nuxt 4, Vue 3, Tailwind CSS, and Prisma ORM on PostgreSQL. Access requires an authenticated session with active staff status and specific granular permissions.

---

## Pages & Features

### 1. Dashboard (`/admin`)
- **URL**: `/admin` (or `/ar/admin`, `/en/admin`)
- **Required Permission**: Any valid admin session
- **Features & Actions**:
  - **KPI Metric Overview**: Top cards displaying Total Products, Total Categories, and Active Services count.
  - **Quick Actions**: Shortcuts to Add Product, Manage Categories, Manage Services, and Platform Settings.
- **Buttons & Triggers**:
  - Metric Card Clicks → Deep-link to corresponding submodules (`/admin/products`, `/admin/categories`, `/admin/services`).
- **API Endpoints Called**:
  - `GET /api/admin/dashboard/stats`

---

### 2. Products List (`/admin/products`)
- **URL**: `/admin/products`
- **Required Permission**: `products.view`
- **Features & Actions**:
  - **Product Catalog Table**: Columns for Product Image, Name (AR/EN), Category, Selling Price (EGP), Active/Draft Status, Last Modified, and Actions.
  - **Search Bar**: Live text search matching product name, slug, or description.
  - **Category Filter**: Dropdown filtering items by specific parent category.
  - **Visibility Filter**: All, Active (publicly visible), Draft / Inactive.
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
  - `GET /api/admin/products` (Params: `page`, `limit`, `search`, `categoryId`, `status`)
  - `DELETE /api/admin/products/:id`

---

### 2.1 Product Creator & Editor (`/admin/products/new`, `/admin/products/:id`)
- **URL**: `/admin/products/new` (Creation) and `/admin/products/:id` (Modification)
- **Required Permission**: `products.create` (creation), `products.edit` (updates)
- **Features & Actions**:
  - **Bilingual General Info**: Product Title (AR & EN), Product Subtitle / Short Pitch.
  - **WYSIWYG Rich Editor** (`AdminRichEditor.vue`): Full formatting toolbar for detailed specifications, tables, lists, text alignments, and inline image uploads.
  - **Pricing**: Base Selling Price (EGP).
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

### 4. Services (`/admin/services`)
- **URL**: `/admin/services`
- **Required Permission**: `services.view` (read), `services.manage`, `services.config` (create/edit)
- **Features & Actions**:
  - **Services Configuration**:
     - Services table: Title (AR & EN), Active status, Featured (Sponsored) badge, Actions.
     - Add Service modal: Title (AR/EN), Description (AR/EN), Visual Icon Picker, Card Background Color swatches, Short Category Tag (AR/EN), Sort Order, Active & Featured checkboxes.
     - Edit Service modal: Opens pre-filled data and submits updates via PUT.
     - Delete Service with confirmation dialog.
- **Buttons & Triggers**:
  - "إضافة خدمة" / "Add Service" → Primary yellow CTA opening creation modal.
  - Row Action "تعديل" / "Edit" (pencil icon) → Opens edit modal.
  - Row Action "حذف" / "Delete" → Deletes service after confirmation.
- **API Endpoints Called**:
  - `GET /api/admin/services`
  - `POST /api/admin/services`
  - `PUT /api/admin/services/:id`
  - `DELETE /api/admin/services/:id`

---

### 5. Customer Contact Inbox (`/admin/inbox`)
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

### 6. Banners & Homepage Ticker (`/admin/banners`)
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

### 7. Users & Access Control (`/admin/users`)
- **URL**: `/admin/users`
- **Required Permission**: `users.manage`
- **Features & Actions**:
  - **Staff Users Table**: Name, Email, Job Title, Permissions List Summary, Last Login Date, Active Status Badge, Actions.
  - **Add User Modal**: Name, Email, Password, Job Title, Super Admin toggle, granular checkboxes for 7 permission groups (products, services, categories, banners, settings, users; plus inbox via role presets).
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

### 8. Settings (`/admin/settings`)
- **URL**: `/admin/settings`
- **Required Permission**: `settings.view` (read) and `settings.manage` (save)
- **Features & Actions**:
  - **Tabbed Configuration Interface**:
    1. **General**: Brand Name (AR/EN), Tagline (AR/EN), Header & Dark Mode Logos, Tab Favicon, Primary Brand Color & Dark Palette pickers.
    2. **Store & Contact**: Official address, phone lines, support email, operating hours.
    3. **SEO & Social**: Meta title template, meta descriptions, OpenGraph share thumbnail.
    4. **Meta Pixel & CAPI**: Pixel ID, Server Conversions API Token, Test Event Code, Domain Verification Meta Tag.
    5. **Announcements**: Sliding multi-message top announcement bar with schedule controls.
- **Buttons & Triggers**:
  - Sticky bottom `AdminSettingsSaveBar.vue` with "حفظ التعديلات" / "Save Changes" yellow CTA (activates when changes exist).
  - File upload buttons for Logo, Favicon, and Hero background image.
- **API Endpoints Called**:
  - `GET /api/admin/settings`
  - `PUT /api/admin/settings/general`
  - `PUT /api/admin/settings/store`
  - `PUT /api/admin/settings/seo`
  - `PUT /api/admin/settings/meta`
  - `PUT /api/admin/settings/contact`
  - `POST /api/admin/settings/logo`
  - `POST /api/admin/settings/favicon`
  - `POST /api/admin/settings/hero`
