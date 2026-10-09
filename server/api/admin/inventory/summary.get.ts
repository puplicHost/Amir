export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const canView = user.isSuper ||
    user.permissions.includes('inventory.view') ||
    user.permissions.includes('products.view')
  if (!canView) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const products = await prisma.product.findMany({
    select: {
      stock: true,
      minStock: true,
      costPrice: true,
      isActive: true,
    },
  })

  let totalValue = 0
  let activeCount = 0
  let lowCount = 0
  for (const product of products) {
    const stock = product.stock ?? 0
    const minStock = product.minStock ?? 0
    const cost = product.costPrice === null || product.costPrice === undefined
      ? 0
      : Number(product.costPrice)
    totalValue += cost * stock
    if (product.isActive) activeCount++
    if (stock === 0 || stock <= minStock) lowCount++
  }

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    activeCount,
    lowCount,
    totalCount: products.length,
  }
})
