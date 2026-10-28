import { requirePermission } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'schedule.manage')
  const day = getRouterParam(event, 'day') || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw createError({ statusCode: 400, statusMessage: 'day must be YYYY-MM-DD' })
  }
  const row = await prisma.salonClosure.findUnique({ where: { day } })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Closure day not found' })
  await prisma.salonClosure.delete({ where: { day } })
  await logAudit({
    entityType: 'service',
    entityId: 'salon-closures',
    entityName: day,
    action: 'deleted',
    details: 'Removed a studio closure day',
    user,
  })
  return { success: true }
})
