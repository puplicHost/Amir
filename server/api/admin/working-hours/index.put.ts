import { requirePermission } from '../../../utils/auth'
import { parseBody, workingHoursUpdateSchema } from '../../../utils/validate'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'schedule.manage')
  const body = await parseBody(event, workingHoursUpdateSchema)

  const seen = new Set<number>()
  for (const d of body.days) {
    if (seen.has(d.weekday)) {
      throw createError({ statusCode: 400, statusMessage: 'Duplicate weekday in payload' })
    }
    seen.add(d.weekday)
  }

  await prisma.$transaction(
    body.days.map(d =>
      prisma.workingHours.upsert({
        where: { weekday: d.weekday },
        update: {
          openMin: d.openMin,
          closeMin: d.closeMin,
          isClosed: d.isClosed ?? false,
        },
        create: {
          weekday: d.weekday,
          openMin: d.openMin,
          closeMin: d.closeMin,
          isClosed: d.isClosed ?? false,
        },
      }),
    ),
  )
  await logAudit({
    entityType: 'service',
    entityId: 'working-hours',
    entityName: 'Working hours',
    action: 'updated',
    details: 'Updated working hours',
    user: actor,
  })
  const days = await prisma.workingHours.findMany({ orderBy: { weekday: 'asc' } })
  return { days }
})
