import { requirePermission } from '../../../utils/auth'
import { parseBody, workingHoursUpdateSchema } from '../../../utils/validate'
import { logAudit } from '../../../utils/audit'

// AUDIT P1-03: writes are serialized and rejected when the client's revision
// does not match the current table. A failed/never-completed GET therefore
// cannot silently replace real hours with editor defaults.
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

  const result = await prisma.$transaction(async (tx) => {
    // Serialize schedule writers. The second transaction re-reads after the
    // first commits and sees the new updatedAt, so its stale revision fails.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('working-hours'))`

    const existing = await tx.workingHours.findMany({ orderBy: { weekday: 'asc' } })
    const currentRevision = existing.reduce<Date | null>((latest, day) => {
      return !latest || day.updatedAt > latest ? day.updatedAt : latest
    }, null)
    const currentIso = currentRevision ? currentRevision.toISOString() : null
    if (currentIso !== body.expectedRevision) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Schedule changed since it was loaded. Reload before saving.',
      })
    }

    for (const d of body.days) {
      await tx.workingHours.upsert({
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
      })
    }

    const days = await tx.workingHours.findMany({ orderBy: { weekday: 'asc' } })
    const revision = days.reduce<Date | null>((latest, day) => {
      return !latest || day.updatedAt > latest ? day.updatedAt : latest
    }, null)
    return { days, revision: revision ? revision.toISOString() : null }
  })

  await logAudit({
    entityType: 'service',
    entityId: 'working-hours',
    entityName: 'Working hours',
    action: 'updated',
    details: `Updated working hours (${body.days.map(d => d.weekday).join(', ')})`,
    user: actor,
  })

  return result
})
