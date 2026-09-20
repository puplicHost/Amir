# Phase 2 — Authentication & Admin Shell

## 1. Overview

Implement the complete database schema, admin authentication with permission-based access control, and the functional Admin Panel shell with protected routing. After this phase, authorized admins can log in, see the dashboard shell, and navigate the sidebar. The permission system is fully operational.

## 2. Objective

A super-admin can log in at `/admin/login`, access the admin dashboard, and staff users with limited permissions see only what they're allowed to. All admin APIs are protected. The database schema covers all entities needed by the full project.

## 3. Scope

- Complete Prisma database schema (all models)
- Admin user model + password hashing
- Permission model
- Session-based authentication (Nuxt server sessions via h3)
- Admin login page
- Protected admin route middleware
- Permission-gated sidebar navigation
- Admin Dashboard shell (static layout, no real data yet)
- User Management page (CRUD)
- Database seed: initial super-admin user

**Out of scope:** Public pages, product/order/service business logic.

## 4. Required Frontend Work

### Pages

**`/admin/login`**
- Email + Password form
- Brand logo centered
- Submit → POST `/api/admin/auth/login`
- On success → redirect to `/admin`
- On error → show inline error message
- No registration (admin-only)

**`/admin`** (Dashboard shell)
- Stats widgets (placeholder values until Phase 5)
- Layout: 4 stat cards in a row (Orders, Pending, Service Requests, Products)

**`/admin/users`**
- Table: Name, Email, Last Login, Permission count, Active, Actions
- Actions: Edit permissions, Deactivate, Delete
- Create User button → modal form

**User Create/Edit Modal**
- Fields: Full Name, Email, Password (create only), Permissions (checkboxes grouped by section)
- Permission sections: Products, Orders, Services, Categories, Settings, Users

### Components
- `AdminPermissionGate.vue` — conditionally renders children based on user permission
- Update `AdminSidebar.vue` — hide nav items based on session permissions
- `AdminStatCard.vue` — reusable dashboard stat widget

### Middleware
- `admin-auth.ts` — Nuxt route middleware: checks session, redirects to `/admin/login` if not authenticated
- Apply to all `/admin/**` routes except `/admin/login`

## 5. Required Backend / Nitro Work

### Auth APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `POST /api/admin/auth/login` | POST | Authenticate admin, create session | None |
| `POST /api/admin/auth/logout` | POST | Destroy session | Required |
| `GET /api/admin/auth/session` | GET | Return current session user + permissions | Required |

### User Management APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api/admin/users` | GET | List all admin users | `users.manage` |
| `POST /api/admin/users` | POST | Create admin user | `users.manage` |
| `PUT /api/admin/users/[id]` | PUT | Update user info + permissions | `users.manage` |
| `DELETE /api/admin/users/[id]` | DELETE | Deactivate or delete user | `users.manage` |

### Server Utilities
- `server/utils/auth.ts` — session helpers: `requireAuth()`, `requirePermission(permission)`
- `server/utils/password.ts` — bcrypt hash/verify wrappers

## 6. Required Database Work

### Complete Prisma Schema

Define all models needed for the full project:

```
AdminUser {
  id, email, name, passwordHash, isActive, lastLoginAt, createdAt
  permissions: AdminPermission[]
}

AdminPermission {
  id, userId, permission (enum or string)
}

Category {
  id, nameAr, nameEn, slug, descriptionAr, descriptionEn,
  coverImagePath, coverVideoUrl, featuredOnHomepage, sortOrder, createdAt
  products: Product[]
}

Product {
  id, nameAr, nameEn, slug, descriptionAr, descriptionEn,
  price, compareAtPrice, categoryId, isActive, createdAt, updatedAt
  images: ProductImage[]
  attributes: ProductAttribute[]
  seo: ProductSeo?
}

ProductImage {
  id, productId, path, altAr, altEn, sortOrder, isCover
}

ProductAttribute {
  id, productId, keyAr, keyEn, valueAr, valueEn
}

ProductSeo {
  id, productId, metaTitleAr, metaTitleEn,
  metaDescriptionAr, metaDescriptionEn, keywords, geoContent
}

Order {
  id, orderNumber (unique), customerName, customerPhone,
  customerEmail, customerAddress, customerGovernorat,
  totalAmount, paymentMethod, status, createdAt, updatedAt
  items: OrderItem[]
  statusHistory: OrderStatusHistory[]
}

OrderItem {
  id, orderId, productId (nullable — product may be deleted later),
  productNameSnapshot, productPriceSnapshot, quantity, subtotal
}

OrderStatusHistory {
  id, orderId, status, changedAt, changedByUserId
}

Service {
  id, nameAr, nameEn, descriptionAr, descriptionEn,
  iconPath, isActive, sortOrder, createdAt
  formFields: ServiceFormField[]
  requests: ServiceRequest[]
}

ServiceFormField {
  id, serviceId, labelAr, labelEn, fieldType, isRequired,
  sortOrder, options (JSON — for select fields)
}

ServiceRequest {
  id, serviceId, status, submittedAt, updatedAt
  values: ServiceRequestValue[]
  attachments: ServiceRequestAttachment[]
}

ServiceRequestValue {
  id, requestId, fieldId, value (text)
}

ServiceRequestAttachment {
  id, requestId, filePath, originalName
}

SiteSettings {
  id (singleton — only 1 row), siteNameAr, siteNameEn,
  taglineAr, taglineEn, logoPath, faviconPath,
  contactPhone1, contactPhone2, contactWhatsapp, contactEmail,
  contactAddress, contactGovernorat, socialFacebook, socialInstagram,
  currency, paymentCodEnabled, paymentOnlineEnabled,
  paymentGatewayCredentials (encrypted JSON), updatedAt
}
```

