import { ALL_PERMISSIONS, getEffectivePermissions } from '../../shared/permissions.ts'

// Fan-out of in-app admin notifications + push. Never throws: notification
// failures must never break the public request flows.
export const NOTIFICATION_PERMISSION: Record<string, string | string[]> = {
  new_booking: ['bookings.assign', 'bookings.view_all'],
  booking_cancelled_by_staff: ['bookings.assign', 'bookings.view_all'],
  payment_needs_refund: ['bookings.assign', 'bookings.view_all', 'bookings.refund_handle'],
  booking_assigned: 'bookings.view_own',
  booking_reassigned: 'bookings.view_own',
  new_staff_user: 'users.manage',
  staff_updated: 'users.manage',
  failed_logins: 'users.manage',
}

export type AdminNotificationType =
  | 'new_booking'
  | 'payment_needs_refund'
  | 'booking_cancelled_by_staff'
  | 'booking_assigned'
  | 'booking_reassigned'
  | 'new_staff_user'
  | 'staff_updated'
  | 'failed_logins'

export interface NotifyAdminsInput {
  type: AdminNotificationType
  relatedEntityId: string
  url?: string
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
}

export function resolveNotificationUrl(
  user: { isSuper: boolean, role: string, permissions: { permission: string }[] },
  input: NotifyAdminsInput,
): string {
  const isBookingNotif = input.type.startsWith('booking_') || input.type === 'new_booking' || input.type === 'payment_needs_refund'
  if (!isBookingNotif) {
    return input.url || '/admin/notifications'
  }
  const perms = user.isSuper
    ? ALL_PERMISSIONS
    : getEffectivePermissions(user.role, user.permissions.map(p => p.permission))
  if (perms.includes('bookings.view_all') || perms.includes('bookings.assign')) {
    return input.relatedEntityId ? `/admin/bookings/${input.relatedEntityId}` : '/admin/bookings'
  }
  if (perms.includes('bookings.view_own')) {
    return '/admin/my-bookings'
  }
  return '/admin/notifications'
}

export async function notifyAdmins(input: NotifyAdminsInput): Promise<void> {
  try {
    const permission = NOTIFICATION_PERMISSION[input.type]
    if (!permission) return

    const eligibleUsers = await findEligibleAdminUsers(permission)
    if (!eligibleUsers.length) return

    for (const u of eligibleUsers) {
      const userUrl = resolveNotificationUrl(u, input)
      await prisma.adminNotification.create({
        data: {
          adminUserId: u.id,
          type: input.type,
          titleEn: input.titleEn,
          titleAr: input.titleAr,
          bodyEn: input.bodyEn,
          bodyAr: input.bodyAr,
          relatedEntityId: input.relatedEntityId,
          url: userUrl,
        },
      })
      await sendPushToUser(u.id, {
        title: input.titleEn,
        body: input.bodyEn,
        url: userUrl,
        type: input.type,
      }).catch(() => null)
    }
  }
  catch (e) {
    console.error('[notifications] Fan-out failed:', (e as Error)?.message || e)
  }
}

export async function notifyUser(userId: string, input: NotifyAdminsInput): Promise<void> {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      include: { permissions: true },
    })
    if (!user || !user.isActive) return

    const userUrl = resolveNotificationUrl(user, input)
    await prisma.adminNotification.create({
      data: {
        adminUserId: user.id,
        type: input.type,
        titleEn: input.titleEn,
        titleAr: input.titleAr,
        bodyEn: input.bodyEn,
        bodyAr: input.bodyAr,
        relatedEntityId: input.relatedEntityId,
        url: userUrl,
      },
    })
    await sendPushToUser(user.id, {
      title: input.titleEn,
      body: input.bodyEn,
      url: userUrl,
      type: input.type,
    }).catch(() => null)
  }
  catch (e) {
    console.error('[notifications] Direct notify failed:', (e as Error)?.message || e)
  }
}
