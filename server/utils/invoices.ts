import { nextInvoiceNumber } from './numbering'

interface InvoiceLineInput {
  name: string
  quantity: number
  unitPrice: number
}

interface CreateInvoiceInput {
  customerName: string
  customerPhone: string
  customerGovernorat?: string | null
  customerAddress?: string | null
  notes?: string | null
  paymentMethod?: string
  status?: string
  type: 'order' | 'quote' | 'manual'
  orderId?: string | null
  quoteId?: string | null
  items: InvoiceLineInput[]
  taxAmount?: number
  createdById?: string | null
  createdByName?: string | null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Core invoice creator. Throws on validation errors. */
export async function createInvoice(input: CreateInvoiceInput) {
  const name = String(input.customerName || '').trim()
  const phone = String(input.customerPhone || '').trim()
  if (!name || !phone) throw createError({ statusCode: 400, message: 'Customer name and phone are required' })

  const lines = (Array.isArray(input.items) ? input.items : [])
    .map(l => ({
      name: String(l.name || '').trim(),
      quantity: Math.max(1, Math.floor(Number(l.quantity) || 1)),
      unitPrice: Math.max(0, Number(l.unitPrice) || 0),
    }))
    .filter(l => l.name)
  if (!lines.length) throw createError({ statusCode: 400, message: 'At least one invoice line is required' })

  const subtotal = round2(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0))
  const tax = Math.max(0, round2(Number(input.taxAmount) || 0))
  const total = round2(subtotal + tax)
  const invoiceNumber = await nextInvoiceNumber()

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerName: name,
      customerPhone: phone,
      customerGovernorat: input.customerGovernorat ? String(input.customerGovernorat) : null,
      customerAddress: input.customerAddress ? String(input.customerAddress) : null,
      notes: input.notes ? String(input.notes) : null,
      paymentMethod: input.paymentMethod || 'COD',
      status: input.status || 'Pending',
      subtotalAmount: subtotal,
      taxAmount: tax,
      totalAmount: total,
      type: input.type,
      orderId: input.orderId || null,
      quoteId: input.quoteId || null,
      createdById: input.createdById || null,
      createdByName: input.createdByName || null,
      items: {
        create: lines.map(l => ({
          name: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          subtotal: round2(l.quantity * l.unitPrice),
        })),
      },
    },
    include: { items: true },
  })
  return invoice
}

/** Auto-invoice for a store order. Idempotent — returns existing invoice if linked. */
export async function createInvoiceFromOrder(orderId: string) {
  const existing = await prisma.invoice.findUnique({ where: { orderId } })
  if (existing) return existing
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  return createInvoice({
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerGovernorat: order.customerGovernorat,
    customerAddress: order.customerAddress,
    paymentMethod: order.paymentMethod,
    status: 'Pending',
    type: 'order',
    orderId: order.id,
    items: order.items.map(i => ({
      name: i.productNameSnapshot,
      quantity: i.quantity,
      unitPrice: Number(i.productPriceSnapshot),
    })),
  })
}

/** Auto-invoice for an accepted quotation. Idempotent. */
export async function createInvoiceFromQuote(quoteId: string) {
  const existing = await prisma.invoice.findUnique({ where: { quoteId } })
  if (existing) return existing
  const quote = await prisma.quoteRequest.findUnique({
    where: { id: quoteId },
    include: { items: true },
  })
  if (!quote) throw createError({ statusCode: 404, statusMessage: 'Quote not found' })
  const customerName = quote.companyName || quote.contactName
  return createInvoice({
    customerName,
    customerPhone: quote.phone,
    customerGovernorat: (quote as any).governorate || null,
    notes: (quote as any).adminNotes || quote.notes,
    paymentMethod: 'COD',
    status: 'Pending',
    type: 'quote',
    quoteId: quote.id,
    items: quote.items.map(i => ({
      name: i.productNameSnapshot,
      quantity: i.quantity,
      unitPrice: Number(i.priceSnapshot),
    })),
  })
}
