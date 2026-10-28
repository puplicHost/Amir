import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { upsertSiteSettings } from '../../../utils/site-settings'
import { saveFavicon } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const formData = await readMultipartFormData(event)
  if (!formData || !formData.length) throw createError({ statusCode: 400, message: 'No file provided' })

  const file = formData[0]
  if (!file?.filename || !file.data) throw createError({ statusCode: 400, message: 'Invalid file' })

  // Content-validated: real ICO (magic bytes) or raster image → PNG.
  const relativePath = await saveFavicon(file.data)

  await upsertSiteSettings({ faviconPath: relativePath }, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  return { success: true, path: relativePath }
})
