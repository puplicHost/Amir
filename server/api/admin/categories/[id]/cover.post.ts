export default defineEventHandler(async (event) => {
  await requirePermission(event, 'categories.manage')
  const id = getRouterParam(event, 'id')
  const existing = await prisma.category.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Category not found' })

  const form = await readMultipartFormData(event)
  const file = form?.find(p => p.name === 'cover' && p.filename)
  if (!file || !file.data?.length) throw createError({ statusCode: 400, statusMessage: 'Cover image required' })

  const path = await saveCategoryCover(existing.id, file.data, file.type)
  const category = await prisma.category.update({
    where: { id: existing.id },
    data: { coverImagePath: path },
  })
  return { category }
})
