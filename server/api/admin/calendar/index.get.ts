import { requirePermission } from '../../../utils/auth'
import { parseDayStr, tzDayStr, wallToUtcMs } from '../../../utils/booking-slots'
import { getBookingSettings } from '../../../utils/booking-payments'
import { waLink } from '../../../../shared/booking'

const MAX_RANGE_DAYS = 35

// Admin calendar feed (Roadmap Phase 5): bookings + staff absences + studio
// closures inside a Berlin date range. Staff without bookings.view_all only
// see their own bookings and absences (server-enforced).
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['bookings.view_all', 'bookings.view_own'])
  const canViewAll = user.isSuper || user.permissions.includes('bookings.view_all')
  const q = getQuery(event)
  const settings = await getBookingSettings()
  const tz = settings.timezone

  const todayStr = tzDayStr(Date.now(), tz)
  const fromStr = typeof q.from === 'string' && parseDayStr(q.from) ? q.from : todayStr
  const toStr = typeof q.to === 'string' && parseDayStr(q.to) ? q.to : fromStr
  const fromP = parseDayStr(fromStr)!
  const toP = parseDayStr(toStr)!
  const rangeDays = Math.round(
    (Date.parse(`${toStr}T00:00:00Z`) - Date.parse(`${fromStr}T00:00:00Z`)) / 86400000,
  )
  if (rangeDays < 0 || rangeDays > MAX_RANGE_DAYS) {
    throw createError({ statusCode: 400, statusMessage: `Date range must span 0-${MAX_RANGE_DAYS} days` })
  }
  const rangeStartMs = wallToUtcMs(fromP.year, fromP.month, fromP.day, 0, 0, tz)
  const rangeEndMs = wallToUtcMs(toP.year, toP.month, toP.day, 23, 59, tz) + 59999

  const bookingWhere: Record<string, unknown> = {
    startsAt: { gte: new Date(rangeStartMs), lte: new Date(rangeEndMs) },
  }
  if (!canViewAll) bookingWhere.assignedStaffId = user.userId
  else if (typeof q.staffId === 'string' && q.staffId) bookingWhere.assignedStaffId = q.staffId

  const [rows, timeOff, closures] = await Promise.all([
    prisma.booking.findMany({
      where: bookingWhere,
      orderBy: { startsAt: 'asc' },
      take: 2000,
      include: {
        service: { select: { id: true, name: true, slug: true } },
        assignedStaff: { select: { id: true, name: true } },
      },
    }),
    prisma.staffTimeOff.findMany({
      where: {
        ...(canViewAll
          ? (typeof q.staffId === 'string' && q.staffId ? { staffId: q.staffId } : {})
          : { staffId: user.userId }),
        startsAt: { lt: new Date(rangeEndMs) },
        endsAt: { gt: new Date(rangeStartMs) },
      },
      orderBy: { startsAt: 'asc' },
      take: 500,
      include: { staff: { select: { id: true, name: true } } },
    }),
    prisma.salonClosure.findMany({
      where: { day: { gte: fromStr, lte: toStr } },
      orderBy: { day: 'asc' },
    }),
  ])

  return {
    from: fromStr,
    to: toStr,
    timezone: tz,
    isStaffView: !canViewAll,
    bookings: rows.map(b => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      serviceId: b.service.id,
      serviceName: b.service.name,
      serviceSlug: b.service.slug,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail,
      waLink: waLink(b.customerPhone),
      startsAt: b.startsAt,
      durationMinSnapshot: b.durationMinSnapshot,
      depositCents: b.depositCents,
      paymentProvider: b.paymentProvider,
      paymentStatus: b.paymentStatus,
      status: b.status,
      source: (b as any).source ?? 'ONLINE',
      staffChoice: (b as any).staffChoice ?? 'ANY',
      assignedStaffId: b.assignedStaffId,
      assignedStaffName: b.assignedStaff?.name ?? null,
      needsRefund: b.needsRefund,
      notes: b.notes,
    })),
    timeOff: timeOff.map(t => ({
      id: t.id,
      staffId: t.staffId,
      staffName: t.staff.name,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      reason: t.reason,
    })),
    closures,
  }
})
