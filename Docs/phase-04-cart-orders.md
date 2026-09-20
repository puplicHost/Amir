# Phase 4 — Cart, Checkout & Orders

## 1. Overview

Implement the complete shopping flow: cart (client-side, no login required), checkout with customer info collection, order placement, and order management in the Admin Panel. Payment architecture is established to support COD now and online payment later, controlled via Settings.

## 2. Objective

Customers can add products to cart, proceed to checkout, and place orders without creating an account. Orders appear in the Admin Panel with full customer and item details. Admin can view and update order statuses. Payment configuration is managed through Settings.

## 3. Scope

**Public:**
- Cart (Pinia store, persisted to localStorage)
- Cart page
- Checkout page
- Order confirmation page

**Admin:**
- Order management list
- Order detail view
- Order status updates
- Payment configuration in Settings

**Out of scope:** Services, homepage final build, payment gateway integration (architecture only).

## 4. Required Frontend Work

### Cart Store (`stores/cart.ts`)
- State: array of `{ productId, slug, nameAr, nameEn, price, coverImage, quantity }`
- Actions: `addItem`, `removeItem`, `updateQuantity`, `clearCart`
- Getters: `itemCount`, `subtotal`, `totalAmount`
- Persisted to `localStorage` via Pinia plugin

### Cart Navbar Badge
- Shows `itemCount` from cart store
- Animated +1 on add
- Yellow badge (`#F5CC07`) with dark text, positioned on cart icon

### `/cart`
- Items list: product thumbnail, name (current locale), unit price, quantity stepper (+/-), line total, remove button
- Empty state: "Your cart is empty" + "Browse Products" button
- Order summary sidebar/section: subtotal, total
- "Proceed to Checkout" button — primary CTA

### `/checkout`
- **Customer Info form:**
  - Full Name (required)
  - Phone Number (required, Egyptian format validation)
  - Governorate — select input (Egyptian governorates list)
  - Address / More Details (optional textarea)
  - Email (optional)
- **Order Summary:** list of items, subtotal, total (read-only)
- **Payment Method:**
  - Rendered dynamically based on Settings (from `GET /api/settings/payment`)
  - COD: "Cash on Delivery — Pay when your order arrives"
  - Online: only shown if enabled in settings (gateway integration TBD)
  - If only one method enabled: auto-selected, no UI choice needed
- **"Place Order" button:** primary, full width
- Client-side validation before submit

### `/checkout/success`
- Order number displayed prominently
- Items summary
- Customer name
- Payment method confirmed
- Message: "Our team will contact you to confirm the order details and delivery."
- "Continue Shopping" button → `/products`

### Admin Pages

**`/admin/orders`**
- Table: Order #, Customer Name, Phone, Governorate, Item Count, Total, Payment Method, Status, Date
- Filter: Status (All, Pending, Processing, Shipped, Delivered, Cancelled), Date range
- Search: by order number or customer name/phone
- Pagination (25/page)
- Click row → Order Detail

**`/admin/orders/[id]`**
- Customer info section
- Ordered items table: product name (snapshot), unit price, quantity, subtotal
- Order totals
- Payment method + status
- Status timeline (shows history)
- Status update: select new status → "Update Status" button
- Confirmation modal for status changes

**Settings → Payment Tab** (extends Phase 2 Settings shell)
- Enable/Disable COD toggle
- Enable/Disable Online Payment toggle
- Online Payment Gateway section (hidden when disabled):
  - Gateway name (text input — for display purposes)
  - API Key (masked input)
  - Secret Key (masked input)
  - Mode: Sandbox / Production
  - "Save Credentials" button
- Warning: "Credentials are stored encrypted. They are never visible after saving — re-enter to update."

**Admin Dashboard** (update from Phase 2 shell)
- Wire up real data:
  - Total Orders (all time)
  - Pending Orders (status = Pending)
  - Today's Revenue (sum of Delivered orders' totals, today)
  - Total Products count

## 5. Required Backend / Nitro Work

### Public Order APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `POST /api/orders` | POST | Place order | None |
| `GET /api/settings/payment` | GET | Get enabled payment methods (no credentials) | None |

