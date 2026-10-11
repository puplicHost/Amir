import { requirePermission } from '../../../utils/auth'
import { NOTIFICATION_PERMISSION } from '../../../utils/admin-notifications'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'notifications.view')

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 15))

  // A user only sees notification types matching their permissions.
  const allowedTypes = Object.entries(NOTIFICATION_PERMISSION)
    .filter(([, permission]) => {
      const perms = Array.isArray(permission) ? permission : [permission]
      return user.isSuper || perms.some(p => user.permissions.includes(p))
    })
    .map(([type]) => type)

  if (!allowedTypes.length) {
    return { notifications: [], unreadCount: 0, total: 0, page, pages: 0 }
  }

  const TYPE_GROUPS: Record<string, string[]> = {
    booking: ['new_booking', 'booking_cancelled_by_staff', 'booking_assigned', 'booking_reassigned'],
    staff: ['new_staff_user', 'staff_updated'],
    security: ['failed_logins', 'payment_needs_refund'],
  }
  let types = allowedTypes
  if (typeof query.type === 'string' && query.type) {
    const wanted = TYPE_GROUPS[query.type] || [query.type]
    types = wanted.filter(t => allowedTypes.includes(t))
  }
  if (!types.length) {
    return { notifications: [], unreadCount: 0, total: 0, page, pages: 0 }
  }

  const where: Record<string, unknown> = { adminUserId: user.userId, type: { in: types } }
  if (query.read === 'read') where.isRead = true
  else if (query.read === 'unread') where.isRead = false
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
