
export default defineEventHandler(async () => {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      formFields: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  })
  return services
})
