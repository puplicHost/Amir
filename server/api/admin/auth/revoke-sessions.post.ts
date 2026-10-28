import { requireAuth, revokeOtherSessions } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

// AUDIT P2-08: user-triggered revocation of every other signed-in device.
export default defineEventHandler(async (event) => {
  const actor = await requireAuth(event)
  const revoked = await revokeOtherSessions(event, actor.userId)
  await logAudit({
    entityType: 'admin-user',
    entityId: actor.userId,
    entityName: actor.email,
    action: 'updated',
    details: `Revoked ${revoked} other admin session(s)`,
    user: actor,
  })
  return { ok: true, revoked }
})
