import { requireAuth } from '../../../utils/auth'
import { parseBody, pushTokenSchema } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  // AUDIT P3-08: token shape validated (length bounds, trimmed).
  const { token } = await parseBody(event, pushTokenSchema)

  await prisma.adminDeviceToken.upsert({
    where: { fcmToken: token },
    update: { adminUserId: user.userId, lastUsedAt: new Date() },
    create: { adminUserId: user.userId, fcmToken: token },
  })

  return { ok: true }
})
