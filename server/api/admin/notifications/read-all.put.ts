import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  await prisma.adminNotification.updateMany({
    where: { adminUserId: user.userId, isRead: false },
    data: { isRead: true },
  })

  return { ok: true }
})
