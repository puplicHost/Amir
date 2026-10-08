import { generateSlug, uniqueSlug } from '../../../../../shared/slug'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'products.create')
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing product ID' })

  const orig = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      attributes: { orderBy: { sortOrder: 'asc' } },
      seo: true,
      documents: true,
      video: true,
    },
  })
  if (!orig) throw createError({ statusCode: 404, message: 'Product not found' })

  const baseSlug = generateSlug(orig.nameEn || orig.nameAr) || 'product'
  const newSlug = await uniqueSlug(`${baseSlug}-copy`, async (s) => {
    const existing = await prisma.product.findUnique({ where: { slug: s } })
    return !!existing
  })

  const newSku = orig.sku ? `${orig.sku}-COPY-${Date.now().toString(36).slice(-4).toUpperCase()}` : null

  const duplicated = await prisma.product.create({
    data: {
      nameAr: `${orig.nameAr} (نسخة)`,
      nameEn: `${orig.nameEn} (Copy)`,
      slug: newSlug,
      sku: newSku,
      barcode: null,
      descriptionAr: orig.descriptionAr,
      descriptionEn: orig.descriptionEn,
      subtitleAr: orig.subtitleAr,
      subtitleEn: orig.subtitleEn,
      price: orig.price,
      compareAtPrice: orig.compareAtPrice,
      costPrice: orig.costPrice,
      stock: orig.stock,
      minStock: orig.minStock,
      categoryId: orig.categoryId,
      isActive: false, // default draft for safety
      isFeatured: false,
      images: {
        create: orig.images.map(img => ({
          path: img.path,
          alt: img.alt,
          sortOrder: img.sortOrder,
          isCover: img.isCover,
        })),
      },
      attributes: {
        create: orig.attributes.map(a => ({
          keyAr: a.keyAr,
          keyEn: a.keyEn,
          valueAr: a.valueAr,
          valueEn: a.valueEn,
          sortOrder: a.sortOrder,
        })),
      },
      seo: orig.seo ? {
        create: {
          metaTitleAr: orig.seo.metaTitleAr,
          metaTitleEn: orig.seo.metaTitleEn,
          metaDescriptionAr: orig.seo.metaDescriptionAr,
          metaDescriptionEn: orig.seo.metaDescriptionEn,
          keywords: orig.seo.keywords,
          geoContent: orig.seo.geoContent,
        },
      } : undefined,
      video: orig.video ? {
        create: {
          videoUrl: orig.video.videoUrl,
        },
      } : undefined,
    },
  })

  await logAudit({
    entityType: 'product',
    entityId: duplicated.id,
    entityName: `${duplicated.nameAr} / ${duplicated.nameEn}`,
    action: 'created',
    details: `نسخ من المنتج ${orig.nameAr}`,
    user: actor,
  })

  return duplicated
})
