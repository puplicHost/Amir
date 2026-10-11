import { createError, defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID required' })

  const body = await readBody(event)

  const item = await prisma.announcementItem.update({
    where: { id },
    data: {
      textAr: body.textAr !== undefined ? String(body.textAr).trim() : undefined,
      textEn: body.textEn !== undefined ? (body.textEn ? String(body.textEn).trim() : null) : undefined,
      type: body.type !== undefined ? body.type : undefined,
      linkType: body.linkType !== undefined ? body.linkType : undefined,
      linkValue: body.linkValue !== undefined ? (body.linkValue ? String(body.linkValue).trim() : null) : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
    },
  })

  return { success: true, item }
})
