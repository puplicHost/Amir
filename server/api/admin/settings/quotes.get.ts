import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.view')
  const settings = await prisma.siteSettings.findFirst({
    select: { quoteTermsAr: true, quoteTermsEn: true },
  })

  return {
    quoteTermsAr: settings?.quoteTermsAr || '',
    quoteTermsEn: settings?.quoteTermsEn || '',
  }
})
