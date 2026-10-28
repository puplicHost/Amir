import { requirePermission } from '../../../utils/auth'

// Weekly working hours (salon-local). Rows are created via PUT; an empty table
// means "no availability configured".
// AUDIT P1-03: expose a revision so the editor cannot overwrite a schedule it
// never successfully loaded (or that another admin changed meanwhile).
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'schedule.manage')
  const days = await prisma.workingHours.findMany({
    orderBy: { weekday: 'asc' },
  })
  const revision = days.reduce<Date | null>((latest, day) => {
    return !latest || day.updatedAt > latest ? day.updatedAt : latest
  }, null)
  return { days, revision: revision ? revision.toISOString() : null }
})
