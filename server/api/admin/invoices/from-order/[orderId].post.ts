import { createInvoiceFromOrder } from '../../../../utils/invoices'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'invoices.manage')
  const orderId = getRouterParam(event, 'orderId')
  if (!orderId) throw createError({ statusCode: 400, statusMessage: 'Order id is required' })
  const invoice = await createInvoiceFromOrder(orderId)
  return { invoice }
})
