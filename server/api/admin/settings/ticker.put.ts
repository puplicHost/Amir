import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const body = (await readBody(event)) || {}
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {
      tickerTextAr: typeof body.tickerTextAr === 'string' && body.tickerTextAr.trim() ? body.tickerTextAr.trim() : null,
      tickerTextEn: typeof body.tickerTextEn === 'string' && body.tickerTextEn.trim() ? body.tickerTextEn.trim() : null,
      tickerActive: body.tickerActive === true,
      tickerSpeed: Number.isFinite(Number(body.tickerSpeed))
        ? Math.min(120, Math.max(5, Number(body.tickerSpeed)))
        : 30,
    },
    create: {
      siteNameAr: 'AMIR',
      siteNameEn: 'Amir',
    },
  })
  return { success: true }
})
