export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.view')
  const q = getQuery(event)
  const now = new Date()
  const month = Math.min(12, Math.max(1, Number(q.month) || now.getMonth() + 1))
  const year = Math.max(2000, Math.min(2100, Number(q.year) || now.getFullYear()))
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const [deliveredOrders, salariedUsers, movements, expenses, completedOrderCount, salariedUserCount] = await Promise.all([
    prisma.order.findMany({
      where: { status: 'Delivered', updatedAt: { gte: start, lt: end } },
      select: { totalAmount: true, items: { select: { quantity: true, productCostSnapshot: true } } },
    }),
    prisma.adminUser.findMany({
      where: { isActive: true, salary: { gt: 0 } },
      select: { salary: true },
    }),
    prisma.stockMovement.findMany({
      where: { createdAt: { gte: start, lt: end }, quantity: { gt: 0 } },
      select: { quantity: true, costPrice: true },
    }),
    prisma.expense.findMany({
      where: {
        OR: [
          { year, month, recurring: false },
          { recurring: true, createdAt: { lt: end } },
        ],
      },
      select: { amount: true },
    }),
    prisma.order.count({ where: { status: 'Delivered', updatedAt: { gte: start, lt: end } } }),
    prisma.adminUser.count({ where: { isActive: true, salary: { gt: 0 } } }),
  ])

  const round2 = (n: number) => Math.round(n * 100) / 100
  // Sales: delivered orders only.
  const revenue = round2(deliveredOrders.reduce((s, o) => s + Number(o.totalAmount), 0))

  const cogs = round2(deliveredOrders.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + i.quantity * Number(i.productCostSnapshot || 0), 0),
    0,
  ))
  // Payroll: active users with a salary set (names never exposed here).
  const salaries = round2(salariedUsers.reduce((s, u) => s + Number(u.salary), 0))
  const otherExpenses = round2(expenses.reduce((s, e) => s + Number(e.amount), 0))
  // Inventory additions this month: costPrice × quantity added.
  const stockAdditions = round2(movements.reduce((s, m) => s + m.quantity * Number(m.costPrice || 0), 0))
  const totalExpenses = round2(cogs + salaries + otherExpenses)
  const profit = round2(revenue - totalExpenses)
  const margin = revenue > 0 ? round2((profit / revenue) * 100) : 0

  return {
    month,
    year,
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
  }
})
