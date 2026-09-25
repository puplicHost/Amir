export default defineEventHandler(async () => {
  let categories = await prisma.category.findMany({
    where: { featuredOnHomepage: true },
    orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    take: 6,
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      coverImagePath: true,
      coverVideoUrl: true,
    },
  })

  // If fewer than 3 featured categories exist, supplement with other categories
  if (categories.length < 3) {
    const existingIds = categories.map(c => c.id)
    const extra = await prisma.category.findMany({
      where: existingIds.length > 0 ? { id: { notIn: existingIds } } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
      take: 6 - categories.length,
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        coverImagePath: true,
        coverVideoUrl: true,
      },
    })
    categories = [...categories, ...extra]
  }

  return { categories }
})
