import { requirePermission } from '../../../utils/auth'
import { BANNER_PLACEMENTS, BANNER_WIDTHS } from '../../../../shared/constants/banners'

const VALID_PLACEMENTS = new Set(BANNER_PLACEMENTS.map(p => p.value))

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const id = getRouterParam(event, 'id')
  const body = (await readBody(event)) || {}

  const data: Record<string, unknown> = {}
  for (const f of ['titleAr', 'titleEn'] as const) {
    if (f in body) {
      const v = typeof body[f] === 'string' ? body[f].trim() : ''
      if (!v) throw createError({ statusCode: 400, statusMessage: `${f} is required and cannot be empty` })
      data[f] = v
    }
  }
  for (const f of ['descriptionAr', 'descriptionEn', 'buttonTextAr', 'buttonTextEn'] as const) {
    if (f in body) data[f] = typeof body[f] === 'string' && body[f].trim() ? body[f].trim() : null
  }
  if ('backgroundImagePath' in body) {
    data.backgroundImagePath = typeof body.backgroundImagePath === 'string' && body.backgroundImagePath ? body.backgroundImagePath : null
  }
  if ('buttonLinkType' in body) data.buttonLinkType = typeof body.buttonLinkType === 'string' && body.buttonLinkType ? body.buttonLinkType : null
  if ('buttonLinkValue' in body) data.buttonLinkValue = typeof body.buttonLinkValue === 'string' && body.buttonLinkValue ? body.buttonLinkValue : null
  if ('backgroundColor' in body) data.backgroundColor = typeof body.backgroundColor === 'string' && body.backgroundColor.trim() ? body.backgroundColor.trim() : null
  if ('textColor' in body) data.textColor = typeof body.textColor === 'string' && body.textColor.trim() ? body.textColor.trim() : null
  if ('placement' in body) {
    if (typeof body.placement !== 'string' || !VALID_PLACEMENTS.has(body.placement as never)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid placement' })
    }
    data.placement = body.placement
  }
  if ('widthPercent' in body) {
    if (!(BANNER_WIDTHS as readonly number[]).includes(Number(body.widthPercent))) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid width' })
    }
    data.widthPercent = Number(body.widthPercent)
  }
  if ('isActive' in body) data.isActive = body.isActive !== false
  if ('sortOrder' in body && Number.isFinite(Number(body.sortOrder))) data.sortOrder = Number(body.sortOrder)

  const banner = await prisma.banner.update({ where: { id: id || '' }, data })
  return { banner }
})
