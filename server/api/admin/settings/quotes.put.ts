import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.manage')
  const body = (await readBody(event)) || {}

  const quoteTermsAr = typeof body.quoteTermsAr === 'string' ? body.quoteTermsAr.trim() : null
  const quoteTermsEn = typeof body.quoteTermsEn === 'string' ? body.quoteTermsEn.trim() : null

  const existing = await prisma.siteSettings.findFirst()
  await prisma.siteSettings.upsert({
    where: { id: existing?.id || 1 },
    update: { quoteTermsAr, quoteTermsEn },
    create: {
      siteNameAr: 'مانجو إلكترونيكس',
      siteNameEn: 'Mango Electronics',
      quoteTermsAr,
      quoteTermsEn,
    },
  })

  return { success: true }
})
