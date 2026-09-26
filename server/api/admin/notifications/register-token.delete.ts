import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = (await readBody(event)) || {}
  const token = typeof body.token === 'string' ? body.token.trim() : ''

  if (token) {
    await prisma.adminDeviceToken.deleteMany({
      where: { fcmToken: token, adminUserId: user.userId },
    })
  }

  return { ok: true }
})
