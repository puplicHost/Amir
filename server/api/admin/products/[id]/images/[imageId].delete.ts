import { unlink } from 'node:fs/promises'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.edit')
  const imageId = getRouterParam(event, 'imageId')
  const image = await prisma.productImage.findUnique({ where: { id: imageId || '' } })
  if (!image) throw createError({ statusCode: 404, statusMessage: 'Image not found' })

  const remaining = await prisma.productImage.findMany({
    where: { productId: image.productId, id: { not: image.id } },
    orderBy: { sortOrder: 'asc' },
  })

  await prisma.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: image.id } })
    // Keep cover invariant: first remaining image becomes cover.
    const ops = remaining.map((img, i) =>
      tx.productImage.update({
        where: { id: img.id },
        data: { sortOrder: i, isCover: i === 0 },
      }),
    )
    await Promise.all(ops)
  })

  // Best-effort file removal; DB is source of truth.
  try {
    const full = resolveUploadPath(image.path.replace(/^\/uploads\//, '').split('/'))
    if (full) await unlink(full)
  }
  catch { /* already gone */ }

  return { ok: true }
})
