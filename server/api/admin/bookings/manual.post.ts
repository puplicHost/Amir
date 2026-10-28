import { requirePermission } from '../../../utils/auth'
import {
  daysFromToday,
  isOnSlotStep,
  parseDayStr,
  tzDayStr,
  tzParts,
  wallToUtcMs,
} from '../../../utils/booking-slots'
import { depositCentsFor, BOOKING_HORIZON_DAYS_DEFAULT } from '../../../../shared/booking'
import {
  expireHolds,
  getBookingSettings,
  newBookingNumber,
  newIdempotencyKey,
  newPublicToken,
} from '../../../utils/booking-payments'
import {
  isSalonClosedOnDay,
  isStaffBusy,
  isStaffOnTimeOff,
  loadDayBookings,
  pickStaffForSlot,
  slotFitsHours,
  staffScheduleForDay,
} from '../../../utils/staff-availability'
import { manualBookingSchema, parseBody } from '../../../utils/validate'
import { notifyAdmins, notifyUser } from '../../../utils/admin-notifications'
import { logAudit } from '../../../utils/audit'

// Manual booking (Roadmap Phase 5): walk-in / WhatsApp / phone customers.
// Same availability rules and the same salon+day lock as online booking —
// no side path around double-booking protection.
// paymentMode: paid_in_salon (cash/card, confirmed + assigned immediately),
// pending (hold with manual TTL), pay_link (hold + public pay URL for WhatsApp).
export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'bookings.assign')
  const body = await parseBody(event, manualBookingSchema)
  const settings = await getBookingSettings()
  const tz = settings.timezone

  const service = await prisma.service.findFirst({ where: { id: body.serviceId, isActive: true } })
  if (!service) throw createError({ statusCode: 404, statusMessage: 'Service not found' })

  const startsAt = new Date(body.startsAt)
  if (!Number.isFinite(startsAt.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid startsAt' })
  }
  const now = new Date()
  if (startsAt.getTime() <= now.getTime()) {
    throw createError({ statusCode: 400, statusMessage: 'Slot must be in the future' })
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

  const requestedStaffId = body.staffId || null
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
  const paidNow = body.paymentMode === 'paid_in_salon'
  const holdTtlMin = (settings as any).manualHoldTtlMin ?? 1440
  const holdExpiresAt = paidNow ? null : new Date(now.getTime() + holdTtlMin * 60000)
  const dayStartMs = wallToUtcMs(dayParts.year, dayParts.month, dayParts.day, 0, 0, tz)
  const dayEndMs = wallToUtcMs(dayParts.year, dayParts.month, dayParts.day, 23, 59, tz) + 59999

  const created = await prisma.$transaction(async (tx) => {
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
      if (!picked) throw createError({ statusCode: 409, statusMessage: 'Slot just got booked' })
      assignedStaffId = picked.id
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const booking = await tx.booking.create({
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
            paymentProvider: paidNow ? 'manual' : '',
            paymentStatus: paidNow ? 'PAID' : 'PENDING',
            providerRef: null,
            idempotencyKey: newIdempotencyKey(),
            status: paidNow ? 'ASSIGNED' : 'UNASSIGNED',
            staffChoice,
            source: body.source,
            locale: 'de',
            manageToken: newPublicToken(),
            assignedStaffId,
            notes: [
              body.note?.trim() || null,
              paidNow && body.paymentMethod ? `Paid in salon (${body.paymentMethod})` : null,
            ].filter(Boolean).join(' · ') || null,
            holdExpiresAt,
            publicToken: newPublicToken(),
            marketingConsent: false,
          },
        })
        if (paidNow) {
          await tx.bookingAssignment.create({
            data: {
              bookingId: booking.id,
              staffId: assignedStaffId,
              assignedById: actor.userId,
              assignedAt: new Date(),
            },
          })
        }
        return booking
      }
      catch (e: any) {
        if (e?.code !== 'P2002' || attempt === 2) throw e
      }
    }
    throw createError({ statusCode: 500, statusMessage: 'Could not create booking' })
  })

  const dtBerlin = startsAt.toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  const staffUser = await prisma.adminUser.findUnique({
    where: { id: (created as any).assignedStaffId },
    select: { id: true, name: true },
  })
  await notifyUser((created as any).assignedStaffId, {
    type: 'booking_assigned',
    relatedEntityId: created.id,
    url: '/admin/appointments?tab=my-bookings',
    titleEn: `New booking assigned (${created.bookingNumber})`,
    titleAr: `Neuer Termin zugewiesen (${created.bookingNumber})`,
    bodyEn: `${service.name} · ${dtBerlin}`,
    bodyAr: `${service.name} · ${dtBerlin}`,
  })
  await notifyAdmins({
    type: 'new_booking',
    relatedEntityId: created.id,
    url: `/admin/bookings/${created.id}`,
    titleEn: `Manual booking (${created.bookingNumber})`,
    titleAr: `Manuelle Buchung (${created.bookingNumber})`,
    bodyEn: `${service.name} · ${dtBerlin} · ${body.source}`,
    bodyAr: `${service.name} · ${dtBerlin} · ${body.source}`,
  })
  await logAudit({
    entityType: 'booking',
    entityId: created.id,
    entityName: created.bookingNumber,
    action: 'created',
    details: `Manual booking (${body.source}, ${body.paymentMode}) for ${staffUser?.name || 'staff'}`,
    user: actor,
  })

  return {
    booking: {
      id: created.id,
      bookingNumber: created.bookingNumber,
      startsAt: created.startsAt,
      depositCents: created.depositCents,
      paymentStatus: created.paymentStatus,
      status: (created as any).status,
      assignedStaffId: (created as any).assignedStaffId,
      assignedStaffName: staffUser?.name ?? null,
      publicToken: (created as any).publicToken,
    },
    payUrl: body.paymentMode === 'pay_link' ? `/booking/pay/${(created as any).publicToken}` : null,
  }
})
