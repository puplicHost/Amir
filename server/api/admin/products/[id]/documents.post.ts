import { saveProductDocument } from '../../../../utils/storage'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'products.edit')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing product id' })

  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw createError({ statusCode: 404, message: 'Product not found' })

  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, message: 'Expected multipart form data' })

  const file = parts.find(p => p.name === 'document' && p.filename)
  if (!file) throw createError({ statusCode: 400, message: 'No document file uploaded' })

  const labelEnPart = parts.find(p => p.name === 'labelEn')
  const labelArPart = parts.find(p => p.name === 'labelAr')

  const labelEn = labelEnPart ? labelEnPart.data.toString('utf-8').trim() : (file.filename || 'Datasheet')
  const labelAr = labelArPart ? labelArPart.data.toString('utf-8').trim() : labelEn

  const relativePath = await saveProductDocument(id, file.data, file.filename, file.type || 'application/pdf')

  const count = await prisma.productDocument.count({ where: { productId: id } })

  const document = await prisma.productDocument.create({
    data: {
      productId: id,
      labelAr: labelAr || 'كتيب المواصفات',
      labelEn: labelEn || 'Datasheet',
      filePath: relativePath,
      fileType: 'pdf',
      sortOrder: count + 1,
    },
  })

  await logAudit({
    entityType: 'product',
    entityId: id,
    entityName: `${product.nameAr} / ${product.nameEn}`,
    action: 'media',
    details: 'غيّر المستندات',
    user: actor,
  })
  return { document }
})
