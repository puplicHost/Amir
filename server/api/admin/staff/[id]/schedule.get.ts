import { requirePermission } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'schedule.manage')
  const id = getRouterParam(event, 'id') || ''
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
  const schedule = await prisma.staffSchedule.findMany({
    where: { staffId: target.id },
    orderBy: { weekday: 'asc' },
  })
  return { schedule }
})
