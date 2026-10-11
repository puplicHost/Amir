import { createError, defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const body = await readBody(event)

  if (!body.textAr?.trim()) {
    throw createError({ statusCode: 400, message: 'Arabic text is required' })
  }

  const count = await prisma.announcementItem.count()
  if (count >= 10) {
    throw createError({ statusCode: 400, message: 'Maximum 10 announcement items allowed' })
  }

  const lastItem = await prisma.announcementItem.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  const item = await prisma.announcementItem.create({
    data: {
      textAr: String(body.textAr).trim(),
      textEn: body.textEn ? String(body.textEn).trim() : null,
      type: body.type || 'general',
      linkType: body.linkType || 'none',
      linkValue: body.linkValue ? String(body.linkValue).trim() : null,
      sortOrder: (lastItem?.sortOrder ?? 0) + 1,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    },
  })

  return { success: true, item }
})
