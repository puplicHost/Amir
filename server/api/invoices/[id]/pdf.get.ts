import { generateInvoicePdf } from '../../../utils/invoice-pdf'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'invoices.view')
  const id = getRouterParam(event, 'id')

  const invoice = await prisma.invoice.findUnique({
    where: { id: id || '' },
    include: { items: { orderBy: { id: 'asc' } } },
  })
  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })

  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })

  const buffer = await generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    paymentMethod: invoice.paymentMethod,
    type: invoice.type,
    createdAt: invoice.createdAt,
    dueDate: invoice.createdAt,
    customerName: invoice.customerName,
    customerPhone: invoice.customerPhone,
    customerGovernorat: invoice.customerGovernorat,
    customerAddress: invoice.customerAddress,
    items: invoice.items.map(i => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
    })),
    subtotalAmount: Number(invoice.subtotalAmount),
    taxAmount: Number(invoice.taxAmount),
    totalAmount: Number(invoice.totalAmount),
    notes: invoice.notes,
    locale: 'ar',
    siteSettings: settings || undefined,
  })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`)
  return buffer
})
