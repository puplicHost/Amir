export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const category = await prisma.category.findUnique({
    where: { slug: slug || '' },
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
    },
  })
  if (!category) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  return { category }
})
