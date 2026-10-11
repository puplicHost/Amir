import { requirePermission } from '../../../utils/auth'

// Weekly working hours (Europe/Berlin). Rows are created via PUT;
// an empty table means "no availability configured".
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'schedule.manage')
  const days = await prisma.workingHours.findMany({
    orderBy: { weekday: 'asc' },
  })
  return { days }
})
