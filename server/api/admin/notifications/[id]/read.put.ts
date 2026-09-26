import { requireAuth } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing notification id' })

  await prisma.adminNotification.updateMany({
    where: { id, adminUserId: user.userId },
    data: { isRead: true },
  })

  return { ok: true }
})
