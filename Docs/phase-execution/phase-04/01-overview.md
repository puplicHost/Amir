# Phase 04: Cart, Checkout & Orders

## Phase Identity
- **Phase number:** 04
- **Phase name:** Cart, Checkout & Orders
- **Source phase document:** `phase-04-cart-orders.md`
- **Dependencies:** Phase 03 (Products)
- **Position in overall project:** 4th phase. Closes the core e-commerce loop.

## Objective
Implement the complete shopping flow: client-side cart, guest checkout, server-side order placement, and admin order management. The payment configuration architecture is also established.

## Scope
- Cart store (Pinia + localStorage)
- Cart page and Checkout page
- Server-side price validation and order creation
- Order confirmation page
- Admin order management list and detail views
- Admin payment settings configuration

## Explicitly Out of Scope
- Actual Payment Gateway Integration (UI/Settings support it, but no integration is built).
- Customer accounts.

## Requirements
- **Confirmed:** Pinia persisted cart (localStorage).
- **Confirmed:** Server MUST re-validate prices against DB during checkout.
- **Confirmed:** Product name/price snapshotting into `OrderItem`.
- **Confirmed:** COD available by default.
- **Confirmed:** Egyptian governorate list and phone validation.

## User Impact
Customers can successfully place orders for products. Admins can view and process these orders.

## Architecture Impact
Introduces Pinia for client state. Extends Admin Settings to securely store payment credentials.

## Dependencies
- **Previous phases required:** Phase 03
- **Future phases depending on this phase:** None directly, though Phase 06 utilizes the dashboard stats.

## Risks
- Client-side price tampering (mitigated by server validation).
- Improper handling of encrypted credentials.

## Human Decisions
- None required for this phase.

## Acceptance Criteria
- Cart persists across page refresh
- Cart badge shows correct item count
- Cart page shows items with correct prices and subtotals
- Checkout form validates required fields
- Phone number validation works (Egyptian format)
- Order placed successfully → confirmation page with order number
- Server uses DB prices (not client-submitted prices)
- Product name and price snapshotted in OrderItem
- Order appears in Admin Panel
- Admin can update order status
- Status history recorded on each change
- Admin Dashboard shows real order counts
- Payment method toggle in Settings controls checkout options
- Payment credentials stored encrypted, never returned in API
- COD is available by default

## Definition of Done
Phase completes when orders can be placed securely (prices validated server-side), viewed in the admin panel, and progressed through status updates, while cart state persists properly on the client.