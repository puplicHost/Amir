import { requirePermission } from '../../../utils/auth'
import { parseBody, bookingSettingsSchema } from '../../../utils/validate'
import { upsertSiteSettings } from '../../../utils/site-settings'

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
  if (body.bookingMinLeadMin !== undefined) data.bookingMinLeadMin = body.bookingMinLeadMin
  if (body.manualHoldTtlMin !== undefined) data.manualHoldTtlMin = body.manualHoldTtlMin
  if (body.reassignmentWaDe !== undefined) {
    data.reassignmentWaDe = body.reassignmentWaDe?.trim() ? body.reassignmentWaDe.trim() : null
  }
  if (body.reassignmentWaEn !== undefined) {
    data.reassignmentWaEn = body.reassignmentWaEn?.trim() ? body.reassignmentWaEn.trim() : null
  }
  if (body.cancellationWindowHours !== undefined) data.cancellationWindowHours = body.cancellationWindowHours
  if (body.reminderLeadMin !== undefined) data.reminderLeadMin = body.reminderLeadMin
  if (body.reminderEmailEnabled !== undefined) data.reminderEmailEnabled = body.reminderEmailEnabled
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

  await upsertSiteSettings(data, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  return { success: true }
})
