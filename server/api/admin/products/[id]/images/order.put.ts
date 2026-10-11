export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.manage')
  const body = await readBody(event)
  const order = Array.isArray(body.order) ? body.order.filter((x): x is string => typeof x === 'string') : []
  if (!order.length) throw createError({ statusCode: 400, statusMessage: 'Order array required' })

  const images = await prisma.productImage.findMany({ where: { id: { in: order } } })
  const productIds = new Set(images.map(i => i.productId))
  if (images.length !== order.length || productIds.size !== 1) {
    throw createError({ statusCode: 400, statusMessage: 'Images must belong to one product' })
  }

  await prisma.$transaction(
    order.map((imageId, i) =>
      prisma.productImage.update({
        where: { id: imageId },
        data: { sortOrder: i, isCover: i === 0 },
      }),
    ),
  )
  return { ok: true }
})
