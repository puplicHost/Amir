
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const serviceId = event.context.params?.id
  const fieldId = event.context.params?.fieldId
  const existing = await prisma.serviceFormField.findUnique({ where: { id: fieldId } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Field not found' })
  if (existing.serviceId !== serviceId) {
    throw createError({ statusCode: 404, statusMessage: 'Field not found' })
  }
  await prisma.serviceFormField.delete({ where: { id: fieldId } })
  return { success: true }
})
