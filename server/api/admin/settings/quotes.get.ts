import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.view')
  const settings = await prisma.siteSettings.findFirst({
    select: {
      quoteTermsAr: true,
      quoteTermsEn: true,
      quoteTermsUpdatedAt: true,
      quoteTermsUpdatedBy: true,
      quoteSequenceNext: true,
      quoteValidityDays: true,
      quoteAutoMessage: true,
    },
  })

  return {
    quoteTermsAr: settings?.quoteTermsAr || '',
    quoteTermsEn: settings?.quoteTermsEn || '',
    quoteTermsUpdatedAt: settings?.quoteTermsUpdatedAt || null,
    quoteTermsUpdatedBy: (settings as any)?.quoteTermsUpdatedBy || null,
    quoteSequenceNext: (settings as any)?.quoteSequenceNext ?? 1000,
    quoteValidityDays: (settings as any)?.quoteValidityDays ?? 30,
    quoteAutoMessage: (settings as any)?.quoteAutoMessage || '',
  }
})
