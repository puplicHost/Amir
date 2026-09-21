
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const serviceId = event.context.params?.id
  const fields = await prisma.serviceFormField.findMany({
    where: { serviceId },
    orderBy: { sortOrder: 'asc' }
  })
  return fields
})
