import { requirePermission } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'
import { logAudit } from '../../../../utils/audit'
import { deleteHeroSlideFiles } from '../../../../utils/storage'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'settings.business')
  const id = getRouterParam(event, 'id')

  const existing = await prisma.heroSlide.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Hero slide not found' })

  await prisma.heroSlide.delete({ where: { id: existing.id } })
  // Remove ONLY this slide's own files; never anything else in storage/.
  await deleteHeroSlideFiles(existing.imagePath)
  await logAudit({
    entityType: 'hero-slide',
    entityId: existing.id,
    entityName: existing.imagePath,
    action: 'deleted',
    details: 'Hero slide deleted',
    user: actor,
  })
  return { success: true }
})
