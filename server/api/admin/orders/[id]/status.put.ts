import { orderStatusSchema, parseBody } from '../../../../utils/validate'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'orders.manage')
  const id = getRouterParam(event, 'id')
  const { status } = await parseBody(event, orderStatusSchema)

  const existing = await prisma.order.findUnique({
    where: { id: id || '' },
    include: { items: { select: { productId: true, quantity: true, productNameSnapshot: true } } },
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  if (existing.status === status) return { order: existing, stockDeducted: existing.stockDeducted }

  // First-time transition to Delivered deducts item quantities from product stock.
  const shouldDeduct = status === 'Delivered' && existing.status !== 'Delivered' && !existing.stockDeducted

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: existing.id },
      data: { status, ...(shouldDeduct ? { stockDeducted: true } : {}) },
    })
    await tx.orderStatusHistory.create({
      data: {
        orderId: existing.id,
        status,
        changedByUserId: actor.userId,
      },
    })
    if (shouldDeduct) {
      for (const item of existing.items) {
        if (!item.productId) continue
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          select: { costPrice: true },
        })
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity,
            costPrice: prod?.costPrice ?? null,
            reason: 'delivery',
            userId: actor.userId,
            userName: actor.name,
          },
        })
      }
      // Clamp any negative stock back to zero (oversell protection for display).
      await tx.$executeRaw`UPDATE "Product" SET stock = 0 WHERE stock < 0 AND id IN (SELECT "productId" FROM "OrderItem" WHERE "orderId" = ${existing.id})`
    }
    return updated
  })

  return { order: result, stockDeducted: shouldDeduct || existing.stockDeducted }
})
