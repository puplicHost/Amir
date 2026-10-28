import { requirePermission } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'schedule.manage')
  const closures = await prisma.salonClosure.findMany({ orderBy: { day: 'asc' } })
  return { closures }
})
