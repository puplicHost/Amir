import { requirePermission } from '../../../utils/auth'

// Staff roster for booking management (Roadmap Phase 4).
// Only users with role STAFF; profile/services default to bookable-everything
// when no rows exist yet.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'schedule.manage')
  const rows = await prisma.adminUser.findMany({
    where: { role: 'STAFF' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      staffProfile: true,
      staffServices: { select: { serviceId: true } },
    },
  })
  const services = await prisma.service.findMany({
    orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
    select: { id: true, slug: true, name: true, section: true, isActive: true },
  })
  return {
    staff: rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      isActive: r.isActive,
      profile: r.staffProfile ?? null,
      serviceIds: r.staffServices.map(s => s.serviceId),
    })),
    services,
  }
})
