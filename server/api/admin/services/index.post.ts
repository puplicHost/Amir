
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const body = await readBody(event)
  let slug = typeof body.slug === 'string' && body.slug.trim()
    ? body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : (body.nameEn ? body.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : `service-${Date.now()}`)

  const service = await prisma.service.create({
    data: {
      slug,
      nameAr: body.nameAr,
      nameEn: body.nameEn,
      descriptionAr: body.descriptionAr,
      descriptionEn: body.descriptionEn,
      iconPath: body.iconPath,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
      isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : false,
    }
  })
  return service
})
