# FINANCIALS AUDIT — Mango Electronics Admin (`/admin/financials`)

Date: 2026-10-06 · Scope: monthly summary cards, breakdowns, payroll, inventory valuation.

## Section 1 — Current State

Every number on the Financials page, audited against its data source:

| Field Name | Source | Real or Mock |
|---|---|---|
| إجمالي المبيعات (card + breakdown) | `Order` where `status = 'Delivered'`, `SUM(totalAmount)`, filtered by selected month/year on `updatedAt` (`server/api/admin/financials/summary.get.ts`) | Real |
| من X طلب مكتمل | `Order.count` where `status = 'Delivered'` in selected month/year | Real |
| تكلفة البضاعة المباعة COGS (card + breakdown) | `OrderItem` of delivered orders: `SUM(quantity × productCostSnapshot)` (`productCostSnapshot` written at checkout in `server/api/orders/index.post.ts`) | Real |
| إجمالي المرتبات (card) | `AdminUser` where `isActive = true AND salary > 0`: `SUM(salary)` — names never selected or exposed | Real |
| X موظف نشط (card subtitle) | `AdminUser.count` where `isActive = true AND salary > 0` | Real |
| المصاريف الأخرى | `Expense` in selected month + recurring expenses (`server/api/admin/expenses`) | Real |
| صافي الربح / هامش الربح | Calculated: sales − COGS − salaries − other expenses; margin = profit / sales | Real (derived) |
| تكلفة البضاعة المضافة للمخزون (info line) | `StockMovement` where `quantity > 0` in selected month: `SUM(quantity × costPrice)` | Real |
| Sales block table (product / qty / total) | `GET /api/admin/financials/sales` — delivered orders in month, grouped per product, paginated 10/page, COD/gateway filter | Real |
| Costs block table (product / qty / unit cost / total) | `GET /api/admin/financials/costs` — same source, `productCostSnapshot` based, paginated 10/page | Real |
| Goods margin row | Derived: sales total − cost total (same filter) | Real (derived) |
| 12-month chart (sales / costs / profit) | `GET /api/admin/financials/chart` — delivered orders + non-salary expenses per month | Real |

No hardcoded or mock figures remain on the page. (Prior state, now fixed: revenue mixed in accepted-quote totals and payroll came from the separate `Employee` table.)

## Section 2 — Missing Connections (found → fixed)

- إجمالي المبيعات → now strictly `Orders WHERE status = 'Delivered'`, `SUM(totalAmount)`, month/year filtered on delivery month (`updatedAt`). Previously mixed in accepted-quotation totals.
- تكلفة البضاعة المباعة → now `OrderItems` of delivered orders: `SUM(costPrice × quantity)` via `productCostSnapshot` captured at checkout.
- إجمالي المرتبات → now `Users (AdminUser) WHERE isActive = true AND salary > 0`, `SUM(salary)` only — no names selected, never rendered.
- تكلفة البضاعة المضافة للمخزون → new `StockMovement` ledger (`productId, quantity, costPrice, reason, user, createdAt`); logged on product create (initial stock), stock increases (adjustment), and delivery deductions; reported as `SUM(costPrice × quantity added)` grouped by month, shown as an informational line (excluded from profit).
- صافي الربح → now exactly `total sales − COGS − salaries − other expenses`.

## Section 3 — Fixes Implemented

- `prisma/schema.prisma` + migration `20261008000000_add_stock_movements`: new `StockMovement` model (relation + indexes).
- `server/api/admin/financials/summary.get.ts`: rewritten per Section 2 (Users payroll, orders-only revenue, `stockAdditions`, counts).
- `server/api/admin/products/index.post.ts` / `[id].put.ts`: write `StockMovement` rows on initial stock and stock increases.
- `server/api/admin/orders/[id]/status.put.ts`: delivery deduction now also logs negative `StockMovement` rows (`reason: 'delivery'`).
- `server/api/admin/financials/sales.get.ts`, `costs.get.ts` (new): paginated `{ data, meta }` per-product aggregates with COD/gateway filter.
- `server/api/admin/financials/chart.get.ts` (new): 12-month sales/costs/profit series.
- `app/pages/admin/financials.vue`: revenue card/counts now orders-only; costs block carries the stock-additions info line.

## Section 4 — Smoke Test

Performed 2026-10-06 against the live dev database (all fixtures removed afterwards):

| # | Check | Result |
|---|---|---|
| 1 | Created one `Delivered` order (2 × 1000 EGP) in current month | PASS — sales Δ = +2000 |
| 2 | إجمالي المبيعات reflects the new order total | PASS |
| 3 | COGS reflects items costPrice (2 × 600) | PASS — COGS Δ = +1200 |
| 4 | Salaries = sum of active users with salary (temp +9000 user detected) | PASS — salaries Δ = +9000, salaried users = 2 |
| 5 | Profit = sales − COGS − salaries | PASS (formula holds; negative value expected in dev DB with pre-existing payroll and no delivered sales) |
| 6 | Baseline restored after cleanup (order/product/user deleted) | PASS |

`npm run build`: complete, no errors.

## Section 5 — Summary of Changes

- `prisma/schema.prisma` — added `StockMovement` model + `Product.movements` relation.
- `prisma/migrations/20261008000000_add_stock_movements/` — new migration (table + indexes + FK), applied.
- `server/api/admin/financials/summary.get.ts` — rewritten to Section 2 spec (Users payroll, orders-only sales, stock additions).
- `server/api/admin/financials/sales.get.ts` — new paginated per-product sales endpoint (COD/gateway filter).
- `server/api/admin/financials/costs.get.ts` — new paginated per-product COGS endpoint with margin in meta.
- `server/api/admin/financials/chart.get.ts` — new 12-month series endpoint.
- `server/api/admin/products/index.post.ts` — logs initial-stock movement.
- `server/api/admin/products/[id].put.ts` — logs stock-increase movement.
- `server/api/admin/orders/[id]/status.put.ts` — delivery deduction logs negative movements.
- `app/pages/admin/financials.vue` — orders-only revenue subtitle, stock-additions info line in costs block.
- `FINANCIALS-AUDIT.md` — this report.
