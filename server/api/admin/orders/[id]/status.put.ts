export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'orders.manage')
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  
  const status = typeof body.status === 'string' ? body.status.trim() : ''
  if (!status || !['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
  }

  const existing = await prisma.order.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  if (existing.status === status) return { order: existing }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: existing.id },
      data: { status },
    })
    await tx.orderStatusHistory.create({
      data: {
        orderId: existing.id,
        status,
        changedByUserId: actor.userId,
      },
    })
    return updated
  })

  return { order: result }
})
