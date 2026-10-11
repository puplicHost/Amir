import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { storeFile } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.manage')
  const formData = await readMultipartFormData(event)
  if (!formData || !formData.length) {
    throw createError({ statusCode: 400, message: 'No file provided' })
  }

  const file = formData.find(f => f.name === 'file' || f.filename)
  if (!file || !file.filename || !file.data) {
    throw createError({ statusCode: 400, message: 'Invalid image file' })
  }

  if (file.data.length > 2 * 1024 * 1024) {
    throw createError({ statusCode: 400, message: 'Image exceeds maximum allowed size of 2MB' })
  }

  const { relativePath } = await storeFile(file.data, 'products/inline', `inline-${Date.now()}-${file.filename}`)
  return { success: true, url: relativePath }
})
