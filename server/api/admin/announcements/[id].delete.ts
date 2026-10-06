import { createError, defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID required' })

  await prisma.announcementItem.delete({
    where: { id },
  })

  return { success: true }
})
