import { requirePermission } from '../../../../utils/auth'
import { parseBody, staffScheduleUpdateSchema } from '../../../../utils/validate'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'schedule.manage')
  const id = getRouterParam(event, 'id') || ''
  const body = await parseBody(event, staffScheduleUpdateSchema)

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, name: true, role: true } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
  if (target.role !== 'STAFF') {
    throw createError({ statusCode: 400, statusMessage: 'Target user is not a staff member' })
  }

  const seen = new Set<number>()
  for (const d of body.days) {
    if (seen.has(d.weekday)) {
      throw createError({ statusCode: 400, statusMessage: 'Duplicate weekday in payload' })
    }
    seen.add(d.weekday)
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffSchedule.deleteMany({ where: { staffId: target.id } })
    await tx.staffSchedule.createMany({
      data: body.days.map(d => ({
        staffId: target.id,
        weekday: d.weekday,
        openMin: d.openMin,
        closeMin: d.closeMin,
        isClosed: d.isClosed ?? false,
      })),
    })
  })
  await logAudit({
    entityType: 'staff',
    entityId: target.id,
    entityName: target.name,
    action: 'updated',
    details: 'Updated weekly schedule',
    user,
  })
  const schedule = await prisma.staffSchedule.findMany({
    where: { staffId: target.id },
    orderBy: { weekday: 'asc' },
  })
  return { schedule }
})
