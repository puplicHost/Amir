// Staff availability core (Roadmap Phase 4).
// Per-staff availability: a slot is free for a staff member when it fits
// their day schedule (own row or inherited salon hours), does not overlap
// a time-off, and does not overlap a PAID booking or unexpired PENDING hold
// assigned to them. Legacy bookings without staff (assignedStaffId = null,
// created before staff selection) block every staff member for the same
// service so old guarantees survive the transition.
// All timestamps stored/compared as UTC milliseconds; wall-clock fit is
// checked by callers via tzParts (Europe/Berlin at the edges).

import { overlaps } from './booking-slots.ts'

export interface StaffOption {
  id: string
  displayName: string
  imagePath: string | null
  sortOrder: number
}

export interface DayHours {
  openMin: number
  closeMin: number
  isClosed: boolean
}

export interface DayBookingRow {
  assignedStaffId: string | null
  serviceId: string
  start: number
  end: number
}

type DbClient = {
  adminUser: any
  staffSchedule: any
  staffTimeOff: any
  staffService: any
  salonClosure: any
  booking: any
}

function db(c?: unknown): DbClient {
  return (c ?? (globalThis as any).prisma ?? (prisma as unknown)) as DbClient
}

/** Bookable staff for a service. Empty StaffService rows = all services. */
export async function getBookableStaff(serviceId?: string, client?: unknown): Promise<StaffOption[]> {
  const c = db(client)
  const users = await c.adminUser.findMany({
    where: { role: 'STAFF', isActive: true },
    select: {
      id: true,
      name: true,
      staffProfile: { select: { displayName: true, imagePath: true, isBookable: true, sortOrder: true } },
      staffServices: { select: { serviceId: true } },
    },
    orderBy: { name: 'asc' },
  })
  const out: StaffOption[] = []
  for (const u of users) {
    if (u.staffProfile && u.staffProfile.isBookable === false) continue
    if (serviceId && u.staffServices.length > 0 && !u.staffServices.some((s: any) => s.serviceId === serviceId)) continue
    out.push({
      id: u.id,
      displayName: u.staffProfile?.displayName || u.name,
      imagePath: u.staffProfile?.imagePath ?? null,
      sortOrder: u.staffProfile?.sortOrder ?? 1000,
    })
  }
  out.sort((a, b) => a.sortOrder - b.sortOrder)
  return out
}

/** True when the staff member may perform the service (default all). */
export async function staffCanDoService(staffId: string, serviceId: string, client?: unknown): Promise<boolean> {
  const c = db(client)
  const rows = await c.staffService.findMany({ where: { staffId }, select: { serviceId: true } })
  if (rows.length === 0) return true
  return rows.some((r: any) => r.serviceId === serviceId)
}

/** Staff day schedule, falling back to inherited salon hours. */
export async function staffScheduleForDay(staffId: string, weekday: number, salon: DayHours, client?: unknown): Promise<DayHours> {
  const c = db(client)
  const row = await c.staffSchedule.findUnique({ where: { staffId_weekday: { staffId, weekday } } })
  if (!row) return salon
  return { openMin: row.openMin, closeMin: row.closeMin, isClosed: row.isClosed }
}

/** Pure: slot wall time fits inside day hours. */
export function slotFitsHours(wallMin: number, durationMin: number, hours: DayHours): boolean {
  if (hours.isClosed) return false
  return wallMin >= hours.openMin && wallMin + durationMin <= hours.closeMin
}

/** True when the salon declared a closure for a Berlin day (YYYY-MM-DD). */
export async function isSalonClosedOnDay(dayStr: string, client?: unknown): Promise<boolean> {
  const c = db(client)
  const closure = await c.salonClosure.findUnique({ where: { day: dayStr }, select: { id: true } })
  return Boolean(closure)
}

