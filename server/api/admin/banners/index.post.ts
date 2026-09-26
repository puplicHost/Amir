import { requirePermission } from '../../../utils/auth'
import { BANNER_PLACEMENTS, BANNER_WIDTHS } from '../../../../shared/constants/banners'

const VALID_PLACEMENTS = new Set(BANNER_PLACEMENTS.map(p => p.value))

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const body = (await readBody(event)) || {}

  const titleAr = typeof body.titleAr === 'string' ? body.titleAr.trim() : ''
  const titleEn = typeof body.titleEn === 'string' ? body.titleEn.trim() : ''
  if (!titleAr || !titleEn) {
    throw createError({ statusCode: 400, statusMessage: 'Title (AR/EN) is required' })
  }
  const placement = typeof body.placement === 'string' && VALID_PLACEMENTS.has(body.placement as never)
    ? body.placement
    : 'below_services'
  const widthPercent = (BANNER_WIDTHS as readonly number[]).includes(Number(body.widthPercent))
    ? Number(body.widthPercent)
    : 100

  const banner = await prisma.banner.create({
    data: {
      titleAr,
      titleEn,
      descriptionAr: typeof body.descriptionAr === 'string' && body.descriptionAr.trim() ? body.descriptionAr.trim() : null,
      descriptionEn: typeof body.descriptionEn === 'string' && body.descriptionEn.trim() ? body.descriptionEn.trim() : null,
      backgroundImagePath: typeof body.backgroundImagePath === 'string' && body.backgroundImagePath ? body.backgroundImagePath : null,
      buttonTextAr: typeof body.buttonTextAr === 'string' && body.buttonTextAr.trim() ? body.buttonTextAr.trim() : null,
      buttonTextEn: typeof body.buttonTextEn === 'string' && body.buttonTextEn.trim() ? body.buttonTextEn.trim() : null,
      buttonLinkType: typeof body.buttonLinkType === 'string' && body.buttonLinkType ? body.buttonLinkType : null,
      buttonLinkValue: typeof body.buttonLinkValue === 'string' && body.buttonLinkValue ? body.buttonLinkValue : null,
      placement,
      widthPercent,
      isActive: body.isActive !== false,
      sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    },
  })
  return { banner }
})