### Admin Order APIs

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api/admin/orders` | GET | List orders with filters | `orders.view` |
| `GET /api/admin/orders/[id]` | GET | Order detail | `orders.view` |
| `PUT /api/admin/orders/[id]/status` | PUT | Update order status | `orders.manage` |

### Settings APIs (Payment)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `GET /api/admin/settings/payment` | GET | Payment config (credentials masked) | `settings.view` |
| `PUT /api/admin/settings/payment` | PUT | Update payment config | `settings.manage` |

### Order Placement Logic (`POST /api/orders`)
1. Validate customer info (name, phone, governorate required)
2. Validate `items` array: each item must have `productId` and `quantity`
3. Re-fetch prices from DB for each product (never trust client-side prices)
4. Calculate total server-side
5. Validate payment method is enabled in settings
6. Create `Order` + `OrderItem` records (use product name/price snapshots)
7. Create initial `OrderStatusHistory` entry (status: Pending)
8. Return order number

### Order Number Generation
Format: `ME-YYYYMMDD-XXXXX` (sequential within day, or random 5 chars). Must be unique.

### Payment Credential Storage
- Store in `SiteSettings.paymentGatewayCredentials` as encrypted JSON
- Encrypt using `AES-256-GCM` with `ENCRYPTION_KEY` env variable
- Never return raw credentials via any API
- Return only: `{ hasCredentials: boolean, gatewayName: string, mode: 'sandbox'|'production' }`

## 6. Required Database Work

No new models. Indexes already defined in Phase 2 schema:
- `Order.status` — indexed for filter queries
- `Order.createdAt` — indexed for date range queries
- `Order.orderNumber` — unique

Add env variable: `ENCRYPTION_KEY` (32-byte hex string).

## 7. API Requirements

Documented in Section 5.

**POST /api/orders** request body:
```json
{
  "customer": {
    "name": "...",
    "phone": "...",
    "governorate": "...",
    "address": "...",
    "email": "..."
  },
  "items": [
    { "productId": "...", "quantity": 2 }
  ],
  "paymentMethod": "COD"
}
```

**Response:**
```json
{
  "orderNumber": "ME-20240920-ABC12",
  "totalAmount": 450.00
}
```

## 8. UI Requirements

- Cart quantity stepper: cannot go below 1 (remove button for 0)
- Cart persists across page refreshes (localStorage)
- Checkout phone field: validate Egyptian mobile format (01x-XXXXXXXX)
- Governorate dropdown: all 27 Egyptian governorates
- Order confirmation page: clear, reassuring, no marketing clutter
- Admin order status select: color-coded (Pending=yellow, Processing=blue, Shipped=purple, Delivered=green, Cancelled=red)
- Status history: timeline-style display with date/time

## 9. Business Rules

1. No customer account required at any point
2. Product prices are re-validated server-side on order placement
3. Product name and price are snapshotted into `OrderItem` — historical order data remains accurate even if product is later edited or deleted
4. Order cannot be placed if cart is empty
5. Order cannot be placed if selected payment method is disabled in settings
6. COD enabled by default on initial seed
7. Order status lifecycle: `Pending → Processing → Shipped → Delivered` (Cancelled can occur at any pre-Delivered stage)
8. Dashboard revenue counts only `Delivered` orders (confirmed received + paid)
9. Payment credentials: never logged, never returned in any API response

## 10. Implementation Guidelines

### Cart Persistence
Use `pinia-plugin-persistedstate` with `localStorage` strategy. Expire cart after 7 days (optional — TBD by Stitch design decision).

### Price Validation on Server
When placing order, always call `prisma.product.findMany({ where: { id: { in: productIds } } })` and use DB prices, not client-submitted prices.

### Egyptian Governorates List
Static array in `shared/constants/governorates.ts` — used in both checkout form (public) and service forms (Phase 5).

### Payment Architecture Note
The payment gateway integration is intentionally not implemented now. The `paymentMethod` field on Order supports future online payment. When online payment is enabled in Settings, the checkout UI shows the option. Actual gateway integration is a future phase/task.

## 11. Required Skills

- `security-best-practices` — credential encryption, price validation
- `api-security-review` — order placement endpoint

## 12. Testing Requirements

### Basic Verification
- Add item to cart → badge updates, item appears in cart page
- Update quantity → totals recalculate
- Remove item → item gone
- Empty cart → checkout button disabled or redirects
- Place order with valid data → order created, confirmation page shows order number
- Place order with tampered price in request → server uses DB price (not client price)
- Admin sees order in table
- Admin updates order status → status history records change
- Payment config saved → credentials not returned in GET response

### Heavy Testing
*Requires Human Approval before running.*

## 13. Acceptance Criteria

- [ ] Cart persists across page refresh
- [ ] Cart badge shows correct item count
- [ ] Cart page shows items with correct prices and subtotals
- [ ] Checkout form validates required fields
- [ ] Phone number validation works (Egyptian format)
- [ ] Order placed successfully → confirmation page with order number
- [ ] Server uses DB prices (not client-submitted prices)
- [ ] Product name and price snapshotted in OrderItem
- [ ] Order appears in Admin Panel
- [ ] Admin can update order status
- [ ] Status history recorded on each change
- [ ] Admin Dashboard shows real order counts
- [ ] Payment method toggle in Settings controls checkout options
- [ ] Payment credentials stored encrypted, never returned in API
- [ ] COD is available by default

## 14. Phase Completion Criteria

- Implementation complete
- Basic verification complete
- No known blocking errors
- Acceptance criteria satisfied
- Heavy testing pending human approval
