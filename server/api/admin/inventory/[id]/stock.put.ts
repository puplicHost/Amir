import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAuth(event)
  if (!actor.permissions.includes('inventory.view') && !actor.permissions.includes('products.edit')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing product ID' })

  const body = await readBody(event)
  const rawStock = body?.stock ?? body?.quantity
  if (rawStock === undefined || rawStock === null) {
    throw createError({ statusCode: 400, message: 'Missing stock value' })
  }

  const newStock = Math.max(0, parseInt(String(rawStock), 10) || 0)

  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw createError({ statusCode: 404, message: 'Product not found' })

  const diff = newStock - product.stock

  if (diff !== 0) {
    await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { stock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          quantity: diff,
          costPrice: product.costPrice,
          reason: 'manual-adjustment',
          userId: actor.userId,
          userName: actor.name,
        },
      }),
    ])
  }

  const stockValue = product.costPrice ? newStock * Number(product.costPrice) : 0

  return {
    success: true,
    stock: newStock,
    stockValue,
  }
})
