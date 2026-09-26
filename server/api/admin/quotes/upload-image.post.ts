import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { storeFile } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'quotes.manage')
  const formData = await readMultipartFormData(event)
  if (!formData || !formData.length) throw createError({ statusCode: 400, message: 'No file provided' })

  const file = formData[0]
  if (!file.filename || !file.data) throw createError({ statusCode: 400, message: 'Invalid file' })

  if (file.data.length > 5 * 1024 * 1024) {
    throw createError({ statusCode: 400, message: 'Image size must be 5MB or less' })
  }

  const { relativePath } = await storeFile(file.data, 'quotes/custom-items', `custom-${Date.now()}-${file.filename}`)
  return { success: true, path: relativePath }
})
