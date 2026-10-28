import { requirePermission } from '../../../utils/auth'
import { announcementItemSchema, parseBody } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID required' })

  // AUDIT P3-08: validated partial update (text length, type/link enums).
  const body = await parseBody(event, announcementItemSchema)

  const item = await prisma.announcementItem.update({
    where: { id },
    data: {
      textAr: body.textAr !== undefined ? body.textAr : undefined,
      textEn: body.textEn !== undefined ? (body.textEn || null) : undefined,
      type: body.type !== undefined ? body.type : undefined,
      linkType: body.linkType !== undefined ? body.linkType : undefined,
      linkValue: body.linkValue !== undefined ? (body.linkValue || null) : undefined,
      isActive: body.isActive,
      sortOrder: body.sortOrder,
    },
  })

  return { success: true, item }
})
