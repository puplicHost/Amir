
export default defineEventHandler(async () => {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: [
      { section: 'asc' },
      { sortOrder: 'asc' },
    ],
  })
  return services
})
