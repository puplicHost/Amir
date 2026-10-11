
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.manage')
  const services = await prisma.service.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return services
})
