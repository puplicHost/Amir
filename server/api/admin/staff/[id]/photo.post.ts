import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../../utils/auth'
import { saveStaffPhoto } from '../../../../utils/storage'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'schedule.manage')
  const id = getRouterParam(event, 'id') || ''
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, name: true, role: true } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
  if (target.role !== 'STAFF') {
    throw createError({ statusCode: 400, statusMessage: 'Target user is not a staff member' })
  }

  const formData = await readMultipartFormData(event)
  const file = formData?.find(f => f.name === 'file' || f.filename)
  if (!file || !file.filename || !file.data) {
    throw createError({ statusCode: 400, message: 'Invalid image file' })
  }
  // Content-validated + re-encoded WebP (size, format sniffed via sharp).
  const relativePath = await saveStaffPhoto(target.id, file.data)
  const existing = await prisma.staffProfile.findUnique({ where: { userId: target.id } })
  const profile = existing
    ? await prisma.staffProfile.update({ where: { userId: target.id }, data: { imagePath: relativePath } })
    : await prisma.staffProfile.create({ data: { userId: target.id, displayName: target.name, imagePath: relativePath } })
  await logAudit({
    entityType: 'staff',
    entityId: target.id,
    entityName: target.name,
    action: 'media',
    details: 'Updated staff photo',
    user,
  })
  return { success: true, profile }
})
