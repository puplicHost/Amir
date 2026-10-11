import { promises as fs } from 'node:fs'
import { resolveUploadPath } from '../../../../../utils/storage'
import { logAudit } from '../../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'products.manage')
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
    const product = await prisma.product.findUnique({
      where: { id },
      select: { nameAr: true, nameEn: true },
    })
    await logAudit({
      entityType: 'product',
      entityId: id,
      entityName: product ? `${product.nameAr} / ${product.nameEn}` : id,
      action: 'media',
      details: 'Removed document',
      user: actor,
    })
  }

  return { ok: true }
})
