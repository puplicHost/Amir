import { requirePermission } from '../../../utils/auth'
import { getSiteSettings } from '../../../utils/site-settings'

// Salon profile + booking rules (plaintext operational settings).
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const settings = await getSiteSettings()
  return {
    salon: {
      whatsappNumber: settings?.whatsappNumber || '',
      businessName: settings?.businessName || '',
      businessAddress: settings?.businessAddress || '',
      slotStepMin: settings?.slotStepMin ?? 15,
      holdTtlMin: settings?.holdTtlMin ?? 20,
      depositPercent: settings?.depositPercent ?? 50,
      timezone: settings?.timezone || 'Europe/Berlin',
      bookingMinLeadMin: (settings as any)?.bookingMinLeadMin ?? 120,
      manualHoldTtlMin: (settings as any)?.manualHoldTtlMin ?? 1440,
      reassignmentWaDe: (settings as any)?.reassignmentWaDe ?? '',
      reassignmentWaEn: (settings as any)?.reassignmentWaEn ?? '',
      cancellationWindowHours: (settings as any)?.cancellationWindowHours ?? 24,
      reminderLeadMin: (settings as any)?.reminderLeadMin ?? 60,
      reminderEmailEnabled: (settings as any)?.reminderEmailEnabled ?? true,
    },
  }
})
