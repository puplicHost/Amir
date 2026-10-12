import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { logAudit } from '../../../utils/audit'
import { MAX_HERO_SLIDES, assertHeroImage, saveHeroSlide } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'settings.business')
  const formData = await readMultipartFormData(event)
  const files = (formData || []).filter(p => p.filename && p.data?.length)
  if (!files.length) throw createError({ statusCode: 400, statusMessage: 'No file provided' })

  // Enforce the 8-slide total on the server (UI limit is not enough).
  const existing = await prisma.heroSlide.count()
  if (existing + files.length > MAX_HERO_SLIDES) {
    throw createError({ statusCode: 400, statusMessage: `Maximum ${MAX_HERO_SLIDES} hero slides allowed` })
  }

  // Validate every file by actual content BEFORE writing anything.
  for (const file of files) {
    await assertHeroImage(file.data)
  }

  const maxSort = await prisma.heroSlide.aggregate({ _max: { sortOrder: true } })
  let next = (maxSort._max.sortOrder ?? -1) + 1
  const created = []
  for (const file of files) {
    const imagePath = await saveHeroSlide(file.data)
    const slide = await prisma.heroSlide.create({
      data: { imagePath, sortOrder: next++ },
    })
    created.push(slide)
    await logAudit({
      entityType: 'hero-slide',
      entityId: slide.id,
      entityName: slide.imagePath,
      action: 'created',
      details: 'Hero slide uploaded',
      user: actor,
    })
  }
  return { success: true, slides: created }
})
