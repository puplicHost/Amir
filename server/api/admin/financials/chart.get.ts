export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.view')
  const q = getQuery(event)
  const months = Math.min(24, Math.max(3, Number(q.months) || 12))

  const now = new Date()
  // Oldest month start, e.g. months=12 → first day 11 months ago.
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

  const [orders, expenses, salariedUsers] = await Promise.all([
    prisma.order.findMany({
      where: { status: 'Delivered', updatedAt: { gte: rangeStart } },
      select: {
        updatedAt: true,
        totalAmount: true,
        items: { select: { quantity: true, productCostSnapshot: true } },
      },
    }),
    prisma.expense.findMany({
      where: {
        OR: [
          { recurring: false, createdAt: { gte: rangeStart } },
          { recurring: true },
        ],
      },
      select: { amount: true, month: true, year: true, recurring: true, createdAt: true },
    }),
    // Monthly payroll (same point-in-time figure each month, matching the hero Total Expenses definition).
    prisma.adminUser.findMany({
      where: { isActive: true, salary: { gt: 0 } },
      select: { salary: true },
    }),
  ])

  const round2 = (n: number) => Math.round(n * 100) / 100
  const monthlyPayroll = round2(salariedUsers.reduce((s, u) => s + Number(u.salary), 0))
  const points: { month: number, year: number, label: string, labelEn: string, sales: number, costs: number, profit: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 1)

    let sales = 0
    let cogs = 0
    for (const o of orders) {
      const t = new Date(o.updatedAt).getTime()
      if (t >= start.getTime() && t < end.getTime()) {
        sales += Number(o.totalAmount)
        for (const item of o.items) {
          cogs += item.quantity * Number(item.productCostSnapshot || 0)
        }
      }
    }
    let other = 0
    for (const e of expenses) {
      if (!e.recurring) {
        if (e.year === y && e.month === m) other += Number(e.amount)
      }
      else if (new Date(e.createdAt).getTime() < end.getTime()) {
        other += Number(e.amount)
      }
    }

    sales = round2(sales)
    // Unified cost definition: COGS + other expenses + payroll (matches hero Total Expenses).
    const costs = round2(cogs + other + monthlyPayroll)
    points.push({
      month: m,
      year: y,
      label: d.toLocaleDateString('ar-EG', { month: 'long' }),
      labelEn: d.toLocaleDateString('en-US', { month: 'short' }),
      sales,
      costs,
      profit: round2(sales - costs),
    })
  }

  return { data: points, meta: { months } }
})
