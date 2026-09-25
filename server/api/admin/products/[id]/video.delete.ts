import { promises as fs } from 'node:fs'
import { resolveUploadPath } from '../../../../utils/storage'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.edit')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing product id' })

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
  }

  return { ok: true }
})
