
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const fieldId = event.context.params?.fieldId
  await prisma.serviceFormField.delete({ where: { id: fieldId } })
  return { success: true }
})
