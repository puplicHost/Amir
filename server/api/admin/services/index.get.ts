
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.view')
  const services = await prisma.service.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: { formFields: true, requests: true }
      }
    }
  })
  return services
})
