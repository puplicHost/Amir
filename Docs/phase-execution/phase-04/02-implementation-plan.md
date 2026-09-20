# Implementation Plan: Phase 04 - Cart, Checkout & Orders

## Architecture
- **Modules:** Cart (Client), Checkout/Orders (Fullstack), Admin Orders (Backend).
- **Responsibilities:** Maintain transient shopping state, securely validate and record transactions.
- **Data flow:** Cart (Pinia) -> Checkout Form -> POST `/api/orders` -> Server validates -> DB inserts.

## Frontend
- **State:** Pinia store `useCartStore` with `pinia-plugin-persistedstate`.
- **Pages:**
  - `/cart` (Review items, change quantity)
  - `/checkout` (Collect customer details)
  - `/checkout/success` (Confirmation)
  - `/admin/orders` (List/Filters)
  - `/admin/orders/[id]` (Detail/Status updates)
  - `/admin/settings` (Add Payment tab)
- **Validation:** Egyptian mobile format `01x-XXXXXXXX`.

## Google Stitch / Design System
- Follow Stitch designs for the Cart and Checkout flow. Ensure a clean, distraction-free checkout experience.

## Backend
- **APIs (Public):**
  - `POST /api/orders`
  - `GET /api/settings/payment`
- **APIs (Admin):**
  - `GET /api/admin/orders`, `GET [id]`, `PUT [id]/status`
  - Payment config in `/api/admin/settings/payment`
- **Logic:** `POST /api/orders` MUST discard client prices, fetch current prices from DB, and calculate totals.

## Database
- Models already exist (`Order`, `OrderItem`, `OrderStatusHistory`).
- Write transactional insert for `Order` + `OrderItem` + `OrderStatusHistory`.

## Security
- **Price Validation:** Critical. Never trust client payload prices.
- **Encryption:** Use `AES-256-GCM` with an `ENCRYPTION_KEY` env var to store payment credentials in `SiteSettings`.
- **Data Exposure:** Never return decrypted credentials to the frontend.

## Skills
```text
Skill: security-best-practices
Purpose: Secure credential storage and payload validation.
Used for: Order API and Settings API.
Phase tasks: Encryption/Decryption utilities, Server-side price validation.
```

## Implementation Order
1. Setup Pinia store and persisted state for Cart.
2. Build Public Cart UI (`/cart`).
3. Build Checkout UI (`/checkout`).
4. Implement `ENCRYPTION_KEY` utilities.
5. Implement `POST /api/orders` with strict server-side validation.
6. Build Order Success UI.
7. Implement Admin Order APIs.
8. Build Admin Orders UI (List and Detail).
9. Implement Admin Payment Settings UI and APIs.
10. Wire Dashboard stats.

## Verification
- Basic Verification:
  - Add to cart, refresh page, verify persistence.
  - Submit order with forged low prices via API client -> Verify DB uses real prices.
  - Verify payment credentials are masked in API responses.