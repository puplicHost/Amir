import { getSessionUser } from '../../../utils/auth'
import { NOTIFICATION_PERMISSION } from '../../../utils/admin-notifications'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 15))

  // A staff user only sees notification types matching their permissions.
  const allowedTypes = Object.entries(NOTIFICATION_PERMISSION)
    .filter(([, permission]) => user.permissions.includes(permission))
    .map(([type]) => type)

  if (!allowedTypes.length) {
    return { notifications: [], unreadCount: 0, total: 0, page, pages: 0 }
  }

  const where = { adminUserId: user.userId, type: { in: allowedTypes } }
  const [total, unreadCount, rows] = await Promise.all([
    prisma.adminNotification.count({ where }),
    prisma.adminNotification.count({ where: { ...where, isRead: false } }),
    prisma.adminNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    notifications: rows,
    unreadCount,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  }
})
