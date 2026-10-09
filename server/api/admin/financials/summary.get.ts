export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.view')
  const q = getQuery(event)
  const now = new Date()
  const isFullYear = q.month !== undefined && Number(q.month) === 0
  const month = isFullYear ? 1 : Math.min(12, Math.max(1, Number(q.month) || now.getMonth() + 1))
  const year = Math.max(2000, Math.min(2100, Number(q.year) || now.getFullYear()))
  const start = isFullYear ? new Date(year, 0, 1) : new Date(year, month - 1, 1)
  const end = isFullYear ? new Date(year + 1, 0, 1) : new Date(year, month, 1)

  // Prior period for MoM/YoY delta chips: previous month, or previous full year.
  const pEnd = new Date(start)
  const pStart = isFullYear
    ? new Date(year - 1, 0, 1)
    : new Date(start.getFullYear(), start.getMonth() - 1, 1)

  const round2 = (n: number) => Math.round(n * 100) / 100

  // Months within `year` during which a recurring expense created at `createdAt` applies.
  function recurringMonthsInYear(createdAt: Date | string, targetYear: number): number {
    const c = new Date(createdAt)
    if (Number.isNaN(c.getTime()) || c.getFullYear() > targetYear) return 0
    const startMonth = c.getFullYear() < targetYear ? 1 : c.getMonth() + 1
    return 13 - startMonth
  }

  async function computePeriod(pStart: Date, pEnd: Date, pYear: number, pMonth: number, fullYear: boolean) {
    const [deliveredOrders, salariedUsers, movements, expenses, completedOrderCount, salariedUserCount, refundedOrders] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'Delivered', updatedAt: { gte: pStart, lt: pEnd } },
        select: { totalAmount: true, items: { select: { quantity: true, productCostSnapshot: true } } },
      }),
      prisma.adminUser.findMany({
        where: { isActive: true, salary: { gt: 0 } },
        select: { salary: true },
      }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: pStart, lt: pEnd }, quantity: { gt: 0 } },
        select: { quantity: true, costPrice: true },
      }),
      prisma.expense.findMany({
        where: fullYear
          ? {
              OR: [
                { year: pYear, recurring: false },
                { recurring: true, createdAt: { lt: pEnd } },
              ],
            }
          : {
              OR: [
                { year: pYear, month: pMonth, recurring: false },
                { recurring: true, createdAt: { lt: pEnd } },
              ],
            },
        select: { amount: true, recurring: true, createdAt: true },
      }),
      prisma.order.count({ where: { status: 'Delivered', updatedAt: { gte: pStart, lt: pEnd } } }),
      prisma.adminUser.count({ where: { isActive: true, salary: { gt: 0 } } }),
      prisma.order.findMany({
        where: { status: 'Refunded', updatedAt: { gte: pStart, lt: pEnd } },
        select: { totalAmount: true },
      }),
    ])

    // Sales: delivered orders only (refunded orders carry status Refunded, never Delivered).
    const revenue = round2(deliveredOrders.reduce((s, o) => s + Number(o.totalAmount), 0))
    const cogs = round2(deliveredOrders.reduce(
      (s, o) => s + o.items.reduce((is, i) => is + i.quantity * Number(i.productCostSnapshot || 0), 0),
      0,
    ))
    // Payroll: active users with a salary set (names never exposed here).
    // Annualized in Full-Year mode (monthly figure × 12).
    const monthlySalaries = round2(salariedUsers.reduce((s, u) => s + Number(u.salary), 0))
    const salaries = fullYear ? round2(monthlySalaries * 12) : monthlySalaries
    // Other expenses: one-off items as-is; recurring items × months they apply to in Full-Year mode.
    const otherExpenses = round2(expenses.reduce((s, e) => {
      const amt = Number(e.amount)
      if (!e.recurring || !fullYear) return s + amt
      return s + amt * recurringMonthsInYear(e.createdAt, pYear)
    }, 0))
    // Inventory additions: costPrice × quantity added.
    const stockAdditions = round2(movements.reduce((s, m) => s + m.quantity * Number(m.costPrice || 0), 0))
    const totalExpenses = round2(cogs + salaries + otherExpenses)
    const profit = round2(revenue - totalExpenses)
    const margin = revenue > 0 ? round2((profit / revenue) * 100) : 0
    const refundTotal = round2(refundedOrders.reduce((s, o) => s + Number(o.totalAmount), 0))

    return {
      revenue: { orders: revenue, quotes: 0, total: revenue },
      expenses: { cogs, salaries, other: otherExpenses, total: totalExpenses },
      stockAdditions,
      profit,
      margin,
      counts: {
        completedOrders: completedOrderCount,
        acceptedQuotes: 0,
        activeEmployees: salariedUserCount,
      },
      refunds: { count: refundedOrders.length, total: refundTotal },
    }
  }

  const pMonth = isFullYear ? 1 : pStart.getMonth() + 1
  const [current, previous] = await Promise.all([
    computePeriod(start, end, year, month, isFullYear),
    computePeriod(pStart, start, isFullYear ? year - 1 : pStart.getFullYear(), pMonth, isFullYear),
  ])

  return {
    month,
    year,
    ...current,
    previous: {
      revenue: previous.revenue.total,
      expensesTotal: previous.expenses.total,
      profit: previous.profit,
      deliveredCount: previous.counts.completedOrders,
      refundCount: previous.refunds.count,
      refundTotal: previous.refunds.total,
    },
  }
})
