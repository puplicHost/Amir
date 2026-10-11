import { requirePermission } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'notifications.view')

  await prisma.adminNotification.updateMany({
    where: { adminUserId: user.userId, isRead: false },
    data: { isRead: true },
  })

  return { ok: true }
})
