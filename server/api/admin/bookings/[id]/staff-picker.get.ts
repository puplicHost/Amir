import { requirePermission } from '../../../../utils/auth'
import { overlaps } from '../../../../utils/booking-slots'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'bookings.assign')

  const id = getRouterParam(event, 'id') || ''
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, startsAt: true, durationMinSnapshot: true },
  })
  if (!booking) {
    throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  }

  const startMs = booking.startsAt.getTime()
  const endMs = startMs + booking.durationMinSnapshot * 60000

  // 1. All active staff members.
  const staffMembers = await prisma.adminUser.findMany({
    where: { role: 'STAFF', isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  // 2. All ASSIGNED bookings during the surrounding window for any of these staff.
  const staffIds = staffMembers.map(s => s.id)
  const busyRows = staffIds.length
    ? await prisma.booking.findMany({
      where: {
        assignedStaffId: { in: staffIds },
        status: 'ASSIGNED',
        id: { not: booking.id },
        startsAt: { lt: new Date(endMs), gte: new Date(startMs - 1440 * 60000) },
      },
      select: { assignedStaffId: true, startsAt: true, durationMinSnapshot: true },
    })
    : []

  const busyByStaff = new Map<string, { start: number, end: number }[]>()
  for (const b of busyRows) {
    if (!b.assignedStaffId) continue
    if (!busyByStaff.has(b.assignedStaffId)) busyByStaff.set(b.assignedStaffId, [])
    busyByStaff.get(b.assignedStaffId)!.push({
      start: b.startsAt.getTime(),
      end: b.startsAt.getTime() + b.durationMinSnapshot * 60000,
    })
  }

  const result = staffMembers.map((s) => {
    const list = busyByStaff.get(s.id) || []
    const isOverlapping = list.some(b => overlaps(startMs, endMs, b.start, b.end))
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      isAvailable: !isOverlapping,
      reason: isOverlapping ? 'Has overlapping assignment' : null,
    }
  })

  return { staff: result }
})
