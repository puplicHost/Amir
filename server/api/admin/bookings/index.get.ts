import { requirePermission } from '../../../utils/auth'
import { parseDayStr, wallToUtcMs } from '../../../utils/booking-slots'
import { waLink } from '../../../../shared/booking'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['bookings.view_all', 'bookings.view_own'])
  const canViewAll = user.isSuper || user.permissions.includes('bookings.view_all')
  const q = getQuery(event)

  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 20))
  const where: Record<string, unknown> = {}

  if (!canViewAll) {
    // Staff sees only bookings assigned to them.
    where.assignedStaffId = user.userId
  }
  else if (typeof q.staffId === 'string' && q.staffId) {
    where.assignedStaffId = q.staffId
  }

  if (typeof q.status === 'string' && q.status) {
    where.status = q.status
  }

  if (typeof q.needsRefund === 'string' && q.needsRefund) {
    where.needsRefund = q.needsRefund === 'true'
  }

  if (typeof q.date === 'string' && q.date) {
    const p = parseDayStr(q.date)
    if (p) {
      const startMs = wallToUtcMs(p.year, p.month, p.day, 0, 0, 'Europe/Berlin')
      const endMs = wallToUtcMs(p.year, p.month, p.day, 23, 59, 'Europe/Berlin') + 59999
      where.startsAt = { gte: new Date(startMs), lte: new Date(endMs) }
    }
  }

  if (typeof q.search === 'string' && q.search.trim()) {
    const s = q.search.trim()
    where.OR = [
      { bookingNumber: { contains: s, mode: 'insensitive' } },
      { customerName: { contains: s, mode: 'insensitive' } },
      { customerPhone: { contains: s } },
    ]
  }

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { startsAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        service: { select: { id: true, name: true, slug: true } },
        assignedStaff: { select: { id: true, name: true, email: true } },
      },
    }),
  ])

  const bookings = rows.map(b => ({
    id: b.id,
    bookingNumber: b.bookingNumber,
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    customerEmail: b.customerEmail,
    waLink: waLink(b.customerPhone),
    startsAt: b.startsAt,
    durationMinSnapshot: b.durationMinSnapshot,
    priceSnapshotCents: b.priceSnapshotCents,
    depositCents: b.depositCents,
    paymentProvider: b.paymentProvider,
    paymentStatus: b.paymentStatus,
    providerRef: b.providerRef,
    status: b.status,
    assignedStaffId: b.assignedStaffId,
    assignedStaff: b.assignedStaff,
    service: b.service,
    notes: b.notes,
    needsRefund: b.needsRefund,
    createdAt: b.createdAt,
  }))

  return {
    bookings,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
    isStaffView: !canViewAll,
  }
})
