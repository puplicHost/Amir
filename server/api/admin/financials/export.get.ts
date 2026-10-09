export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.view')
  const q = getQuery(event)
  const now = new Date()
  // month=0 is the Full-Year signal (same convention as summary/sales/costs).
  const isFullYear = q.month !== undefined && Number(q.month) === 0
  const month = isFullYear ? 1 : Math.min(12, Math.max(1, Number(q.month) || now.getMonth() + 1))
  const year = Math.max(2000, Math.min(2100, Number(q.year) || now.getFullYear()))
  const start = isFullYear ? new Date(year, 0, 1) : new Date(year, month - 1, 1)
  const end = isFullYear ? new Date(year + 1, 0, 1) : new Date(year, month, 1)

  const orders = await prisma.order.findMany({
    where: { status: 'Delivered', updatedAt: { gte: start, lt: end } },
    // DoS guard: annual exports span 12 months, so the cap is higher.
    take: isFullYear ? 50000 : 5000,
    select: {
      orderNumber: true,
      customerName: true,
      paymentMethod: true,
      totalAmount: true,
      updatedAt: true,
      items: {
        select: {
          productNameSnapshot: true,
          quantity: true,
          productPriceSnapshot: true,
          productCostSnapshot: true,
          subtotal: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const esc = (v: unknown) => String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const round2 = (n: number) => Math.round(n * 100) / 100

  // NOTE: this endpoint serves an HTML table with an .xls filename (same as the
  // monthly export). A genuine .xlsx file is a ZIP archive and cannot be produced
  // without a new dependency — see the pending approval question in the report.
  setHeader(event, 'Content-Type', 'application/vnd.ms-excel; charset=utf-8')

  if (isFullYear) {
    // Annual mode: one aggregate row per month (12 rows).
    const months = Array.from({ length: 12 }, (_, i) => ({ sales: 0, cost: 0 }))
    for (const o of orders) {
      const bucket = months[new Date(o.updatedAt).getMonth()]
      if (!bucket) continue
      for (const i of o.items) {
        bucket.sales = round2(bucket.sales + Number(i.subtotal))
        bucket.cost = round2(bucket.cost + i.quantity * Number(i.productCostSnapshot || 0))
      }
    }
    let yearSales = 0
    let yearCost = 0
    const monthRows = months.map((mm, i) => {
      const profit = round2(mm.sales - mm.cost)
      yearSales = round2(yearSales + mm.sales)
      yearCost = round2(yearCost + mm.cost)
      const label = `${year}-${String(i + 1).padStart(2, '0')}`
      return `<tr><td>${label}</td><td>${mm.sales}</td><td>${mm.cost}</td><td>${profit}</td></tr>`
    })
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8" /></head><body>
<table border="1">
<tr><td colspan="4">Mango Electronics — Annual Financials ${year}</td></tr>
<tr><td>Month</td><td>Sales (EGP)</td><td>Cost (EGP)</td><td>Profit (EGP)</td></tr>
${monthRows.join('')}
<tr><td>TOTAL</td><td>${yearSales}</td><td>${yearCost}</td><td>${round2(yearSales - yearCost)}</td></tr>
</table></body></html>`
    setHeader(event, 'Content-Disposition', `attachment; filename="Annual-${year}.xls"`)
    return html
  }

  let salesTotal = 0
  let costTotal = 0
  const itemRows = orders.flatMap(o => o.items.map((i) => {
    const sale = Number(i.subtotal)
    const cost = round2(i.quantity * Number(i.productCostSnapshot || 0))
    salesTotal = round2(salesTotal + sale)
    costTotal = round2(costTotal + cost)
    return `<tr><td>${esc(o.orderNumber)}</td><td>${esc(i.productNameSnapshot)}</td><td>${i.quantity}</td><td>${sale}</td><td>${cost}</td><td>${esc(o.paymentMethod)}</td></tr>`
  }))

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8" /></head><body>
<table border="1">
<tr><td colspan="6">Mango Electronics — Monthly Financials ${year}-${String(month).padStart(2, '0')}</td></tr>
<tr><td>Order</td><td>Product</td><td>Qty</td><td>Sales (EGP)</td><td>Cost (EGP)</td><td>Payment</td></tr>
${itemRows.join('')}
<tr><td colspan="3">TOTAL</td><td>${salesTotal}</td><td>${costTotal}</td><td></td></tr>
<tr><td colspan="3">PROFIT</td><td colspan="3">${round2(salesTotal - costTotal)}</td></tr>
</table></body></html>`

  setHeader(event, 'Content-Disposition', `attachment; filename="financials-${year}-${String(month).padStart(2, '0')}.xls"`)
  return html
})
