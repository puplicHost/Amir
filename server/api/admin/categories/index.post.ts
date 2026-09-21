import { generateSlug, uniqueSlug } from '../../../../shared/slug'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'categories.manage')
  const body = await readBody(event)
  const nameAr = typeof body.nameAr === 'string' ? body.nameAr.trim() : ''
  const nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim() : ''
  if (!nameAr || !nameEn) throw createError({ statusCode: 400, statusMessage: 'Arabic and English names are required' })

  const base = typeof body.slug === 'string' && body.slug.trim()
    ? generateSlug(body.slug)
    : generateSlug(nameEn)
  const slug = await uniqueSlug(base, async s => !!(await prisma.category.findUnique({ where: { slug: s } })))

  const category = await prisma.category.create({
    data: {
      nameAr,
      nameEn,
      slug,
      descriptionAr: body.descriptionAr || null,
      descriptionEn: body.descriptionEn || null,
      coverVideoUrl: body.coverVideoUrl || null,
      featuredOnHomepage: body.featuredOnHomepage === true,
      sortOrder: Number(body.sortOrder) || 0,
    },
  })
  return { category }
})
