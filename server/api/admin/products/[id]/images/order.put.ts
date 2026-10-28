import { parseBody, productImageOrderSchema } from '../../../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.manage')
  // AUDIT P3-08: validated image id list.
  const body = await parseBody(event, productImageOrderSchema)
  const order = body.order

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
