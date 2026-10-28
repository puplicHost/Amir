import { requirePermission } from '../../../../utils/auth'
import { parseBody, staffTimeOffCreateSchema } from '../../../../utils/validate'
import { recordAbsence } from '../../../../utils/staff-absence'
import { logAudit } from '../../../../utils/audit'

// Admin records an absence for a staff member (Roadmap Phase 6). Like the
// self-service button, overlapping ASSIGNED bookings return to the queue
// with a single grouped admin notice.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'schedule.manage')
  const id = getRouterParam(event, 'id') || ''
  const body = await parseBody(event, staffTimeOffCreateSchema)

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, name: true, role: true } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
  if (target.role !== 'STAFF') {
    throw createError({ statusCode: 400, statusMessage: 'Target user is not a staff member' })
  }

  const result = await recordAbsence({
    staffId: target.id,
    staffName: target.name,
    from: new Date(body.startsAt),
    to: new Date(body.endsAt),
    reason: body.reason?.trim() || null,
    createdBy: user.userId,
  })
  await logAudit({
    entityType: 'staff',
    entityId: target.id,
    entityName: target.name,
    action: 'updated',
    details: `Recorded absence, ${result.unassignedCount} booking(s) returned to queue`,
    user,
  })
  return result
})
