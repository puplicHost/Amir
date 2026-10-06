export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.view')
  const q = getQuery(event)
  const now = new Date()
  const month = Math.min(12, Math.max(1, Number(q.month) || now.getMonth() + 1))
  const year = Math.max(2000, Math.min(2100, Number(q.year) || now.getFullYear()))
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const orders = await prisma.order.findMany({
    where: { status: 'Delivered', updatedAt: { gte: start, lt: end } },
    // DoS guard: a single-month export never legitimately exceeds this.
    take: 5000,
    select: {
      orderNumber: true,
      customerName: true,
      paymentMethod: true,
      totalAmount: true,
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

  setHeader(event, 'Content-Type', 'application/vnd.ms-excel; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="financials-${year}-${String(month).padStart(2, '0')}.xls"`)
  return html
})
