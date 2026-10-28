import { requireAuth } from '../../../utils/auth'
import { parseBody, passwordChangeSchema } from '../../../utils/validate'
import { logAudit } from '../../../utils/audit'
import { ALL_PERMISSIONS, getEffectivePermissions } from '../../../../shared/permissions'

// AUDIT P2-07: self-service password rotation. Requires the current password,
// resets lockout state, and revokes every existing session before issuing a
// fresh cookie for this browser.
export default defineEventHandler(async (event) => {
  const actor = await requireAuth(event)
  const body = await parseBody(event, passwordChangeSchema)

  const user = await prisma.adminUser.findUnique({ where: { id: actor.userId } })
  if (!user || !user.isActive) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
    throw createError({ statusCode: 400, statusMessage: 'Current password is incorrect' })
  }
  if (body.currentPassword === body.newPassword) {
    throw createError({ statusCode: 400, statusMessage: 'New password must differ from the current password' })
  }

  const passwordHash = await hashPassword(body.newPassword)
  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }),
    prisma.adminSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])

  await logAudit({
    entityType: 'admin-user',
    entityId: user.id,
    entityName: user.email,
    action: 'updated',
    details: 'Password changed; all sessions revoked',
    user: actor,
  })

  // Replace the revoked cookie with a fresh session so the user stays signed in.
  const refreshed = await prisma.adminUser.findUnique({
    where: { id: user.id },
    include: { permissions: true },
  })
  if (refreshed) {
    await createSession(event, {
      userId: refreshed.id,
      email: refreshed.email,
      name: refreshed.name,
      role: refreshed.role,
      isSuper: refreshed.isSuper,
      permissions: refreshed.isSuper
        ? [...ALL_PERMISSIONS]
        : getEffectivePermissions(refreshed.role, refreshed.permissions.map(p => p.permission)),
    })
  }

  return { ok: true }
})
