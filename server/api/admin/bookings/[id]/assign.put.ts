import { requirePermission } from '../../../../utils/auth'
import { getBookingSettings } from '../../../../utils/booking-payments'
import { overlaps, tzDayStr } from '../../../../utils/booking-slots'
import { bookingAssignSchema, parseBody } from '../../../../utils/validate'
import { notifyUser } from '../../../../utils/admin-notifications'
import { isStaffOnTimeOff } from '../../../../utils/staff-availability'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'bookings.assign')

  const id = getRouterParam(event, 'id') || ''
  const body = await parseBody(event, bookingAssignSchema)

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) {
    throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  }

  if (booking.paymentStatus !== 'PAID') {
    throw createError({ statusCode: 400, statusMessage: 'Booking must be paid before assignment' })
  }

  if (booking.needsRefund) {
    throw createError({ statusCode: 400, statusMessage: 'Booking needs refund attention and cannot be assigned' })
  }

  const targetStaff = await prisma.adminUser.findUnique({
    where: { id: body.staffId },
    include: { staffServices: { select: { serviceId: true } } },
  })
  if (!targetStaff || !targetStaff.isActive || targetStaff.role !== 'STAFF') {
    throw createError({ statusCode: 400, statusMessage: 'Target staff member must be active and have role STAFF' })
  }

  const settings = await getBookingSettings()
  const dayStr = tzDayStr(booking.startsAt.getTime(), settings.timezone)
  const startMs = booking.startsAt.getTime()
  const endMs = startMs + booking.durationMinSnapshot * 60000

  // Roadmap Phase 6: no assignment to staff who cannot perform the service
  // or are on time-off (server-enforced). Off-schedule assignment stays
  // possible (overtime); availability already filters schedules for customers.
  if (targetStaff.staffServices.length > 0 && !targetStaff.staffServices.some(s => s.serviceId === booking.serviceId)) {
    throw createError({ statusCode: 409, statusMessage: 'Staff member does not offer this service' })
  }
  const previousStaffId = booking.assignedStaffId
  const isReassign = Boolean(previousStaffId && previousStaffId !== body.staffId)

  await prisma.$transaction(async (tx) => {
    // 1. Advisory transaction lock on salon + salon-local calendar day
    // (Roadmap Phase 4: same lock as booking creation/confirmation, so
    // assignment and "any staff" auto-pick serialize on one lock).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('salon'), hashtext(${dayStr}))`

    if (await isStaffOnTimeOff(targetStaff.id, startMs, endMs, tx)) {
      throw createError({ statusCode: 409, statusMessage: 'Staff member is on time-off at this time' })
    }

    // 2. Re-check overlap against every blocking booking for the target
    // staff: paid/assigned bookings and unexpired payment holds. Expired
    // PENDING holds must not block a legitimate assignment.
    const now = new Date()
    const clashing = await tx.booking.findMany({
      where: {
        assignedStaffId: body.staffId,
        status: { notIn: ['CANCELLED', 'CANCELLED_BY_STAFF'] },
        cancelledAt: null,
        id: { not: booking.id },
        startsAt: { lt: new Date(endMs), gte: new Date(startMs - 1440 * 60000) },
        OR: [
          { paymentStatus: 'PAID' },
          { paymentStatus: 'PENDING', holdExpiresAt: { gt: now } },
        ],
      },
      select: { startsAt: true, durationMinSnapshot: true },
    })

    const hasClash = clashing.some((b) => {
      const bEnd = b.startsAt.getTime() + b.durationMinSnapshot * 60000
      return overlaps(startMs, endMs, b.startsAt.getTime(), bEnd)
    })
    if (hasClash) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Staff member already has an overlapping assigned booking',
      })
    }

    // 3. Update previous assignment history row if reassigning.
    if (isReassign && previousStaffId) {
      await tx.bookingAssignment.updateMany({
        where: { bookingId: booking.id, staffId: previousStaffId, unassignedAt: null },
        data: { unassignedAt: new Date(), reason: 'Reassigned by admin' },
      })
    }

    // 4. Create new history row.
    await tx.bookingAssignment.create({
      data: {
        bookingId: booking.id,
        staffId: body.staffId,
        assignedById: user.userId,
        assignedAt: new Date(),
      },
    })

    // 5. Update booking status & assignee.
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'ASSIGNED',
        assignedStaffId: body.staffId,
      },
    })
  })

  // Notifications (sanitized: booking number, service, date/time, deep link - no customer PII)
  const dtBerlin = new Date(booking.startsAt).toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const service = await prisma.service.findUnique({ where: { id: booking.serviceId }, select: { name: true } })
  const serviceName = service?.name || 'Service'

  await notifyUser(body.staffId, {
    type: 'booking_assigned',
    relatedEntityId: booking.id,
    url: '/admin/appointments?tab=my-bookings',
    titleEn: `New booking assigned (${booking.bookingNumber})`,
    titleAr: `Neuer Termin zugewiesen (${booking.bookingNumber})`,
    bodyEn: `${serviceName} · ${dtBerlin}`,
    bodyAr: `${serviceName} · ${dtBerlin}`,
  })

  if (isReassign && previousStaffId) {
    await notifyUser(previousStaffId, {
      type: 'booking_reassigned',
      relatedEntityId: booking.id,
      url: '/admin/appointments?tab=my-bookings',
      titleEn: `Booking reassigned (${booking.bookingNumber})`,
      titleAr: `Termin neu zugewiesen (${booking.bookingNumber})`,
      bodyEn: `${serviceName} · ${dtBerlin}`,
      bodyAr: `${serviceName} · ${dtBerlin}`,
    })
  }

  // Audit log
  await logAudit({
    entityType: 'booking',
    entityId: booking.id,
    entityName: booking.bookingNumber,
    action: 'updated',
    details: isReassign
      ? `Reassigned to staff ${targetStaff.name}`
      : `Assigned to staff ${targetStaff.name}`,
    user,
  })

  // Roadmap Phase 7: customer change mail (skipped without email).
  const { queueBookingMail } = await import('../../../../utils/outbox')
  await queueBookingMail(booking.id, 'booking_changed')

  return { success: true }
})
