import { requireAuth } from '../../../utils/auth'
import { optionalPushTokenSchema, parseBody } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  // AUDIT P3-08: optional token, still shape-validated.
  const { token } = await parseBody(event, optionalPushTokenSchema)

  if (token) {
    await prisma.adminDeviceToken.deleteMany({
      where: { fcmToken: token, adminUserId: user.userId },
    })
  }

  return { ok: true }
})
