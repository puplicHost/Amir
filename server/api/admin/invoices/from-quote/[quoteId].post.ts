import { createInvoiceFromQuote } from '../../../../utils/invoices'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'invoices.manage')
  const quoteId = getRouterParam(event, 'quoteId')
  if (!quoteId) throw createError({ statusCode: 400, statusMessage: 'Quote id is required' })
  const invoice = await createInvoiceFromQuote(quoteId)
  return { invoice }
})
