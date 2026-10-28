import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { saveBrandImage } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const formData = await readMultipartFormData(event)
  if (!formData || !formData.length) throw createError({ statusCode: 400, message: 'No file provided' })

  const file = formData[0]
  if (!file?.filename || !file.data) throw createError({ statusCode: 400, message: 'Invalid file' })

  // Content-validated + re-encoded to WebP (banners/ is a public scope).
  const relativePath = await saveBrandImage('banners', 'banner', file.data, 2000)
  return { success: true, path: relativePath }
})
