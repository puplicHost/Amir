export default defineEventHandler(async (event) => {
  const orderNumber = String(getRouterParam(event, 'orderNumber') || '').trim()
  if (!orderNumber) {
    throw createError({ statusCode: 400, statusMessage: 'Order number is required' })
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      customerName: true,
      customerPhone: true,
      customerGovernorat: true,
      customerAddress: true,
      customerEmail: true,
      totalAmount: true,
      paymentMethod: true,
      status: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productNameSnapshot: true,
          productPriceSnapshot: true,
          quantity: true,
          subtotal: true,
          product: {
            select: {
              slug: true,
              images: {
                orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
                select: { path: true },
              },
            },
          },
        },
      },
    },
  })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }

  return order
})
