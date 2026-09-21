export default defineEventHandler(async (event) => {
  await requirePermission(event, 'categories.manage')
  const id = getRouterParam(event, 'id')
  const existing = await prisma.category.findUnique({
    where: { id: id || '' },
    include: { _count: { select: { products: true } } },
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  if (existing._count.products > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Remove or reassign products first' })
  }
  await prisma.category.delete({ where: { id: existing.id } })
  return { ok: true }
})
