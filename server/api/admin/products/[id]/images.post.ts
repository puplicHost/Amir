import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'products.edit')
  const id = getRouterParam(event, 'id')
  const existing = await prisma.product.findUnique({
    where: { id: id || '' },
    include: { images: true },
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  const form = await readMultipartFormData(event)
  const files = (form || []).filter(p => p.name === 'images' && p.filename && p.data?.length)
  if (!files.length) throw createError({ statusCode: 400, statusMessage: 'No images provided' })

  const saved: { path: string, sortOrder: number, isCover: boolean }[] = []
  const startOrder = existing.images.length
  for (const [i, file] of files.entries()) {
    const path = await saveProductImage(existing.id, file.data, file.type)
    saved.push({ path, sortOrder: startOrder + i, isCover: existing.images.length === 0 && i === 0 })
  }
  await prisma.productImage.createMany({ data: saved.map(s => ({ ...s, productId: existing.id })) })

  const images = await prisma.productImage.findMany({
    where: { productId: existing.id },
    orderBy: { sortOrder: 'asc' },
  })
  await logAudit({
    entityType: 'product',
    entityId: existing.id,
    entityName: `${existing.nameAr} / ${existing.nameEn}`,
    action: 'media',
    details: 'غيّر الصور',
    user: actor,
  })
  return { images }
})
