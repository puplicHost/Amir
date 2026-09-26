import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = (await readBody(event)) || {}
  const token = typeof body.token === 'string' ? body.token.trim() : ''

  if (!token || token.length < 10) {
    throw createError({ statusCode: 400, statusMessage: 'FCM device token is required' })
  }

  await prisma.adminDeviceToken.upsert({
    where: { fcmToken: token },
    update: { adminUserId: user.userId, lastUsedAt: new Date() },
    create: { adminUserId: user.userId, fcmToken: token },
  })

  return { ok: true }
})
