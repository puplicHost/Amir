import { deleteServiceCoverFile, saveServiceCover } from '../../../../utils/storage'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'services.manage')
  const id = getRouterParam(event, 'id')
  const existing = await prisma.service.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Service not found' })

  const form = await readMultipartFormData(event)
  const file = form?.find(p => p.name === 'cover' && p.filename)
  if (!file || !file.data?.length) throw createError({ statusCode: 400, statusMessage: 'Cover image required' })

  const path = await saveServiceCover(existing.id, file.data, file.type)
  const service = await prisma.service.update({
    where: { id: existing.id },
    data: { coverImagePath: path },
  })
  if (existing.coverImagePath && existing.coverImagePath !== path) {
    await deleteServiceCoverFile(existing.coverImagePath)
  }

  await logAudit({
    entityType: 'service',
    entityId: existing.id,
    entityName: service.name,
    action: 'media',
    details: 'Updated service cover image',
    user: actor,
  })
  return { service }
})
