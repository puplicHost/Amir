import { requirePermission } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'
import { logAudit } from '../../../../utils/audit'
import { parseBody, heroSlideOrderSchema } from '../../../../utils/validate'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'settings.business')
  const body = await parseBody(event, heroSlideOrderSchema)

  const existing = await prisma.heroSlide.findMany({ select: { id: true } })
  const existingIds = existing.map(s => s.id)
  const unique = new Set(body.order)
  const exact =
    unique.size === body.order.length &&
    body.order.length === existingIds.length &&
    body.order.every(id => existingIds.includes(id))
  if (!exact) {
    throw createError({ statusCode: 400, statusMessage: 'Order must contain each existing slide id exactly once' })
  }

  await prisma.$transaction(
    body.order.map((id, index) =>
      prisma.heroSlide.update({ where: { id }, data: { sortOrder: index } }),
    ),
  )
  await logAudit({
    entityType: 'hero-slide',
    entityId: 'all',
    entityName: 'Hero slides',
    action: 'updated',
    details: 'Hero slide order updated',
    user: actor,
  })
  return { success: true }
})
