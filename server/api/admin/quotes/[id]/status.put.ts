import { parseBody, quoteStatusSchema } from '../../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requireQuotesManage(event)

  const id = event.context.params?.id
  const { status } = await parseBody(event, quoteStatusSchema)

  const quote = await prisma.quoteRequest.update({
    where: { id },
    data: { status },
  })

  // Accepted quotations automatically generate an invoice (idempotent).
  let invoice = null
  if (status === 'Accepted') {
    try {
      const { createInvoiceFromQuote } = await import('../../../../utils/invoices')
      invoice = await createInvoiceFromQuote(quote.id)
    }
    catch {
      // Invoice auto-creation is best-effort; status change already succeeded.
    }
  }

  return { quote, invoice }
})
