import {
  daysFromToday,
  isOnSlotStep,
  parseDayStr,
  tzDayStr,
  tzParts,
  wallToUtcMs,
} from '../../utils/booking-slots'
import { depositCentsFor } from '../../../shared/booking'
import {
  expireHolds,
  getBookingSettings,
  getGatewayStatus,
  newBookingNumber,
  newIdempotencyKey,
  newPublicToken,
} from '../../utils/booking-payments'
import {
  isSalonClosedOnDay,
  isStaffBusy,
  isStaffOnTimeOff,
  loadDayBookings,
  pickStaffForSlot,
  slotFitsHours,
  staffScheduleForDay,
} from '../../utils/staff-availability'
import { bookingCreateSchema, parseBody } from '../../utils/validate'
import { BOOKING_HORIZON_DAYS_DEFAULT } from '../../../shared/booking'

// Guest booking creation. Amounts/currency/snapshots are computed server-side
// from the service row — nothing price-related is trusted from the client.
// Overlap is re-checked inside the transaction so two customers cannot take
// the same slot. Payment happens in a second step (POST …/pay).
// Roadmap Phase 4: the customer chooses a staff member (or "any"); the slot
// is held for that staff member while PENDING and auto-assigned on payment.
export default defineEventHandler(async (event) => {
  const body = await parseBody(event, bookingCreateSchema)
  const settings = await getBookingSettings()
  const tz = settings.timezone

  const service = await prisma.service.findFirst({
    where: { slug: body.serviceSlug, isActive: true },
  })
  if (!service) throw createError({ statusCode: 404, statusMessage: 'Service not found' })

  // Idempotent retry: a re-sent client key returns the original booking.
  if (body.idempotencyKey) {
    const existing = await prisma.booking.findUnique({ where: { idempotencyKey: body.idempotencyKey } })
    if (existing) {
      const gateways = await getGatewayStatus()
      return {
        token: existing.publicToken,
        bookingNumber: existing.bookingNumber,
        startsAt: existing.startsAt,
        depositCents: existing.depositCents,
        currency: settings.currency,
        paymentStatus: existing.paymentStatus,
        assignedStaffId: existing.assignedStaffId,
        staffChoice: (existing as any).staffChoice ?? 'ANY',
        gateways,
        created: false,
      }
    }
  }

  const startsAt = new Date(body.startsAt)
  if (!Number.isFinite(startsAt.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid startsAt' })
  }
  const now = new Date()
  if (startsAt.getTime() <= now.getTime()) {
    throw createError({ statusCode: 400, statusMessage: 'Slot must be in the future' })
  }
  if (startsAt.getTime() < now.getTime() + settings.bookingMinLeadMin * 60000) {
    throw createError({ statusCode: 400, statusMessage: 'Slot is too soon to book online' })
  }
  const dayStr = tzDayStr(startsAt.getTime(), tz)
  const dayParts = parseDayStr(dayStr)
  if (!dayParts) throw createError({ statusCode: 400, statusMessage: 'Invalid date' })
  const ahead = daysFromToday(dayStr, tzDayStr(now.getTime(), tz))
  if (ahead < 0 || ahead > BOOKING_HORIZON_DAYS_DEFAULT) {
    throw createError({ statusCode: 400, statusMessage: 'Date is outside the booking horizon' })
  }

  if (await isSalonClosedOnDay(dayStr)) {
    throw createError({ statusCode: 409, statusMessage: 'Salon is closed on this day' })
  }
  const dayWeekday = tzParts(Date.parse(`${dayStr}T12:00:00Z`), tz).weekday
  const hours = await prisma.workingHours.findUnique({ where: { weekday: dayWeekday } })
  if (!hours || hours.isClosed) {
    throw createError({ statusCode: 409, statusMessage: 'Salon is closed on this day' })
  }
  if (!isOnSlotStep(startsAt.getTime(), dayStr, hours.openMin, settings.slotStepMin, tz)) {
    throw createError({ statusCode: 400, statusMessage: 'Slot is not on the booking grid' })
  }
  const wall = tzParts(startsAt.getTime(), tz)
  const wallMin = wall.hour * 60 + wall.minute
  if (wallMin < hours.openMin || wallMin + service.durationMin > hours.closeMin) {
    throw createError({ statusCode: 409, statusMessage: 'Slot is outside working hours' })
  }

  // Requested staff: specific id or ANY (missing/empty/'any').
  const requestedStaffId = body.staffId && body.staffId !== 'any' ? body.staffId : null
  const staffChoice = requestedStaffId ? 'SPECIFIC' : 'ANY'
  if (requestedStaffId) {
    const target = await prisma.adminUser.findUnique({
      where: { id: requestedStaffId },
      include: { staffProfile: true, staffServices: { select: { serviceId: true } } },
    })
    if (!target || !target.isActive || target.role !== 'STAFF') {
      throw createError({ statusCode: 400, statusMessage: 'Selected staff member is not available' })
    }
    if (target.staffProfile && target.staffProfile.isBookable === false) {
      throw createError({ statusCode: 400, statusMessage: 'Selected staff member is not available' })
    }
    if (target.staffServices.length > 0 && !target.staffServices.some(s => s.serviceId === service.id)) {
      throw createError({ statusCode: 400, statusMessage: 'Selected staff member does not offer this service' })
    }
    const dayHours = await staffScheduleForDay(
      target.id, dayWeekday, { openMin: hours.openMin, closeMin: hours.closeMin, isClosed: hours.isClosed },
    )
    if (!slotFitsHours(wallMin, service.durationMin, dayHours)) {
      throw createError({ statusCode: 409, statusMessage: 'Selected staff member is not available at this time' })
    }
    if (await isStaffOnTimeOff(target.id, startsAt.getTime(), startsAt.getTime() + service.durationMin * 60000)) {
      throw createError({ statusCode: 409, statusMessage: 'Selected staff member is not available at this time' })
    }
  }

  const startMs = startsAt.getTime()
  const endMs = startMs + service.durationMin * 60000
  const depositCents = depositCentsFor(service.priceAbCents, settings.depositPercent)
  const holdExpiresAt = new Date(now.getTime() + settings.holdTtlMin * 60000)
  const dayStartMs = wallToUtcMs(dayParts.year, dayParts.month, dayParts.day, 0, 0, tz)
  const dayEndMs = wallToUtcMs(dayParts.year, dayParts.month, dayParts.day, 23, 59, tz) + 59999

  // Refuse before creating a PENDING hold when no gateway can take the
  // deposit: otherwise the customer gets a reservation that can never be paid
  // and silently expires. Client-side gateway flags are not authoritative.
  const gateways = await getGatewayStatus()
  if (!gateways.stripe && !gateways.paypal) {
    console.warn('[bookings] deposit payment unavailable: no gateway enabled or configured')
    throw createError({ statusCode: 503, statusMessage: 'Online payment is currently unavailable' })
  }

  const created = await prisma.$transaction(async (tx) => {
    // Serialize creation per salon + salon-local calendar day: concurrent
    // requests for any overlapping slots on this day queue here, then re-check
    // overlaps below inside the same lock. One lock (not per staff) keeps
    // "any staff" checks across several staff members deadlock-free.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('salon'), hashtext(${dayStr}))`
    await tx.booking.updateMany({
      where: { paymentStatus: 'PENDING', holdExpiresAt: { lt: now } },
      data: { paymentStatus: 'EXPIRED' },
    })
    const dayRows = await loadDayBookings(startMs - 1440 * 60000, endMs, now.getTime(), tx)
    let assignedStaffId: string
    if (requestedStaffId) {
      if (isStaffBusy(requestedStaffId, service.id, startMs, endMs, dayRows)) {
        throw createError({ statusCode: 409, statusMessage: 'Slot just got booked' })
      }
      assignedStaffId = requestedStaffId
    }
    else {
      const picked = await pickStaffForSlot({
        serviceId: service.id,
        startMs,
        endMs,
        wallMin,
        durationMin: service.durationMin,
        weekday: dayWeekday,
        salon: { openMin: hours.openMin, closeMin: hours.closeMin, isClosed: hours.isClosed },
        dayRows,
        dayStartMs,
        dayEndMs,
        client: tx,
      })
      if (!picked) {
        throw createError({ statusCode: 409, statusMessage: 'Slot just got booked' })
      }
      assignedStaffId = picked.id
    }
    // bookingNumber retry on (unlikely) collision.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await tx.booking.create({
          data: {
            bookingNumber: newBookingNumber(),
            serviceId: service.id,
            customerName: body.customerName.trim(),
            customerPhone: body.customerPhone.trim(),
            customerEmail: body.customerEmail?.trim() || null,
            startsAt,
            durationMinSnapshot: service.durationMin,
            priceSnapshotCents: service.priceAbCents,
            depositCents,
            paymentProvider: '',
            paymentStatus: 'PENDING',
            providerRef: null,
            idempotencyKey: body.idempotencyKey || newIdempotencyKey(),
            status: 'UNASSIGNED',
            staffChoice,
            assignedStaffId,
            locale: body.locale || 'de',
            manageToken: newPublicToken(),
            whatsappReminder: Boolean(body.whatsappReminder),
            notes: body.note?.trim() || null,
            holdExpiresAt,
            publicToken: newPublicToken(),
            marketingConsent: Boolean(body.marketingConsent),
            fbp: body.marketingConsent && body.fbp ? body.fbp : null,
            fbc: body.marketingConsent && body.fbc ? body.fbc : null,
          },
        })
      }
      catch (e: any) {
        if (e?.code !== 'P2002' || attempt === 2) throw e
      }
    }
    throw createError({ statusCode: 500, statusMessage: 'Could not create booking' })
  })

  // NOTE: requires the 2c migration (Booking.publicToken) to be applied.
  await expireHolds(now).catch(() => null)
  return {
    token: (created as any).publicToken,
    bookingNumber: created.bookingNumber,
    startsAt: created.startsAt,
    depositCents: created.depositCents,
    currency: settings.currency,
    paymentStatus: created.paymentStatus,
    assignedStaffId: (created as any).assignedStaffId ?? null,
    staffChoice,
    gateways,
    created: true,
  }
})
