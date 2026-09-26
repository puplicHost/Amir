// Fan-out of in-app admin notifications + push. Never throws: notification
// failures must never break the public checkout / request / quote flows.
export const NOTIFICATION_PERMISSION: Record<string, string> = {
  new_order: 'orders.view',
  new_service_request: 'services.view',
  new_quote: 'quotes.view',
  new_staff_user: 'users.manage',
  staff_updated: 'users.manage',
  failed_logins: 'users.manage',
}

export type AdminNotificationType =
  | 'new_order'
  | 'new_service_request'
  | 'new_quote'
  | 'new_staff_user'
  | 'staff_updated'
  | 'failed_logins'

export interface NotifyAdminsInput {
  type: AdminNotificationType
  relatedEntityId: string
  url: string
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
}

export async function notifyAdmins(input: NotifyAdminsInput): Promise<void> {
  try {
    const permission = NOTIFICATION_PERMISSION[input.type]
    if (!permission) return

    const adminIds = await findEligibleAdminIds(permission)
    if (!adminIds.length) return

    await prisma.adminNotification.createMany({
      data: adminIds.map(adminUserId => ({
        adminUserId,
        type: input.type,
        titleEn: input.titleEn,
        titleAr: input.titleAr,
        bodyEn: input.bodyEn,
        bodyAr: input.bodyAr,
        relatedEntityId: input.relatedEntityId,
        url: input.url,
      })),
    })

    await sendPushToAdmins({
      permission,
      title: input.titleEn,
      body: input.bodyEn,
      url: input.url,
      type: input.type,
    })
  }
  catch (e) {
    console.error('[notifications] Fan-out failed:', (e as Error)?.message || e)
  }
}
