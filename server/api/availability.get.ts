import { daySlotStarts, daysFromToday, markAvailable, parseDayStr, tzDayStr, tzParts } from '../utils/booking-slots'
import { expireHolds, getBookingSettings } from '../utils/booking-payments'
import { BOOKING_HORIZON_DAYS_DEFAULT } from '../../shared/booking'

// Public availability: slot grid for one service + Berlin day,
// minus overlapping PAID bookings and unexpired PENDING holds.
// Expires lapsed holds lazily so freed slots show immediately.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const slug = typeof q.service === 'string' ? q.service : ''
  const dayStr = typeof q.date === 'string' ? q.date : ''
  if (!slug || !parseDayStr(dayStr)) {
    throw createError({ statusCode: 400, statusMessage: 'service and date=YYYY-MM-DD are required' })
  }

  const service = await prisma.service.findFirst({ where: { slug, isActive: true } })
  if (!service) throw createError({ statusCode: 404, statusMessage: 'Service not found' })
  const settings = await getBookingSettings()
  const tz = settings.timezone

  await expireHolds()

  const now = new Date()
  const ahead = daysFromToday(dayStr, tzDayStr(now.getTime(), tz))
  if (ahead < 0 || ahead > BOOKING_HORIZON_DAYS_DEFAULT) {
    throw createError({ statusCode: 400, statusMessage: 'Date is outside the booking horizon' })
  }
  const dayWeekday = tzParts(Date.parse(`${dayStr}T12:00:00Z`), tz).weekday
  const hours = await prisma.workingHours.findUnique({ where: { weekday: dayWeekday } })
  if (!hours || hours.isClosed) {
    return {
      service: {
        slug: service.slug, name: service.name,
        priceAbCents: service.priceAbCents, durationMin: service.durationMin,
      },
      date: dayStr, timezone: tz, slots: [],
    }
  }

  const starts = daySlotStarts({
    dayStr,
    openMin: hours.openMin,
    closeMin: hours.closeMin,
    stepMin: settings.slotStepMin,
    durationMin: service.durationMin,
    nowUtcMs: now.getTime(),
    tz,
  })

  // Busy intervals: PAID bookings + unexpired PENDING holds for this service.
  const dayStart = Date.parse(`${dayStr}T00:00:00Z`) - 86400000
  const dayEnd = Date.parse(`${dayStr}T00:00:00Z`) + 2 * 86400000
  const busyRows = await prisma.booking.findMany({
    where: {
      serviceId: service.id,
      startsAt: { gte: new Date(dayStart), lte: new Date(dayEnd) },
      OR: [
        { paymentStatus: 'PAID' },
        { paymentStatus: 'PENDING', holdExpiresAt: { gt: now } },
      ],
    },
    select: { startsAt: true, durationMinSnapshot: true },
  })
  const busy = busyRows.map(b => ({
    start: b.startsAt.getTime(),
    end: b.startsAt.getTime() + b.durationMinSnapshot * 60000,
  }))
  const available = markAvailable(starts, busy, service.durationMin)

  return {
    service: {
      slug: service.slug, name: service.name,
      priceAbCents: service.priceAbCents, durationMin: service.durationMin,
    },
    date: dayStr,
    timezone: tz,
    horizonDays: BOOKING_HORIZON_DAYS_DEFAULT,
    slots: starts.map((s, i) => ({ startsAt: new Date(s).toISOString(), available: available[i] })),
  }
})
