import { saveProductVideo } from '../../../../utils/storage'
import { logAudit } from '../../../../utils/audit'
import { parseBody, productVideoUrlSchema } from '../../../../utils/validate'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'products.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing product id' })

  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw createError({ statusCode: 404, message: 'Product not found' })

  const contentType = getHeader(event, 'content-type') || ''

  let videoType = 'youtube'
  let videoUrl = ''

  if (contentType.includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    const file = parts?.find(p => p.name === 'video' && p.filename)
    if (!file) throw createError({ statusCode: 400, message: 'No video file provided' })

    const relativePath = await saveProductVideo(id, file.data, file.type || 'video/mp4')
    videoType = 'upload'
    videoUrl = relativePath
  }
  else {
    // AUDIT P3-08: validated absolute http(s) video URL.
    const body = await parseBody(event, productVideoUrlSchema)
    const rawUrl = body.url

    if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be')) {
      videoType = 'youtube'
    }
    else if (rawUrl.includes('vimeo.com')) {
      videoType = 'vimeo'
    }
    else {
      videoType = 'upload'
    }
    videoUrl = rawUrl
  }

  const video = await prisma.productVideo.upsert({
    where: { productId: id },
    update: {
      type: videoType,
      url: videoUrl,
    },
    create: {
      productId: id,
      type: videoType,
      url: videoUrl,
    },
  })

  await logAudit({
    entityType: 'product',
    entityId: id,
    entityName: `${product.nameAr} / ${product.nameEn}`,
    action: 'media',
    details: 'Updated video',
    user: actor,
  })
  return { video }
})
