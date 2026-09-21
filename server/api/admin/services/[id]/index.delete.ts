
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const id = event.context.params?.id

  const requestsCount = await prisma.serviceRequest.count({ where: { serviceId: id } })
  if (requestsCount > 0) {
    throw createError({ statusCode: 400, message: 'Cannot delete service with existing requests.' })
  }

  await prisma.service.delete({ where: { id } })
  return { success: true }
})
