import { promises as fs } from 'node:fs'
import { resolveUploadPath } from '../../../../utils/storage'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'products.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing product id' })

  const product = await prisma.product.findUnique({
    where: { id },
    select: { nameAr: true, nameEn: true },
  })
  const video = await prisma.productVideo.findUnique({
    where: { productId: id },
  })

  if (video) {
    if (video.type === 'upload' && video.url.startsWith('/uploads/')) {
      const parts = video.url.replace(/^\/uploads\//, '').split('/')
      const full = resolveUploadPath(parts)
      if (full) {
        await fs.unlink(full).catch(() => {})
      }
    }
    await prisma.productVideo.delete({ where: { productId: id } })
    await logAudit({
      entityType: 'product',
      entityId: id,
      entityName: product ? `${product.nameAr} / ${product.nameEn}` : id,
      action: 'media',
      details: 'Removed video',
      user: actor,
    })
  }

  return { ok: true }
})
