import { generateSlug, uniqueSlug } from '../../../../shared/slug'
import { createdLabel, logAudit } from '../../../utils/audit'
import { categoryCreateSchema, parseBody } from '../../../utils/validate'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'categories.manage')
  // AUDIT P3-08: validated payload; unknown keys are stripped.
  const body = await parseBody(event, categoryCreateSchema)
  const nameAr = body.nameAr
  const nameEn = body.nameEn

  const base = body.slug && body.slug.trim()
    ? generateSlug(body.slug)
    : generateSlug(nameEn)
  const slug = await uniqueSlug(base, async s => !!(await prisma.category.findUnique({ where: { slug: s } })))

  const category = await prisma.category.create({
    data: {
      nameAr,
      nameEn,
      // AUDIT P2-11: optional German copy; blank becomes NULL (fallback to EN).
      nameDe: typeof body.nameDe === 'string' && body.nameDe.trim() ? body.nameDe.trim() : null,
      slug,
      descriptionAr: body.descriptionAr || null,
      descriptionEn: body.descriptionEn || null,
      descriptionDe: typeof body.descriptionDe === 'string' && body.descriptionDe.trim() ? body.descriptionDe : null,
      coverVideoUrl: body.coverVideoUrl || null,
      featuredOnHomepage: body.featuredOnHomepage === true,
      sortOrder: Number(body.sortOrder) || 0,
    },
  })
  await logAudit({
    entityType: 'category',
    entityId: category.id,
    entityName: `${nameAr} / ${nameEn}`,
    action: 'created',
    details: createdLabel('category'),
    user: actor,
  })
  return { category }
})
