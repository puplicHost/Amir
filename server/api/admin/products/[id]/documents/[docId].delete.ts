import { promises as fs } from 'node:fs'
import { resolveUploadPath } from '../../../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.edit')
  const id = getRouterParam(event, 'id')
  const docId = getRouterParam(event, 'docId')
  if (!id || !docId) throw createError({ statusCode: 400, message: 'Missing parameters' })

  const doc = await prisma.productDocument.findFirst({
    where: { id: docId, productId: id },
  })

  if (doc) {
    if (doc.filePath.startsWith('/uploads/')) {
      const parts = doc.filePath.replace(/^\/uploads\//, '').split('/')
      const full = resolveUploadPath(parts)
      if (full) {
        await fs.unlink(full).catch(() => {})
      }
    }
    await prisma.productDocument.delete({ where: { id: doc.id } })
  }

  return { ok: true }
})