- Run `prisma migrate dev`
- Create seed file: insert initial super-admin with all permissions + default SiteSettings row

## 7. API Requirements

Documented in Section 5.

## 8. UI Requirements

### Login Page
- Centered card, 400px wide, Mango Electronics logo/name at top
- Clean minimal layout — no decorative elements
- Email + Password inputs, styled per design system
- Submit button: full width, primary style
- Error state: red alert box above form

### Admin Layout (from Phase 1 shell, now functional)
- Sidebar shows user name + role at bottom
- Each nav item hides/shows based on session permissions
- Logout button in sidebar or top bar

### User Management Table
- Permissions column: shows count of assigned permissions
- Deactivated users: row dimmed, "Reactivate" action instead of "Edit"

## 9. Business Rules

1. Passwords stored as bcrypt hashes — never plaintext
2. Session-based auth via HTTP-only cookie
3. Logout destroys server-side session
4. Only `users.manage` permission holders can create/edit/delete users
5. A user cannot remove their own `users.manage` permission
6. Super-admin: first seeded user — all permissions, cannot be deleted
7. Deactivated users: session remains valid until expiry — log them out immediately on deactivation by invalidating session
8. Payment gateway credentials in SiteSettings must be stored encrypted, never returned raw in API responses

## 10. Implementation Guidelines

### Session Management
Use Nuxt's `useSession` / h3 session utilities.
Store in session: `{ userId, email, name, permissions: string[] }`

### Permission Check Pattern (server)
```
// server/utils/auth.ts
requirePermission(event, 'products.create')
// throws 403 if session lacks the permission
```

### Permission Check Pattern (client)
`AdminPermissionGate` wraps content:
```vue
<AdminPermissionGate permission="products.create">
  <AddProductButton />
</AdminPermissionGate>
```

### Sidebar Gating
Sidebar items map each link to a required permission. If user lacks it, the item is hidden (not just disabled).

### Migrations
Use `prisma migrate dev --name` for all schema changes.

## 11. Required Skills

- `security-best-practices` — password hashing, session security, permission model
- `api-security-review` — verify all admin API endpoints are properly protected

## 12. Testing Requirements

### Basic Verification
- Seed script runs cleanly, creates super-admin
- Login with correct credentials → session created, redirected to `/admin`
- Login with wrong credentials → 401, error shown
- Unauthenticated access to `/admin/dashboard` → redirect to `/admin/login`
- Permission-gated API returns 403 when user lacks permission
- Create a staff user with limited permissions → verify they can't access restricted APIs
- Logout destroys session → subsequent requests are rejected

### Heavy Testing
*Requires Human Approval before running.*

## 13. Acceptance Criteria

- [ ] Prisma schema covers all entities (as specified)
- [ ] Migrations run cleanly
- [ ] Seed creates super-admin with all permissions
- [ ] Default SiteSettings row seeded
- [ ] Admin can log in at `/admin/login`
- [ ] Auth cookie is HTTP-only
- [ ] Session middleware protects all `/admin/**` routes
- [ ] User without permission receives 403 from gated API
- [ ] Admin sidebar hides nav items based on permissions
- [ ] User management CRUD works (create, edit permissions, deactivate)
- [ ] Logout clears session
- [ ] No passwords or gateway credentials returned in API responses

## 14. Phase Completion Criteria

- Implementation complete
- Database migrated and seeded
- Basic verification complete
- No known blocking errors
- Acceptance criteria satisfied
- Heavy testing pending human approval
