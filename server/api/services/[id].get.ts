export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing service id' })

  const service = await prisma.service.findFirst({
    where: {
      isActive: true,
      OR: [
        { id },
        { slug: id },
      ],
    },
  })
  if (!service) throw createError({ statusCode: 404, message: 'Service not found or inactive' })
  return service
})