/** True when any time-off of the staff overlaps [startMs, endMs). */
export async function isStaffOnTimeOff(staffId: string, startMs: number, endMs: number, client?: unknown): Promise<boolean> {
  const c = db(client)
  const hit = await c.staffTimeOff.findFirst({
    where: {
      staffId,
      startsAt: { lt: new Date(endMs) },
      endsAt: { gt: new Date(startMs) },
    },
    select: { id: true },
  })
  return Boolean(hit)
}

/** All blocking bookings overlapping the wider day window (one query). */
export async function loadDayBookings(windowStartMs: number, windowEndMs: number, nowMs: number, client?: unknown): Promise<DayBookingRow[]> {
  const c = db(client)
  const rows = await c.booking.findMany({
    where: {
      startsAt: { gte: new Date(windowStartMs), lte: new Date(windowEndMs) },
      status: { not: 'CANCELLED' },
      OR: [
        { paymentStatus: 'PAID' },
        { paymentStatus: 'PENDING', holdExpiresAt: { gt: new Date(nowMs) } },
      ],
    },
    select: { assignedStaffId: true, serviceId: true, startsAt: true, durationMinSnapshot: true },
  })
  return rows.map((b: any) => ({
    assignedStaffId: b.assignedStaffId ?? null,
    serviceId: b.serviceId,
    start: b.startsAt.getTime(),
    end: b.startsAt.getTime() + b.durationMinSnapshot * 60000,
  }))
}

/** Busy check for one staff member against preloaded day rows. */
export function isStaffBusy(
  staffId: string,
  serviceId: string,
  startMs: number,
  endMs: number,
  dayRows: DayBookingRow[],
): boolean {
  return dayRows.some(r =>
    overlaps(startMs, endMs, r.start, r.end)
    && (r.assignedStaffId === staffId || (r.assignedStaffId === null && r.serviceId === serviceId)),
  )
}

/**
 * Pick an available staff member inside the caller-held lock.
 * Order: fewest bookings that Berlin day first, then profile sortOrder.
 * Returns null when nobody is free.
 */
export async function pickStaffForSlot(input: {
  serviceId: string
  startMs: number
  endMs: number
  wallMin: number
  durationMin: number
  weekday: number
  salon: DayHours
  dayRows: DayBookingRow[]
  dayStartMs: number
  dayEndMs: number
  client?: unknown
}): Promise<StaffOption | null> {
  const eligible = await getBookableStaff(input.serviceId, input.client)
  if (!eligible.length) return null
  const c = db(input.client)
  const [schedules, timeOffs] = await Promise.all([
    c.staffSchedule.findMany({
      where: { staffId: { in: eligible.map(s => s.id) }, weekday: input.weekday },
    }),
    c.staffTimeOff.findMany({
      where: {
        staffId: { in: eligible.map(s => s.id) },
        startsAt: { lt: new Date(input.endMs) },
        endsAt: { gt: new Date(input.startMs) },
      },
      select: { staffId: true },
    }),
  ])
  const off = new Set((timeOffs as any[]).map(t => t.staffId))
  const schedByStaff = new Map((schedules as any[]).map(s => [s.staffId, s]))
  const dayCounts = new Map<string, number>()
  for (const s of eligible) dayCounts.set(s.id, 0)
  for (const r of input.dayRows) {
    if (!r.assignedStaffId) continue
    if (r.start < input.dayEndMs && r.end > input.dayStartMs) {
      dayCounts.set(r.assignedStaffId, (dayCounts.get(r.assignedStaffId) ?? 0) + 1)
    }
  }
  const free = eligible.filter((s) => {
    if (off.has(s.id)) return false
    const row = schedByStaff.get(s.id)
    const hours: DayHours = row
      ? { openMin: row.openMin, closeMin: row.closeMin, isClosed: row.isClosed }
      : input.salon
    if (!slotFitsHours(input.wallMin, input.durationMin, hours)) return false
    return !isStaffBusy(s.id, input.serviceId, input.startMs, input.endMs, input.dayRows)
  })
  free.sort((a, b) => (dayCounts.get(a.id) ?? 0) - (dayCounts.get(b.id) ?? 0) || a.sortOrder - b.sortOrder)
  return free[0] ?? null
}
