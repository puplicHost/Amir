import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.manage')
  const body = await readBody(event)
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {
      defaultCurrency: body.defaultCurrency,
      productsPerPage: Number(body.productsPerPage) || 16,
    },
    create: {
      siteNameAr: 'مانجو إلكترونيكس',
      siteNameEn: 'Mango Electronics',
    }
  })
  return { success: true }
})
