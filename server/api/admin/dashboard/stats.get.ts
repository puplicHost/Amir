import { getBookingSettings } from '../../../utils/booking-payments'
import { parseDayStr, tzDayStr, wallToUtcMs } from '../../../utils/booking-slots'

export default defineEventHandler(async (event) => {
  // Any authenticated admin user can view the dashboard stats
  const user = await requireAuth(event)

  const [
    totalProducts,
    totalCategories,
    activeServices,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.service.count({ where: { isActive: true } }),
  ])

  // ADM-01: booking/revenue/refund metrics. Revenue + queue numbers are
  // operational data — only users who can view all bookings receive them.
  const canViewBookings = user.isSuper || user.permissions.includes('bookings.view_all')
  let bookings: {
    totalBookings: number
    paidBookings: number
    todayBookings: number
    upcomingUnassigned: number
    pendingRefunds: number
    revenueCents: number
  } | null = null

  if (canViewBookings) {
    const settings = await getBookingSettings()
    const now = new Date()
    const dayStr = tzDayStr(now.getTime(), settings.timezone)
    const parts = parseDayStr(dayStr)
    let dayStart = now
    let dayEnd = now
    if (parts) {
      dayStart = new Date(wallToUtcMs(parts.year, parts.month, parts.day, 0, 0, settings.timezone))
      dayEnd = new Date(wallToUtcMs(parts.year, parts.month, parts.day, 23, 59, settings.timezone) + 59999)
    }

    const [totalBookings, paidBookings, todayBookings, upcomingUnassigned, pendingRefunds, revenue] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { paymentStatus: 'PAID' } }),
      prisma.booking.count({
        where: {
          startsAt: { gte: dayStart, lte: dayEnd },
          status: { notIn: ['CANCELLED', 'CANCELLED_BY_STAFF'] },
        },
      }),
      prisma.booking.count({
        where: { status: 'UNASSIGNED', paymentStatus: 'PAID', startsAt: { gte: now } },
      }),
      prisma.booking.count({ where: { needsRefund: true } }),
      prisma.booking.aggregate({ _sum: { depositCents: true }, where: { paymentStatus: 'PAID' } }),
    ])

    bookings = {
      totalBookings,
      paidBookings,
      todayBookings,
      upcomingUnassigned,
      pendingRefunds,
      revenueCents: revenue._sum.depositCents ?? 0,
    }
  }

  return {
    stats: {
      totalProducts,
      totalCategories,
      activeServices,
    },
    bookings,
  }
})
