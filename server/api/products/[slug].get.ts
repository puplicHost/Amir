export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const product = await prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [
        { slug: slug || '' },
        { id: slug || '' },
      ],
    },
    include: {
      category: { select: { id: true, slug: true, nameAr: true, nameEn: true, nameDe: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      attributes: true,
      seo: true,
      video: true,
      documents: { orderBy: { sortOrder: 'asc' } },
    },
  })
  if (!product || !product.isActive) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }
  return { product }
})
