import { requirePermission } from '../../../utils/auth'

// Active staff roster for the bookings filter. Managers can view all bookings
// but do not necessarily hold `users.manage`, so this stays scoped to the
// minimum fields needed (id + display name).
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'bookings.view_all')
  const staff = await prisma.adminUser.findMany({
    where: { role: 'STAFF', isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return { staff }
})
