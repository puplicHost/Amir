import { requirePermission } from '../../../utils/auth'
import { announcementCreateSchema, parseBody } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  // AUDIT P3-08: validated payload; unknown keys are stripped.
  const body = await parseBody(event, announcementCreateSchema)

  const count = await prisma.announcementItem.count()
  if (count >= 10) {
    throw createError({ statusCode: 400, message: 'Maximum 10 announcement items allowed' })
  }

  const lastItem = await prisma.announcementItem.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  const item = await prisma.announcementItem.create({
    data: {
      textAr: body.textAr,
      textEn: body.textEn ? body.textEn : null,
      type: body.type || 'general',
      linkType: body.linkType || 'none',
      linkValue: body.linkValue ? body.linkValue : null,
      sortOrder: (lastItem?.sortOrder ?? 0) + 1,
      isActive: body.isActive !== false,
    },
  })

  return { success: true, item }
})
