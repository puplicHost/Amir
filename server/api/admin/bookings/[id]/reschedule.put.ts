import { requirePermission } from '../../../../utils/auth'
import { isOnSlotStep, overlaps, parseDayStr, tzDayStr, tzParts } from '../../../../utils/booking-slots'
import { getBookingSettings } from '../../../../utils/booking-payments'
import { bookingRescheduleSchema, parseBody } from '../../../../utils/validate'
import { notifyUser } from '../../../../utils/admin-notifications'
import { isStaffOnTimeOff } from '../../../../utils/staff-availability'
import { logAudit } from '../../../../utils/audit'

// Move a booking to another slot (and optionally another staff member).
// Roadmap Phase 5: same availability rules, same salon+day lock.
// Cancellation stays in Phase 8 — this endpoint never cancels or refunds.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'bookings.assign')
  const id = getRouterParam(event, 'id') || ''
  const body = await parseBody(event, bookingRescheduleSchema)

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED_BY_STAFF' || (booking as any).cancelledAt) {
    throw createError({ statusCode: 400, statusMessage: 'Booking is closed and cannot be moved' })
  }
  if (booking.needsRefund) {
    throw createError({ statusCode: 400, statusMessage: 'Booking needs refund attention and cannot be moved' })
  }

  const settings = await getBookingSettings()
  const tz = settings.timezone
  const startsAt = new Date(body.startsAt)
  if (!Number.isFinite(startsAt.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid startsAt' })
  }
  const now = new Date()
  if (startsAt.getTime() <= now.getTime()) {
    throw createError({ statusCode: 400, statusMessage: 'Slot must be in the future' })
  }
  const dayStr = tzDayStr(startsAt.getTime(), tz)
  if (!parseDayStr(dayStr)) throw createError({ statusCode: 400, statusMessage: 'Invalid date' })
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
  if (wallMin < hours.openMin || wallMin + booking.durationMinSnapshot > hours.closeMin) {
    throw createError({ statusCode: 409, statusMessage: 'Slot is outside working hours' })
  }

  const targetStaffId = body.staffId || booking.assignedStaffId
  if (!targetStaffId) {
    throw createError({ statusCode: 400, statusMessage: 'Booking has no staff member to move with' })
  }
  const target = await prisma.adminUser.findUnique({
    where: { id: targetStaffId },
    include: { staffProfile: true, staffServices: { select: { serviceId: true } } },
  })
  if (!target || !target.isActive || target.role !== 'STAFF') {
    throw createError({ statusCode: 400, statusMessage: 'Target staff member is not available' })
  }
  if (target.staffServices.length > 0 && !target.staffServices.some(s => s.serviceId === booking.serviceId)) {
    throw createError({ statusCode: 400, statusMessage: 'Target staff member does not offer this service' })
  }

  const startMs = startsAt.getTime()
  const endMs = startMs + booking.durationMinSnapshot * 60000
  const previousStaffId = booking.assignedStaffId
  const staffChanged = previousStaffId !== targetStaffId

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('salon'), hashtext(${dayStr}))`
    const blockers = await tx.booking.findMany({
      where: {
        id: { not: booking.id },
        status: { notIn: ['CANCELLED', 'CANCELLED_BY_STAFF'] },
        cancelledAt: null,
        startsAt: { lt: new Date(endMs), gte: new Date(startMs - 1440 * 60000) },
        OR: [
          { assignedStaffId: targetStaffId, paymentStatus: 'PAID' },
          { assignedStaffId: targetStaffId, paymentStatus: 'PENDING', holdExpiresAt: { gt: now } },
          { assignedStaffId: null, serviceId: booking.serviceId, paymentStatus: 'PAID' },
          { assignedStaffId: null, serviceId: booking.serviceId, paymentStatus: 'PENDING', holdExpiresAt: { gt: now } },
        ],
      },
      select: { startsAt: true, durationMinSnapshot: true },
    })
    const clash = blockers.some((c) => {
      const cEnd = c.startsAt.getTime() + c.durationMinSnapshot * 60000
      return overlaps(startMs, endMs, c.startsAt.getTime(), cEnd)
    })
    if (clash) {
      throw createError({ statusCode: 409, statusMessage: 'Target slot is already taken' })
    }
    if (await isStaffOnTimeOff(targetStaffId, startMs, endMs, tx)) {
      throw createError({ statusCode: 409, statusMessage: 'Staff member is on time-off at this time' })
    }
    if (staffChanged && previousStaffId) {
      await tx.bookingAssignment.updateMany({
        where: { bookingId: booking.id, staffId: previousStaffId, unassignedAt: null },
        data: { unassignedAt: new Date(), reason: 'Rescheduled to another staff member' },
      })
    }
    if (staffChanged) {
      await tx.bookingAssignment.create({
        data: { bookingId: booking.id, staffId: targetStaffId, assignedById: user.userId, assignedAt: new Date() },
      })
    }
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        startsAt,
        // Lifecycle guard: only PAID bookings may become ASSIGNED; unpaid
        // holds keep their staff reservation while UNASSIGNED.
        ...(staffChanged && booking.paymentStatus === 'PAID'
          ? { assignedStaffId: targetStaffId, status: 'ASSIGNED' }
          : staffChanged
            ? { assignedStaffId: targetStaffId }
            : {}),
      },
    })
  })

  const service = await prisma.service.findUnique({ where: { id: booking.serviceId }, select: { name: true } })
  const dtBerlin = startsAt.toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  if (staffChanged) {
    await notifyUser(targetStaffId, {
      type: 'booking_assigned',
      relatedEntityId: booking.id,
      url: '/admin/appointments?tab=my-bookings',
      titleEn: `Booking moved to you (${booking.bookingNumber})`,
      titleAr: `Termin zu Ihnen verschoben (${booking.bookingNumber})`,
      bodyEn: `${service?.name || 'Service'} · ${dtBerlin}`,
      bodyAr: `${service?.name || 'Service'} · ${dtBerlin}`,
    })
    if (previousStaffId) {
      await notifyUser(previousStaffId, {
        type: 'booking_reassigned',
        relatedEntityId: booking.id,
        url: '/admin/appointments?tab=my-bookings',
        titleEn: `Booking moved away (${booking.bookingNumber})`,
        titleAr: `Termin verschoben (${booking.bookingNumber})`,
        bodyEn: `${service?.name || 'Service'} · ${dtBerlin}`,
        bodyAr: `${service?.name || 'Service'} · ${dtBerlin}`,
      })
    }
  }
  await logAudit({
    entityType: 'booking',
    entityId: booking.id,
    entityName: booking.bookingNumber,
    action: 'updated',
    details: staffChanged
      ? `Rescheduled to ${dtBerlin} with ${target.name}`
      : `Rescheduled to ${dtBerlin}`,
    user,
  })
  // Roadmap Phase 7: customer change mail (skipped without email).
  const { queueBookingMail } = await import('../../../../utils/outbox')
  await queueBookingMail(booking.id, 'booking_changed')
  return { success: true, startsAt }
})
