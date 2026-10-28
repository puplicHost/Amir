import { requirePermission } from '../../../utils/auth'
import { bannerCreateSchema, parseBody } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  // AUDIT P3-08: validated payload (unknown keys stripped, enum/width checked).
  const body = await parseBody(event, bannerCreateSchema)

  const banner = await prisma.banner.create({
    data: {
      titleAr: body.titleAr,
      titleEn: body.titleEn,
      descriptionAr: body.descriptionAr || null,
      descriptionEn: body.descriptionEn || null,
      backgroundImagePath: body.backgroundImagePath || null,
      buttonTextAr: body.buttonTextAr || null,
      buttonTextEn: body.buttonTextEn || null,
      buttonLinkType: body.buttonLinkType || null,
      buttonLinkValue: body.buttonLinkValue || null,
      placement: body.placement || 'below_services',
      widthPercent: body.widthPercent ?? 100,
      backgroundColor: body.backgroundColor || null,
      textColor: body.textColor || null,
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  return { banner }
})
