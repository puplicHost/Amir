import { requirePermission } from '../../../utils/auth'
import { bannerSchema, parseBody } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const id = getRouterParam(event, 'id')
  // AUDIT P3-08: partial update validated against the banner schema.
  const body = await parseBody(event, bannerSchema)

  const data: Record<string, unknown> = {}
  for (const f of ['titleAr', 'titleEn'] as const) {
    if (body[f] !== undefined) data[f] = body[f]
  }
  for (const f of ['descriptionAr', 'descriptionEn', 'buttonTextAr', 'buttonTextEn'] as const) {
    if (body[f] !== undefined) data[f] = body[f] || null
  }
  if (body.backgroundImagePath !== undefined) data.backgroundImagePath = body.backgroundImagePath || null
  if (body.buttonLinkType !== undefined) data.buttonLinkType = body.buttonLinkType || null
  if (body.buttonLinkValue !== undefined) data.buttonLinkValue = body.buttonLinkValue || null
  if (body.backgroundColor !== undefined) data.backgroundColor = body.backgroundColor || null
  if (body.textColor !== undefined) data.textColor = body.textColor || null
  if (body.placement !== undefined) data.placement = body.placement
  if (body.widthPercent !== undefined) data.widthPercent = body.widthPercent
  if (body.isActive !== undefined) data.isActive = body.isActive
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

  const banner = await prisma.banner.update({ where: { id: id || '' }, data })
  return { banner }
})
