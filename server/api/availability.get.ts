import { daySlotStarts, daysFromToday, overlaps, parseDayStr, tzDayStr, tzParts, wallToUtcMs } from '../utils/booking-slots'
import { getBookingSettings } from '../utils/booking-payments'
import { getBookableStaff, isSalonClosedOnDay, loadDayBookings, slotFitsHours, type DayHours } from '../utils/staff-availability'
import { BOOKING_HORIZON_DAYS_DEFAULT } from '../../shared/booking'

// Public availability: slot grid for one service + Berlin day + staff
// (specific id or "any"), minus overlapping PAID bookings and unexpired
// PENDING holds of that staff member. Legacy staff-less bookings of the same
// service block every staff member. Only booleans are returned — a booked
// slot never reveals who booked it.
// PERF-01: no write-on-read. Lapsed holds are ignored here (loadDayBookings
// filters holdExpiresAt > now) and physically expired by the sweeper plugin.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const slug = typeof q.service === 'string' ? q.service : ''
  const dayStr = typeof q.date === 'string' ? q.date : ''
  const staffParam = typeof q.staff === 'string' && q.staff.trim() ? q.staff.trim() : 'any'
  if (!slug || !parseDayStr(dayStr)) {
    throw createError({ statusCode: 400, statusMessage: 'service and date=YYYY-MM-DD are required' })
  }

  const service = await prisma.service.findFirst({ where: { slug, isActive: true } })
  if (!service) throw createError({ statusCode: 404, statusMessage: 'Service not found' })
  const settings = await getBookingSettings()
  const tz = settings.timezone

  const now = new Date()
  const ahead = daysFromToday(dayStr, tzDayStr(now.getTime(), tz))
  if (ahead < 0 || ahead > BOOKING_HORIZON_DAYS_DEFAULT) {
    throw createError({ statusCode: 400, statusMessage: 'Date is outside the booking horizon' })
  }
  const cancelWindowHours = settings.cancellationWindowHours
  const empty = (staff: unknown, staffOptions: unknown) => ({
    service: {
      slug: service.slug, name: service.name,
      priceAbCents: service.priceAbCents, durationMin: service.durationMin,
    },
    date: dayStr, timezone: tz, horizonDays: BOOKING_HORIZON_DAYS_DEFAULT, staff, staffOptions, slots: [], cancelWindowHours,
  })

  const dayWeekday = tzParts(Date.parse(`${dayStr}T12:00:00Z`), tz).weekday
  const hours = await prisma.workingHours.findUnique({ where: { weekday: dayWeekday } })
  const salon: DayHours = hours
    ? { openMin: hours.openMin, closeMin: hours.closeMin, isClosed: hours.isClosed }
    : { openMin: 0, closeMin: 0, isClosed: true }

  const eligible = await getBookableStaff(service.id)
  if (staffParam !== 'any') {
    const user = await prisma.adminUser.findUnique({
      where: { id: staffParam },
      select: { id: true, isActive: true, role: true },
    })
    if (!user || !user.isActive || user.role !== 'STAFF') {
      throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
    }
    const bookable = eligible.find(s => s.id === staffParam)
    if (!bookable) {
      // Exists but cannot be booked online for this service: no slots,
      // same shape as a fully booked day.
      return empty({ id: staffParam }, [])
    }
    if (!hours || hours.isClosed || await isSalonClosedOnDay(dayStr)) {
      return empty(bookable, [bookable])
    }
    const starts = daySlotStarts({
      dayStr,
      openMin: hours.openMin,
      closeMin: hours.closeMin,
      stepMin: settings.slotStepMin,
      durationMin: service.durationMin,
      nowUtcMs: now.getTime(),
      tz,
    }).filter(s => s > now.getTime() + settings.bookingMinLeadMin * 60000)
    const available = await staffSlotAvailability({
      staffIds: [bookable.id],
      serviceId: service.id,
      starts,
      durationMin: service.durationMin,
      weekday: dayWeekday,
      salon,
      dayStr,
      tz,
      nowMs: now.getTime(),
    })
    return {
      service: {
        slug: service.slug, name: service.name,
        priceAbCents: service.priceAbCents, durationMin: service.durationMin,
      },
      date: dayStr,
      timezone: tz,
      horizonDays: BOOKING_HORIZON_DAYS_DEFAULT,
      cancelWindowHours,
      staff: bookable,
      staffOptions: [bookable],
      slots: starts.map((s, i) => ({ startsAt: new Date(s).toISOString(), available: available[i] })),
    }
  }

  // No bookable staff => nobody can serve any slot. Return an empty grid rather
  // than a full grid of "unavailable" slots, which the UI would mislabel as
  // "Booked" (there is no booking — the salon simply has no staff configured).
  if (eligible.length === 0) return empty('any', [])

  if (!hours || hours.isClosed || await isSalonClosedOnDay(dayStr)) {
    return empty('any', eligible)
  }
  const starts = daySlotStarts({
    dayStr,
    openMin: hours.openMin,
    closeMin: hours.closeMin,
    stepMin: settings.slotStepMin,
    durationMin: service.durationMin,
    nowUtcMs: now.getTime(),
    tz,
  }).filter(s => s > now.getTime() + settings.bookingMinLeadMin * 60000)
  const available = await staffSlotAvailability({
    staffIds: eligible.map(s => s.id),
    serviceId: service.id,
    starts,
    durationMin: service.durationMin,
    weekday: dayWeekday,
    salon,
    dayStr,
    tz,
    nowMs: now.getTime(),
  })

  return {
    service: {
      slug: service.slug, name: service.name,
      priceAbCents: service.priceAbCents, durationMin: service.durationMin,
    },
    date: dayStr,
    timezone: tz,
    horizonDays: BOOKING_HORIZON_DAYS_DEFAULT,
    cancelWindowHours,
    staff: 'any',
    staffOptions: eligible,
    slots: starts.map((s, i) => ({ startsAt: new Date(s).toISOString(), available: available[i] })),
  }
})

