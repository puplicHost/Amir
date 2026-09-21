export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.view')
  const id = getRouterParam(event, 'id')
  const product = await prisma.product.findUnique({
    where: { id: id || '' },
    include: {
      category: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      attributes: true,
      seo: true,
    },
  })
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return { product }
})
