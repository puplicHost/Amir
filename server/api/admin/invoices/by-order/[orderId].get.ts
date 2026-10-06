export default defineEventHandler(async (event) => {
  await requirePermission(event, 'invoices.view')
  const orderId = getRouterParam(event, 'orderId')
  const invoice = await prisma.invoice.findUnique({
    where: { orderId: orderId || '' },
    select: { id: true, invoiceNumber: true, status: true, totalAmount: true },
  })
  return { invoice }
})
