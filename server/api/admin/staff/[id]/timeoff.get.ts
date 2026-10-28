import { requirePermission } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'schedule.manage')
  const id = getRouterParam(event, 'id') || ''
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
  const rows = await prisma.staffTimeOff.findMany({
    where: { staffId: target.id },
    orderBy: { startsAt: 'desc' },
    take: 50,
  })
  return { timeOff: rows }
})
