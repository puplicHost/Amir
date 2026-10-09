> **Assumption (per task instructions):** no page description or screenshots were provided, so this audit is based on the actual implemented page in this repository — `app/pages/admin/financials.vue` (Summary + Expenses tabs) and its live endpoints: `summary`, `sales`, `costs`, `chart`, `transactions`, `export`, and expense CRUD.

# Financials & Expenses — Audit Report
## 1. Data Clarity
- Hero figures (balance, profit, spending, earning, transactions) are readable at a glance with large numerals and clear labels.
- Profit formula is shown step-by-step (Sales − COGS − Payroll = Net Profit), which is excellent for non-accountants.
- Chart tooltip has a real bug: English renders a duplicated year (e.g. "Jan 2025 2025").
- Two different definitions of "costs" coexist without explanation: the 12-month chart's cost line = COGS + other expenses (excludes payroll), while summary total expenses include payroll — readers will misread the chart.
- "Stock additions value" appears as unexplained info text; its exclusion from P&L is correct but never stated.
- Revenue is attributed by order `updatedAt` (delivery edit date), not order date — period figures can silently shift when old orders are edited.
- Full-Year mode has silent distortions: payroll and recurring expenses are counted once for the whole year instead of ×12, and the Excel export ignores month=0 and exports the current month with a "Monthly" filename.
- Money uses EGP everywhere with no currency label on some tiles; large figures are never compacted (e.g. 1.2M).
## 2. KPI Coverage
### Currently Present
- Total sales (delivered revenue), COGS, payroll total, other expenses, net profit, net margin %, delivered-order count, units sold, top products by sales, per-product cost/margin, 12-month sales/cost/profit trend, recent delivered transactions.
### Missing (with explanation of why each matters)
- **Gross profit / gross margin** (sales − COGS): the core trading-performance metric; net margin alone hides purchasing/pricing problems.
- **VAT/tax liability** (Egypt 14% VAT): no tax collected/owed tracking on orders; critical for legal filings — the single biggest compliance gap.
- **Refund/return rate and amounts**: no Refunded status exists, so returns are invisible and revenue is overstated when goods come back.
- **Average order value (AOV) and units per transaction**: essential for pricing and promotion decisions.
- **Cash flow view**: COD outstanding vs. collected vs. online-settled; COD-heavy stores live or die by this.
- **Shipping economics**: delivery fees collected vs. courier costs paid.
- **Discount/coupon impact**: markdowns reduce revenue silently with no dedicated line.
- **Payment-method revenue split**: COD vs. online share of revenue (filter exists on tables, but no KPI).
- **Profit by product/category ranking**: tables show sales leaders, not margin leaders.
- **Receivables/payables aging**: no supplier or courier-settlement tracking.
## 3. Admin UX Assessment
- Date presets (This Month / Last Month / This Year) plus month/year picker: fast and clear; active-pill state is visible.
- Amount eye-toggle for screen privacy is a strong touch for shared screens.
- Sales/costs tables paginate at 10 rows with tiny pager buttons and no search or sorting — slow for large catalogs.
- Chart hover works with mouse only; no touch or keyboard access to data points.
- Empty states are plain text with no guidance on what to do next (e.g. "no sales in this period").
- Expense modal is shared between tabs (good), but expense rows have no receipt/attachment support.
- No print-friendly statement view; export is Excel-HTML only, one month at a time, no CSV/PDF.
- icon-only table buttons have tooltips (good), but the 12-month chart has no data table fallback for screen readers.
## 4. Accountant Readiness Assessment
- No double-entry ledger, chart of accounts, or journal entries — an accountant cannot close books from this page.
- No VAT report and no tax-inclusive/exclusive handling — cannot prepare a tax filing.
- Expense create/edit/delete writes no audit-log entry (unlike products/categories) — weak audit trail.
- No supporting documents on expenses (receipts/invoices attachment) — fails basic substantiation.
- Payroll is an anonymous summed figure with no per-employee breakdown, pay-period, or deduction detail.
- No bank/cash reconciliation, no courier COD settlement tracking, no supplier payables.
- No fiscal-year lock, no approval workflow for expenses, no budget-vs-actual comparison.
- Single-currency (EGP) only — acceptable for a local store, blocking for cross-border.
- Verdict: usable as a management P&L dashboard, not as an accounting system of record.
## 5. Missing Features
- Custom date-range picker and month-over-month / year-over-year % deltas on hero KPIs.
- VAT report (collected, deductible, payable) with period export.
- Refund/return workflow with reason codes and refund-rate KPI.
- Cash-flow statement: operating inflow/outflow, COD outstanding, online settlements.
- P&L statement export (PDF) and CSV exports for sales, costs, expenses over custom ranges.
- Expense receipts upload, edit history, and category budgets with over-budget alerts.
- AOV, units-per-transaction, and profit-ranked product/category views.
- Search, sort, and larger page sizes on sales/costs tables.
- Accessible data-table alternative for the trend chart; touch support.
- Recurring-expense scheduler visibility (which recurring items apply to the viewed period).
## 6. Priority Fix Table
| # | Issue | Impact (H/M/L) | Effort (H/M/L) | Recommendation |
|---|-------|----------------|----------------|----------------|
| 1 | No VAT/tax tracking or report | H | M | Add order-level tax fields and a per-period VAT collected/payable report with export |
| 2 | Refunds invisible; revenue overstated on returns | H | M | Add Refunded status + reason codes, refund-rate KPI, exclude/refund-adjust revenue |
| 3 | Misleading period figures (chart costs exclude payroll; full-year counts payroll/recurring once; export ignores full-year) | H | L | Unify cost definitions, multiply recurring items per period, fix export range |
| 4 | No period comparison deltas on hero KPIs | H | M | Add MoM/YoY % change chips backed by the existing summary endpoint |
| 5 | Exports too narrow (one-month Excel-HTML only) | M | M | Add P&L PDF + CSV exports with custom date ranges, including expenses |
## 7. Final Score
- Admin Friendliness: **7/10** — readable hero KPIs, presets, and guided profit breakdown, dragged down by weak tables, chart accessibility, and silent full-year quirks.
- Accountant Readiness: **4/10** — solid P&L starting point, but no ledger, tax, audit trail on expenses, receipts, or reconciliation.
- Data Completeness: **6/10** — core sales/cost/profit present; missing tax, refunds, cash flow, AOV, and margin-ranked views.
