export default defineEventHandler(async (event) => {
  await requirePermission(event, 'invoices.view')
  const id = getRouterParam(event, 'id')
  const invoice = await prisma.invoice.findUnique({
    where: { id: id || '' },
    include: {
      items: { orderBy: { id: 'asc' } },
      order: { select: { id: true, orderNumber: true } },
      quoteRequest: { select: { id: true, quoteNumber: true } },
    },
  })
  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  return {
    invoice: {
      ...invoice,
      subtotalAmount: Number(invoice.subtotalAmount),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      items: invoice.items.map(i => ({
        ...i,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    },
  }
})
