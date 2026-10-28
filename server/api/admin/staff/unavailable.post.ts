import { requirePermission } from '../../../utils/auth'
import { parseBody, staffUnavailableSchema } from '../../../utils/validate'
import { recordAbsence } from '../../../utils/staff-absence'
import { logAudit } from '../../../utils/audit'

// "I'm unavailable" (Roadmap Phase 6): the calling staff member reports an
// absence range. One transaction records the time-off and returns all their
// overlapping ASSIGNED bookings to the UNASSIGNED queue; one grouped notice
// goes to assignment-capable admins.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'bookings.cancel_own')
  const body = await parseBody(event, staffUnavailableSchema)

  const me = await prisma.adminUser.findUnique({
    where: { id: user.userId },
    select: { id: true, name: true, isActive: true },
  })
  if (!me || !me.isActive) {
    throw createError({ statusCode: 403, statusMessage: 'Account is not active' })
  }

  const result = await recordAbsence({
    staffId: me.id,
    staffName: me.name,
    from: new Date(body.from),
    to: new Date(body.to),
    reason: body.reason?.trim() || null,
    createdBy: user.userId,
  })
  await logAudit({
    entityType: 'staff',
    entityId: me.id,
    entityName: me.name,
    action: 'updated',
    details: `Reported absence, ${result.unassignedCount} booking(s) returned to queue`,
    user,
  })
  return result
})
