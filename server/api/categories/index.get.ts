export default defineEventHandler(async () => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      descriptionAr: true,
      descriptionEn: true,
      coverImagePath: true,
      coverVideoUrl: true,
      featuredOnHomepage: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  })
  return { categories }
})
