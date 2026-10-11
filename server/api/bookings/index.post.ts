import {
  daysFromToday,
  isOnSlotStep,
  overlaps,
  parseDayStr,
  tzDayStr,
  tzParts,
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
import { bookingCreateSchema, parseBody } from '../../utils/validate'
import { BOOKING_HORIZON_DAYS_DEFAULT } from '../../../shared/booking'

// Guest booking creation. Amounts/currency/snapshots are computed server-side
// from the service row — nothing price-related is trusted from the client.
// Overlap is re-checked inside the transaction so two customers cannot take
// the same slot. Payment happens in a second step (POST …/pay).
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
  const dayStr = tzDayStr(startsAt.getTime(), tz)
  if (!parseDayStr(dayStr)) throw createError({ statusCode: 400, statusMessage: 'Invalid date' })
  const ahead = daysFromToday(dayStr, tzDayStr(now.getTime(), tz))
  if (ahead < 0 || ahead > BOOKING_HORIZON_DAYS_DEFAULT) {
    throw createError({ statusCode: 400, statusMessage: 'Date is outside the booking horizon' })
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

  const startMs = startsAt.getTime()
  const endMs = startMs + service.durationMin * 60000
  const depositCents = depositCentsFor(service.priceAbCents, settings.depositPercent)
  const holdExpiresAt = new Date(now.getTime() + settings.holdTtlMin * 60000)

  const created = await prisma.$transaction(async (tx) => {
    // Serialize creation per service + salon-local calendar day: concurrent
    // requests for any overlapping slots on this day queue here, then re-check
    // overlaps below inside the same lock.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${service.id}), hashtext(${dayStr}))`
    await tx.booking.updateMany({
      where: { paymentStatus: 'PENDING', holdExpiresAt: { lt: now } },
      data: { paymentStatus: 'EXPIRED' },
    })
    const candidates = await tx.booking.findMany({
      where: {
        serviceId: service.id,
        startsAt: { lt: new Date(endMs), gte: new Date(startMs - 1440 * 60000) },
        OR: [
          { paymentStatus: 'PAID' },
          { paymentStatus: 'PENDING', holdExpiresAt: { gt: now } },
        ],
      },
      select: { startsAt: true, durationMinSnapshot: true },
    })
    const isClash = candidates.some((c) => {
      const cEnd = c.startsAt.getTime() + c.durationMinSnapshot * 60000
      return overlaps(startMs, endMs, c.startsAt.getTime(), cEnd)
    })
    if (isClash) {
      throw createError({ statusCode: 409, statusMessage: 'Slot just got booked' })
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
  const gateways = await getGatewayStatus()
  return {
    token: (created as any).publicToken,
    bookingNumber: created.bookingNumber,
    startsAt: created.startsAt,
    depositCents: created.depositCents,
    currency: settings.currency,
    paymentStatus: created.paymentStatus,
    gateways,
    created: true,
  }
})
