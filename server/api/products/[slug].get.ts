export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const product = await prisma.product.findUnique({
    where: { slug: slug || '' },
    include: {
      category: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      attributes: true,
      seo: true,
    },
  })
  if (!product || !product.isActive) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }
  return { product }
})
