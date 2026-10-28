import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { saveFavicon } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const formData = await readMultipartFormData(event)
  if (!formData || !formData.length) throw createError({ statusCode: 400, message: 'No file provided' })

  const file = formData[0]
  if (!file?.filename || !file.data) throw createError({ statusCode: 400, message: 'Invalid file' })

  // Content-validated: real ICO (magic bytes) or raster image → PNG.
  const relativePath = await saveFavicon(file.data)

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { faviconPath: relativePath },
    create: { siteNameAr: 'AMIR', siteNameEn: 'Amir', faviconPath: relativePath },
  })
  return { success: true, path: relativePath }
})
