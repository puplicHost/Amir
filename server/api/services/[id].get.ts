export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing service id' })

  const service = await prisma.service.findUnique({
    where: { id, isActive: true },
    include: {
      formFields: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
  if (!service) throw createError({ statusCode: 404, message: 'Service not found or inactive' })
  return service
})