/**
 * Per-slot availability across a set of staff: a slot is available when at
 * least one of the given staff members is free (schedule fit, no time-off,
 * no overlapping booking). Day-level rows are loaded once.
 */
async function staffSlotAvailability(input: {
  staffIds: string[]
  serviceId: string
  starts: number[]
  durationMin: number
  weekday: number
  salon: DayHours
  dayStr: string
  tz: string
  nowMs: number
}): Promise<boolean[]> {
  if (!input.staffIds.length || !input.starts.length) {
    return input.starts.map(() => false)
  }
  const dayParts = parseDayStr(input.dayStr)!
  const dayStartMs = wallToUtcMs(dayParts.year, dayParts.month, dayParts.day, 0, 0, input.tz)
  const dayEndMs = wallToUtcMs(dayParts.year, dayParts.month, dayParts.day, 23, 59, input.tz) + 59999
  const [schedules, timeOffs, dayRows] = await Promise.all([
    prisma.staffSchedule.findMany({
      where: { staffId: { in: input.staffIds }, weekday: input.weekday },
    }),
    prisma.staffTimeOff.findMany({
      where: {
        staffId: { in: input.staffIds },
        startsAt: { lt: new Date(dayEndMs) },
        endsAt: { gt: new Date(dayStartMs) },
      },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
    loadDayBookings(dayStartMs - 1440 * 60000, dayEndMs, input.nowMs),
  ])
  const schedByStaff = new Map(schedules.map(s => [s.staffId, s]))
  const offByStaff = new Map<string, { start: number, end: number }[]>()
  for (const t of timeOffs) {
    const list = offByStaff.get(t.staffId) ?? []
    list.push({ start: t.startsAt.getTime(), end: t.endsAt.getTime() })
    offByStaff.set(t.staffId, list)
  }
  const durMs = input.durationMin * 60000
  return input.starts.map((start) => {
    const end = start + durMs
    const wall = tzParts(start, input.tz)
    const wallMin = wall.hour * 60 + wall.minute
    return input.staffIds.some((staffId) => {
      const row = schedByStaff.get(staffId)
      const dayHours: DayHours = row
        ? { openMin: row.openMin, closeMin: row.closeMin, isClosed: row.isClosed }
        : input.salon
      if (!slotFitsHours(wallMin, input.durationMin, dayHours)) return false
      if ((offByStaff.get(staffId) ?? []).some(o => overlaps(start, end, o.start, o.end))) return false
      const busy = dayRows.some(r =>
        overlaps(start, end, r.start, r.end)
        && (r.assignedStaffId === staffId || (r.assignedStaffId === null && r.serviceId === input.serviceId)),
      )
      return !busy
    })
  })
}
