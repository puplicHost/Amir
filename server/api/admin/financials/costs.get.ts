export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.view')
  const q = getQuery(event)
  const now = new Date()
  const isFullYear = q.month !== undefined && Number(q.month) === 0
  const month = isFullYear ? 1 : Math.min(12, Math.max(1, Number(q.month) || now.getMonth() + 1))
  const year = Math.max(2000, Math.min(2100, Number(q.year) || now.getFullYear()))
  const page = Math.max(1, Number(q.page) || 1)
  const perPage = [10, 20, 50].includes(Number(q.perPage)) ? Number(q.perPage) : 10
  const pay = q.pay === 'COD' || q.pay === 'ONLINE' ? String(q.pay) : null

  const start = isFullYear ? new Date(year, 0, 1) : new Date(year, month - 1, 1)
  const end = isFullYear ? new Date(year + 1, 0, 1) : new Date(year, month, 1)

  const orders = await prisma.order.findMany({
    where: {
      status: 'Delivered',
      updatedAt: { gte: start, lt: end },
      ...(pay ? { paymentMethod: pay } : {}),
    },
    select: {
      items: {
        select: {
          productId: true,
          productNameSnapshot: true,
          quantity: true,
          productPriceSnapshot: true,
          productCostSnapshot: true,
          subtotal: true,
        },
      },
    },
  })

  const grouped = new Map<string, {
    productId: string | null
    name: string
    quantity: number
    unitCost: number
    totalCost: number
    totalSales: number
  }>()
  for (const o of orders) {
    for (const i of o.items) {
      const key = i.productId || `archived:${i.productNameSnapshot}`
      const unitCost = Number(i.productCostSnapshot || 0)
      const g = grouped.get(key) || {
        productId: i.productId,
        name: i.productNameSnapshot,
        quantity: 0,
        unitCost,
        totalCost: 0,
        totalSales: 0,
      }
      g.quantity += i.quantity
      g.totalCost = Math.round((g.totalCost + unitCost * i.quantity) * 100) / 100
      g.totalSales = Math.round((g.totalSales + Number(i.subtotal)) * 100) / 100
      // Weighted average unit cost across merged rows.
      g.unitCost = g.quantity ? Math.round((g.totalCost / g.quantity) * 100) / 100 : 0
      grouped.set(key, g)
    }
  }
  const rows = [...grouped.values()].sort((a, b) => b.totalCost - a.totalCost)
  const grandQty = rows.reduce((s, r) => s + r.quantity, 0)
  const grandCost = Math.round(rows.reduce((s, r) => s + r.totalCost, 0) * 100) / 100
  const grandSales = Math.round(rows.reduce((s, r) => s + r.totalSales, 0) * 100) / 100
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage = Math.min(page, totalPages)

  return {
    data: rows.slice((safePage - 1) * perPage, safePage * perPage),
    meta: {
      total,
      page: safePage,
      perPage,
      totalPages,
      grandQty,
      grandCost,
      grandSales,
      margin: Math.round((grandSales - grandCost) * 100) / 100,
    },
  }
})
