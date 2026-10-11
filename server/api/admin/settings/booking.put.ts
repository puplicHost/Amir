import { requirePermission } from '../../../utils/auth'
import { parseBody, bookingSettingsSchema } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const body = await parseBody(event, bookingSettingsSchema)
  const data: Record<string, unknown> = {}

  if (body.whatsappNumber !== undefined) {
    data.whatsappNumber = body.whatsappNumber?.trim() ? body.whatsappNumber.trim() : null
  }
  if (body.businessName !== undefined) {
    data.businessName = body.businessName?.trim() ? body.businessName.trim() : null
  }
  if (body.businessAddress !== undefined) {
    data.businessAddress = body.businessAddress?.trim() ? body.businessAddress.trim() : null
  }
  if (body.slotStepMin !== undefined) data.slotStepMin = body.slotStepMin
  if (body.holdTtlMin !== undefined) data.holdTtlMin = body.holdTtlMin
  if (body.depositPercent !== undefined) data.depositPercent = body.depositPercent
  if (body.timezone !== undefined) {
    const tz = body.timezone.trim() || 'Europe/Berlin'
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz })
    }
    catch {
      throw createError({ statusCode: 400, statusMessage: 'Invalid timezone' })
    }
    data.timezone = tz
  }

  const existing = await prisma.siteSettings.findFirst()
  await prisma.siteSettings.upsert({
    where: { id: existing?.id || 1 },
    update: data,
    create: {
      siteNameAr: 'AMIR',
      siteNameEn: 'Amir',
      ...data,
    },
  })
  return { success: true }
})
