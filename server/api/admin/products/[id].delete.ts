export default defineEventHandler(async (event) => {
  await requirePermission(event, 'products.delete')
  const id = getRouterParam(event, 'id')
  const existing = await prisma.product.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  // Remove stored image files before DB deletion (rows cascade).
  await deleteProductDir(existing.id)
  await prisma.product.delete({ where: { id: existing.id } })
  return { ok: true }
})
