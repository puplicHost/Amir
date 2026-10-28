import { notifyAdmins } from './admin-notifications.ts'

export interface AbsenceResult {
  timeOffId: string
  unassignedCount: number
  nearestStartsAt: Date | null
}

// Record an absence and return the staff member's ASSIGNED bookings in the
// range to the UNASSIGNED queue in one transaction. The slot stays reserved
// for the customer until an admin reassigns, reschedules or cancels.
// Exactly ONE grouped admin notice is sent (never one per booking).
export async function recordAbsence(input: {
  staffId: string
  staffName: string
  from: Date
  to: Date
  reason: string | null
  createdBy: string
}): Promise<AbsenceResult> {
  const fromMs = input.from.getTime()
  const toMs = input.to.getTime()
  const result = await prisma.$transaction(async (tx) => {
    const timeOff = await tx.staffTimeOff.create({
      data: {
        staffId: input.staffId,
        startsAt: input.from,
        endsAt: input.to,
        reason: input.reason,
        createdBy: input.createdBy,
      },
    })
    const candidates = await tx.booking.findMany({
      where: {
        assignedStaffId: input.staffId,
        status: 'ASSIGNED',
        startsAt: { lt: input.to, gte: new Date(fromMs - 1440 * 60000) },
      },
      select: { id: true, bookingNumber: true, startsAt: true, durationMinSnapshot: true },
    })
    const affected = candidates.filter((b) => {
      const end = b.startsAt.getTime() + b.durationMinSnapshot * 60000
      return b.startsAt.getTime() < toMs && end > fromMs
    })
    for (const b of affected) {
      await tx.bookingAssignment.updateMany({
        where: { bookingId: b.id, staffId: input.staffId, unassignedAt: null },
        data: { unassignedAt: new Date(), reason: input.reason || 'Staff unavailable' },
      })
      await tx.booking.update({
        where: { id: b.id },
        data: { status: 'UNASSIGNED', assignedStaffId: null },
      })
    }
    return { timeOffId: timeOff.id, affected }
  })

  const nearest = result.affected
    .map(b => b.startsAt.getTime())
    .sort((a, b) => a - b)[0]
  const nearestStr = nearest
    ? new Date(nearest).toLocaleString('de-DE', {
      timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
    : '—'
  await notifyAdmins({
    type: 'booking_cancelled_by_staff',
    relatedEntityId: result.timeOffId,
    url: '/admin/appointments?tab=bookings&status=UNASSIGNED',
    titleEn: `${input.staffName} unavailable — ${result.affected.length} booking(s) need reassignment`,
    titleAr: `${input.staffName} nicht verfügbar — ${result.affected.length} Termin(e) neu zuweisen`,
    bodyEn: `Nearest: ${nearestStr}${input.reason ? ` · ${input.reason}` : ''}`,
    bodyAr: `Nächster: ${nearestStr}${input.reason ? ` · ${input.reason}` : ''}`,
  })
  return {
    timeOffId: result.timeOffId,
    unassignedCount: result.affected.length,
    nearestStartsAt: nearest ? new Date(nearest) : null,
  }
}
