import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { saveBrandImage } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const formData = await readMultipartFormData(event)
  if (!formData || !formData.length) throw createError({ statusCode: 400, message: 'No file provided' })

  const file = formData[0]
  if (!file?.filename || !file.data) throw createError({ statusCode: 400, message: 'Invalid file' })

  // Content-validated + re-encoded to WebP (never trust extension/MIME).
  const relativePath = await saveBrandImage('settings', 'logo', file.data, 600)

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { logoPath: relativePath },
    create: { siteNameAr: 'AMIR', siteNameEn: 'Amir', logoPath: relativePath },
  })
  return { success: true, path: relativePath }
})
