import { createInvoice } from '../../../utils/invoices'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'invoices.manage')
  const body = await readBody(event)

  const invoice = await createInvoice({
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    customerGovernorat: body.customerGovernorat,
    customerAddress: body.customerAddress,
    notes: body.notes,
    paymentMethod: body.paymentMethod,
    status: ['Pending', 'Paid', 'Cancelled'].includes(body.status) ? body.status : 'Pending',
    type: 'manual',
    items: Array.isArray(body.items) ? body.items : [],
    taxAmount: body.taxAmount,
    createdById: user.userId,
    createdByName: user.name,
  })

  return { invoice }
})
