
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const serviceId = event.context.params?.id
  const body = await readBody(event)
  const field = await prisma.serviceFormField.create({
    data: {
      serviceId: serviceId as string,
      labelAr: body.labelAr,
      labelEn: body.labelEn,
      fieldType: body.fieldType,
      isRequired: body.isRequired ?? false,
      sortOrder: body.sortOrder ?? 999,
      options: body.options ?? null
    }
  })
  return field
})
