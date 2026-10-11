import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { logoPath: null },
    create: { siteNameAr: 'AMIR', siteNameEn: 'Amir', logoPath: null },
  })
  return { success: true }
})
