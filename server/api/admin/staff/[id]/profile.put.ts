import { requirePermission } from '../../../../utils/auth'
import { parseBody, staffProfileSchema } from '../../../../utils/validate'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'schedule.manage')
  const id = getRouterParam(event, 'id') || ''
  const body = await parseBody(event, staffProfileSchema)

  const target = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, name: true, role: true } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
  if (target.role !== 'STAFF') {
    throw createError({ statusCode: 400, statusMessage: 'Target user is not a staff member' })
  }

  const profile = await prisma.staffProfile.upsert({
    where: { userId: target.id },
    update: {
      displayName: body.displayName,
      ...(body.imagePath !== undefined ? { imagePath: body.imagePath || null } : {}),
      ...(body.isBookable !== undefined ? { isBookable: body.isBookable } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
    create: {
      userId: target.id,
      displayName: body.displayName,
      imagePath: body.imagePath || null,
      isBookable: body.isBookable ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  await logAudit({
    entityType: 'staff',
    entityId: target.id,
    entityName: target.name,
    action: 'updated',
    details: `Updated booking profile (${profile.displayName})`,
    user,
  })
  return { profile }
})
