import { requirePermission } from '../../../utils/auth'

// Salon profile + booking rules (plaintext operational settings).
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const settings = await prisma.siteSettings.findFirst()
  return {
    salon: {
      whatsappNumber: settings?.whatsappNumber || '',
      businessName: settings?.businessName || '',
      businessAddress: settings?.businessAddress || '',
      slotStepMin: settings?.slotStepMin ?? 15,
      holdTtlMin: settings?.holdTtlMin ?? 20,
      depositPercent: settings?.depositPercent ?? 50,
      timezone: settings?.timezone || 'Europe/Berlin',
    },
  }
})
