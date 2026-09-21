
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const fieldId = event.context.params?.fieldId
  const body = await readBody(event)
  const field = await prisma.serviceFormField.update({
    where: { id: fieldId },
    data: {
      labelAr: body.labelAr,
      labelEn: body.labelEn,
      fieldType: body.fieldType,
      isRequired: body.isRequired,
      options: body.options
    }
  })
  return field
})
