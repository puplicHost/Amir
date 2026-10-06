import { randomBytes } from 'node:crypto'
import { orderCreateSchema, parseBody } from '../../utils/validate'

export default defineEventHandler(async (event) => {
  // Rate limited by server/middleware/rate-limit.ts (10 req/min).
  const body = await parseBody(event, orderCreateSchema)
  if (!body.customer || !body.items || !Array.isArray(body.items) || !body.items.length) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid order payload' })
  }

  const { name, phone, governorate, address, email } = body.customer
  if (!name || !phone || !governorate) {
    throw createError({ statusCode: 400, statusMessage: 'Name, phone, and governorate are required' })
  }
  if (!/^01[0125][0-9]{8}$/.test(phone)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid phone number format' })
  }

  const paymentMethod = body.paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD'

  const settings = await prisma.siteSettings.findFirst()
  if (paymentMethod === 'COD' && !settings?.paymentCodEnabled) {
    throw createError({ statusCode: 400, statusMessage: 'COD payment is disabled' })
  }
  if (paymentMethod === 'ONLINE' && !settings?.paymentOnlineEnabled) {
    throw createError({ statusCode: 400, statusMessage: 'Online payment is disabled' })
  }

  const productIds = [...new Set(body.items.map((i: any) => String(i.productId)))]
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, price: true, nameEn: true, costPrice: true },
  })
  
  if (dbProducts.length !== productIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'One or more products are inactive or unavailable' })
  }

  const productMap = new Map(dbProducts.map(p => [p.id, p]))
  let totalAmount = 0
  const orderItems = []

  for (const item of body.items) {
    const pId = String(item.productId)
    const qty = Number(item.quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid quantity' })
    }
    const dbP = productMap.get(pId)!
    const subtotal = Number(dbP.price) * qty
    totalAmount += subtotal
    orderItems.push({
      productId: dbP.id,
      productNameSnapshot: dbP.nameEn,
      productPriceSnapshot: dbP.price,
      productCostSnapshot: (dbP as any).costPrice ?? null,
      quantity: qty,
      subtotal,
    })
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomStr = randomBytes(3).toString('hex').toUpperCase()
  const orderNumber = `ME-${dateStr}-${randomStr}`

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: String(name).trim(),
      customerPhone: String(phone).trim(),
      customerEmail: email ? String(email).trim() : null,
      customerAddress: address ? String(address).trim() : null,
      customerGovernorat: String(governorate).trim(),
      totalAmount,
      paymentMethod,
      items: { create: orderItems },
      statusHistory: { create: [{ status: 'Pending' }] },
    },
  })

  await notifyAdmins({
    type: 'new_order',
    relatedEntityId: order.id,
    url: `/admin/orders/${order.id}`,
    titleEn: `New order ${orderNumber}`,
    titleAr: `طلب جديد ${orderNumber}`,
    bodyEn: `${order.customerName} · ${totalAmount} EGP · ${paymentMethod}`,
    bodyAr: `${order.customerName} · ${totalAmount} ج.م · ${paymentMethod}`,
  })

  await sendMetaCapiEvent({
    eventName: 'Purchase',
    eventId: orderNumber,
    email: order.customerEmail,
    phone: order.customerPhone,
    clientIp: getRequestIP(event, { xForwardedFor: true }) || undefined,
    clientUa: getRequestHeader(event, 'user-agent') || undefined,
    value: totalAmount,
    currency: 'EGP',
  })

  // Auto-generate invoice for the new order (best-effort, never fails checkout).
  try {
    const { createInvoiceFromOrder } = await import('../../utils/invoices')
    await createInvoiceFromOrder(order.id)
  }
  catch {
    // Invoice auto-creation is best-effort.
  }

  // Issue a short-lived access token for this order's confirmation/PII reads.
  const { issueAccessToken } = await import('../../utils/access-tokens')
  const accessToken = await issueAccessToken('order', order.id)

  // ONLINE payment: redirect the customer to the gateway when one is configured.
  // Anything missing or failing falls back to COD silently (order stays Pending).
  if (paymentMethod === 'ONLINE') {
    try {
      const { createOnlinePaymentUrl } = await import('../../utils/payments')
      const paymentUrl = await createOnlinePaymentUrl({
        id: order.id,
        orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        totalAmount,
      })
      if (paymentUrl) return { orderNumber, totalAmount, accessToken, paymentUrl }
    }
    catch {
      // Fall through to COD.
    }
  }

  return { orderNumber, totalAmount, accessToken }
})
