import { requirePermission } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'
import { logAudit } from '../../../../utils/audit'
import { parseBody, heroSlideUpdateSchema } from '../../../../utils/validate'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'settings.business')
  const id = getRouterParam(event, 'id')
  const body = await parseBody(event, heroSlideUpdateSchema)

  const existing = await prisma.heroSlide.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Hero slide not found' })

  const data: Record<string, unknown> = {}
  if (body.isActive !== undefined) data.isActive = body.isActive
  if (body.altText !== undefined) data.altText = body.altText?.trim() ? body.altText.trim() : null

  const slide = await prisma.heroSlide.update({ where: { id: existing.id }, data })
  await logAudit({
    entityType: 'hero-slide',
    entityId: existing.id,
    entityName: slide.imagePath,
    action: 'updated',
    details: 'Hero slide updated',
    user: actor,
  })
  return { slide }
})
