import { getBookableStaff } from '../../utils/staff-availability'

// Public bookable staff list (Roadmap Phase 4). Only public profile fields —
// never emails, phones or internal data. Optional ?service=<slug> filter.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  let serviceId: string | undefined
  if (typeof q.service === 'string' && q.service.trim()) {
    const service = await prisma.service.findFirst({
      where: { slug: q.service.trim(), isActive: true },
      select: { id: true },
    })
    if (!service) throw createError({ statusCode: 404, statusMessage: 'Service not found' })
    serviceId = service.id
  }
  const staff = await getBookableStaff(serviceId)
  return { staff }
})
