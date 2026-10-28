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

  return { categories }
})
