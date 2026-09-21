
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const id = event.context.params?.id
  const body = await readBody(event)
  const service = await prisma.service.update({
    where: { id },
    data: {
      nameAr: body.nameAr,
      nameEn: body.nameEn,
      descriptionAr: body.descriptionAr,
      descriptionEn: body.descriptionEn,
      iconPath: body.iconPath,
      sortOrder: body.sortOrder,
      isActive: body.isActive
    }
  })
  return service
})
