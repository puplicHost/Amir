# Coding Agent Instructions: Phase 04 - Cart, Checkout & Orders

## Phase Command
Implement Phase 04 — Cart, Checkout & Orders.

## Objective
Implement Pinia-based cart, secure guest checkout, and comprehensive admin order management.

## Allowed Scope
- Cart store and persistence.
- Cart, Checkout, and Success pages.
- Server-side order creation API.
- Admin order list, detail, and status updates.
- Payment settings encryption and UI.

## Forbidden Scope
- Customer accounts/auth.
- Actual payment gateway integration (do not write Fawry/Paymob code).

## Required Skills
- `security-best-practices`

## Frontend Tasks
- Implement `stores/cart.ts` using Pinia.
- Build `/cart` page.
- Build `/checkout` page with form validation (Egyptian phone numbers, Governorates list).
- Build `/checkout/success` page.
- Build Admin Order list and detail views.
- Add Payment tab to Admin Settings.

## Backend Tasks
- Implement `POST /api/orders`.
- Create encryption/decryption utilities using `crypto` module (AES-256-GCM).
- Update Settings APIs to handle encrypted payment credentials securely.

## Database Tasks
- Transactional creation of `Order`, `OrderItem`, and `OrderStatusHistory`.
- Snapshot product name and price at the time of order.

## API Tasks
- Validate checkout payloads strictly.
- Recalculate all totals on the server.

## Security Tasks
- **NEVER** trust client-provided prices. Fetch by `productId` from DB.
- **NEVER** return decrypted payment credentials to the frontend.

## UI/UX Tasks
- Follow Stitch design for checkout flow.

## Business Rules
- Orders cannot be placed if the cart is empty.
- Status flow: Pending -> Processing -> Shipped -> Delivered (Cancelled anytime before Delivered).

## Validation
- Validate phone numbers: `/^01[0125][0-9]{8}$/`.

## Error Handling
- Show clear errors if product is out of stock/inactive during checkout.

## Verification
- Attempt checkout with forged prices.
- Verify cart persists.
- Update order status as Admin and check timeline.

## Acceptance Criteria
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

## Completion Criteria
Stop when all Acceptance Criteria are met and the shopping flow is secure and fully functional from end-to-end.

## Human Approval Points
- None required.

## Do Not
- Do not trust client prices.
- Do not leak payment credentials.
- Do not build customer login logic.