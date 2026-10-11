import { deletedLabel, logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'products.manage')
  const id = getRouterParam(event, 'id')
  const existing = await prisma.product.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  // Remove stored image files before DB deletion (rows cascade).
  await deleteProductDir(existing.id)
  await prisma.product.delete({ where: { id: existing.id } })
  await logAudit({
    entityType: 'product',
    entityId: existing.id,
    entityName: `${existing.nameAr} / ${existing.nameEn}`,
    action: 'deleted',
    details: deletedLabel('product'),
    user: actor,
  })
  return { ok: true }
})
