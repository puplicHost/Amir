export default defineEventHandler(async (event) => {
  await requirePermission(event, 'invoices.view')
  const quoteId = getRouterParam(event, 'quoteId')
  const invoice = await prisma.invoice.findUnique({
    where: { quoteId: quoteId || '' },
    select: { id: true, invoiceNumber: true, status: true, totalAmount: true },
  })
  return { invoice }
})
