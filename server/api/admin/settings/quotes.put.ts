import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'settings.manage')
  const body = (await readBody(event)) || {}

  const data: Record<string, unknown> = {}

  if (body.quoteTermsAr !== undefined || body.quoteTermsEn !== undefined) {
    if (body.quoteTermsAr !== undefined) {
      data.quoteTermsAr = typeof body.quoteTermsAr === 'string' && body.quoteTermsAr.trim() ? body.quoteTermsAr : null
    }
    if (body.quoteTermsEn !== undefined) {
      data.quoteTermsEn = typeof body.quoteTermsEn === 'string' && body.quoteTermsEn.trim() ? body.quoteTermsEn : null
    }
    data.quoteTermsUpdatedAt = new Date()
    data.quoteTermsUpdatedBy = actor.name
  }
  if (body.quoteSequenceNext !== undefined) {
    const n = Math.max(1, Math.floor(Number(body.quoteSequenceNext) || 0))
    if (!Number.isFinite(n) || n < 1) throw createError({ statusCode: 400, message: 'Invalid sequence start number' })
    data.quoteSequenceNext = n
  }
  if (body.quoteValidityDays !== undefined) {
    const d = Math.max(1, Math.floor(Number(body.quoteValidityDays) || 0))
    if (!Number.isFinite(d) || d < 1 || d > 365) throw createError({ statusCode: 400, message: 'Validity must be 1-365 days' })
    data.quoteValidityDays = d
  }
  if (body.quoteAutoMessage !== undefined) {
    data.quoteAutoMessage = typeof body.quoteAutoMessage === 'string' && body.quoteAutoMessage.trim() ? body.quoteAutoMessage.trim() : null
  }

  const existing = await prisma.siteSettings.findFirst()
  await prisma.siteSettings.upsert({
    where: { id: existing?.id || 1 },
    update: data,
    create: {
      siteNameAr: 'مانجو إلكترونيكس',
      siteNameEn: 'Mango Electronics',
      ...data,
    } as any,
  })

  return { success: true }
})
