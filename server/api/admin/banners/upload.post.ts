import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { storeFile } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const formData = await readMultipartFormData(event)
  if (!formData || !formData.length) throw createError({ statusCode: 400, message: 'No file provided' })

  const file = formData[0]
  if (!file.filename || !file.data) throw createError({ statusCode: 400, message: 'Invalid file' })

  const { relativePath } = await storeFile(file.data, 'banners', `banner-${Date.now()}-${file.filename}`)
  return { success: true, path: relativePath }
})
