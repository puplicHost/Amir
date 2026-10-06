export default defineEventHandler(async (event) => {
  const orderNumber = String(getRouterParam(event, 'orderNumber') || '').trim()
  if (!orderNumber) {
    throw createError({ statusCode: 400, statusMessage: 'Order number is required' })
  }

  const query = getQuery(event)
  const providedToken = typeof query.token === 'string' ? query.token : ''

  // Admins bypass token verification (session must carry orders permission).
  let isAdmin = false
  try {
    const sessionUser = await getSessionUser(event)
    isAdmin = !!sessionUser && (sessionUser.isSuper
      || sessionUser.permissions.includes('orders.view')
      || sessionUser.permissions.includes('orders.manage'))
  }
  catch {
    isAdmin = false
  }

  if (!isAdmin && !providedToken) {
    throw createError({ statusCode: 401, statusMessage: 'Access token is required' })
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
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

  // Ownership check for public callers: single-resource token must match this order.
  if (!isAdmin) {
    const { verifyAccessToken } = await import('../../utils/access-tokens')
    if (!(await verifyAccessToken('order', (order as { id: string }).id, providedToken))) {
      throw createError({ statusCode: 403, statusMessage: 'Invalid or expired access token' })
    }
  }

  // Never leak the internal id to public callers.
  if (!isAdmin) {
    const { id: _internalId, ...publicOrder } = order as Record<string, unknown>
    return publicOrder
  }

  return order
})
