
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const body = await readBody(event)
  const service = await prisma.service.create({
    data: {
      nameAr: body.nameAr,
      nameEn: body.nameEn,
      descriptionAr: body.descriptionAr,
      descriptionEn: body.descriptionEn,
      iconPath: body.iconPath,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true
    }
  })
  return service
})
