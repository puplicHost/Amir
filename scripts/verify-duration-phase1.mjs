// Phase 1 regression suite: service durations, customer-facing duration UI,
// and same-staff overlap enforcement for admin assign/reschedule.
//
// Prerequisites: dev server running (`npm run dev`) and migrations applied.
// Run: node scripts/verify-duration-phase1.mjs
//
// Test data: DUR-TEST-* bookings and DUR-STAFF-* users only. Working hours are
// saved and restored. No customer data is touched.
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { overlaps, tzParts, wallToUtcMs } from '../server/utils/booking-slots.ts'
import { SERVICE_DURATION_SPEC, normalizeServiceName } from './service-duration-spec.mjs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const TZ = 'Europe/Berlin'
const PREFIX = 'DUR-TEST-'

function envVal(key, fallback) {
  const m = readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))
  return (m ? m[1].trim().replace(/^"|"$/g, '') : fallback)
}

function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  const prisma = new PrismaClient()
  let cookie = ''
  let savedHours = null
  let allPass = true
  let seq = 0
  const now = Date.now()

  const check = (name, cond) => {
    if (cond) console.log(`ok   ${name}`)
    else { console.log(`FAIL ${name}`); allPass = false }
  }
  const adminFetch = (url, opts = {}) => fetch(`${BASE}${url}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(opts.headers || {}) },
  })
  const text = async (url) => visibleText(await (await fetch(`${BASE}${url}`)).text())

  const bp = tzParts(now, TZ)
  const target = new Date(Date.UTC(bp.year, bp.month - 1, bp.day) + 3 * 86400000)
  const y = target.getUTCFullYear()
  const m = target.getUTCMonth() + 1
  const d = target.getUTCDate()
  const at = (h, min) => new Date(wallToUtcMs(y, m, d, h, min, TZ))

  async function wipeTestData() {
    await prisma.booking.deleteMany({ where: { customerName: { startsWith: PREFIX } } })
    await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'DUR-STAFF-' } } })
  }

  async function makeStaff(label) {
    const passHash = await bcrypt.hash('DUR-Staff-123!', 10)
    const user = await prisma.adminUser.create({
      data: {
        email: `DUR-STAFF-${label}@test.invalid`,
        name: `DUR Staff ${label}`,
        passwordHash: passHash,
        role: 'STAFF',
        isActive: true,
      },
    })
    return user
  }

  async function makeBooking(opts) {
    seq += 1
    const token = `${PREFIX}${now}-${seq}`
    return prisma.booking.create({
      data: {
        bookingNumber: `DUR-${now}-${seq}`,
        serviceId: opts.serviceId,
        customerName: opts.name,
        customerPhone: '+4915100000000',
        startsAt: opts.startsAt,
        durationMinSnapshot: opts.durationMin,
        priceSnapshotCents: opts.priceCents,
        depositCents: Math.round(opts.priceCents / 2),
        paymentProvider: 'stripe',
        paymentStatus: opts.paymentStatus || 'PAID',
        status: opts.status || 'UNASSIGNED',
        assignedStaffId: opts.staffId || null,
        holdExpiresAt: opts.holdExpiresAt || null,
        idempotencyKey: `idem-${token}`,
        publicToken: `pub-${token}`,
        manageToken: `man-${token}`,
      },
    })
  }

  try {
    await wipeTestData()

    // ── 1. DB durations match the owner-confirmed spec ──
    console.log('=== Service durations (database) ===')
    const services = await prisma.service.findMany()
    const byKey = new Map()
    for (const s of services) {
      const key = `${s.section}|${normalizeServiceName(s.name)}`
      byKey.set(key, [...(byKey.get(key) || []), s])
    }
    let specOk = services.length === SERVICE_DURATION_SPEC.length
    for (const spec of SERVICE_DURATION_SPEC) {
      const rows = byKey.get(`${spec.section}|${normalizeServiceName(spec.name)}`) || []
      const row = rows[0]
      if (rows.length !== 1 || !row || row.durationMin !== spec.durationMin || row.needsDurationReview !== false) {
        specOk = false
        console.log(`FAIL duration mapping: ${spec.section} / ${spec.name} (rows=${rows.length}, got=${row?.durationMin}, review=${row?.needsDurationReview})`)
      }
    }
    check(`all ${SERVICE_DURATION_SPEC.length} services have confirmed durations and cleared review flags`, specOk)

    // ── 2. Public API + service selection UI ──
    console.log('\n=== Public API and /services UI ===')
    const apiServices = await (await fetch(`${BASE}/api/services`)).json()
    const apiById = new Map(apiServices.map(s => [s.id, s]))
    check('public /api/services exposes every confirmed duration',
      services.every(s => apiById.get(s.id)?.durationMin === s.durationMin && apiById.get(s.id)?.needsDurationReview === false))

    const servicesHtml = await (await fetch(`${BASE}/services`)).text()
    const cardDurations = [...servicesHtml.matchAll(/tabular-nums">\d+\s*(?:Min\.|min)</g)]
    check(`/services renders a duration on all ${services.length} service cards`, cardDurations.length === services.length)

    const bookingPages = await Promise.all(apiServices.map(async (s) => {
      const body = await text(`/booking/${s.slug}`)
      return new RegExp(`·\\s*${s.durationMin}\\s*(?:Min\\.|min)`).test(body)
    }))
    check('every /booking/<service> page shows its authoritative duration', bookingPages.every(Boolean))

    // Confirmation/summary surfaces (SSR) for a real booking token.
    const uiService = services.find(s => s.durationMin === 30) || services[0]
    const uiBooking = await makeBooking({
      name: `${PREFIX}UI`, serviceId: uiService.id, startsAt: at(9, 0),
      durationMin: uiService.durationMin, priceCents: uiService.priceAbCents,
      paymentStatus: 'PENDING', holdExpiresAt: new Date(now + 10 * 60000),
    })
    const payText = await text(`/booking/pay/${uiBooking.publicToken}`)
    const manageText = await text(`/booking/manage/${uiBooking.manageToken}`)
    const durationRe = new RegExp(`${uiService.durationMin}\\s*(?:Min\\.|min)`)
    check('/booking/pay confirmation shows the duration', durationRe.test(payText))
    check('/booking/manage summary shows the booked duration', durationRe.test(manageText))

    // ── 3. Admin assign/reschedule must enforce same-staff overlaps ──
    console.log('\n=== Same-staff overlap enforcement ===')
    const login = await fetch(`${BASE}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: envVal('SEED_ADMIN_EMAIL', 'admin@amir.com'),
        password: envVal('SEED_ADMIN_PASSWORD', 'AmirAdmin123!'),
      }),
    })
    if (!login.ok) throw new Error(`admin login failed (${login.status})`)
    cookie = login.headers.get('set-cookie')?.split(';')[0] || ''

    const hoursRes = await adminFetch('/api/admin/working-hours')
    if (!hoursRes.ok) throw new Error(`working hours read failed (${hoursRes.status})`)
    savedHours = (await hoursRes.json()).days || []
    const opened = await adminFetch('/api/admin/working-hours', {
      method: 'PUT',
      body: JSON.stringify({
        days: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, openMin: 0, closeMin: 1440, isClosed: false })),
      }),
    })
    if (!opened.ok) throw new Error(`working hours setup failed (${opened.status})`)

    const service = services.find(s => s.durationMin === 30)
    if (!service) throw new Error('no 30-minute service found for overlap tests')
    const durationMin = service.durationMin
    const priceCents = service.priceAbCents
    const staffA = await makeStaff('A')
    const staffB = await makeStaff('B')
    const base = { serviceId: service.id, durationMin, priceCents }

    const assign = (bookingId, staffId) => adminFetch(`/api/admin/bookings/${bookingId}/assign`, {
      method: 'PUT', body: JSON.stringify({ staffId }),
    })
    const reschedule = (bookingId, startsAt, staffId) => adminFetch(`/api/admin/bookings/${bookingId}/reschedule`, {
      method: 'PUT', body: JSON.stringify({ startsAt: startsAt.toISOString(), ...(staffId ? { staffId } : {}) }),
    })

    // Assign overlap + half-open boundary.
    const anchor = await makeBooking({ ...base, name: `${PREFIX}A-anchor`, startsAt: at(10, 0), status: 'ASSIGNED', staffId: staffA.id })
    const clashAssign = await makeBooking({ ...base, name: `${PREFIX}A-clash`, startsAt: at(10, 15) })
    const r1 = await assign(clashAssign.id, staffA.id)
    check('assigning an overlapping slot to the same staff is rejected (409)', r1.status === 409)
    const clashAfter = await prisma.booking.findUnique({ where: { id: clashAssign.id } })
    check('rejected assignment leaves the booking unassigned', clashAfter.status === 'UNASSIGNED' && !clashAfter.assignedStaffId)
    const touchingAssign = await makeBooking({ ...base, name: `${PREFIX}A-touch`, startsAt: new Date(at(10, 0).getTime() + durationMin * 60000) })
    const r2 = await assign(touchingAssign.id, staffA.id)
    check('assigning the touching (half-open) slot succeeds', r2.status === 200)
    void anchor

    // Reschedule overlap, touching move, and cross-staff overlap.
    const resAnchor = await makeBooking({ ...base, name: `${PREFIX}R-anchor`, startsAt: at(12, 0), status: 'ASSIGNED', staffId: staffA.id })
    const movable = await makeBooking({ ...base, name: `${PREFIX}R-movable`, startsAt: at(11, 0), status: 'ASSIGNED', staffId: staffA.id })
    const r3 = await reschedule(movable.id, at(12, 15))
    check('rescheduling onto an overlapping slot for the same staff is rejected (409)', r3.status === 409)
    const unchanged = await prisma.booking.findUnique({ where: { id: movable.id } })
    check('rejected reschedule leaves the original time untouched', unchanged.startsAt.getTime() === at(11, 0).getTime())
    const r4 = await reschedule(movable.id, new Date(at(12, 0).getTime() - durationMin * 60000))
    check('rescheduling to the touching slot succeeds', r4.status === 200)
    const r5 = await reschedule(movable.id, at(12, 15), staffB.id)
    check('overlapping time on a different staff member is allowed', r5.status === 200)
    void resAnchor

    // Pending holds block; expired holds must not.
    await makeBooking({ ...base, name: `${PREFIX}P-live`, startsAt: at(14, 0), paymentStatus: 'PENDING', holdExpiresAt: new Date(now + 10 * 60000), staffId: staffA.id })
    const heldCandidate = await makeBooking({ ...base, name: `${PREFIX}P-candidate`, startsAt: at(14, 15) })
    const r6 = await assign(heldCandidate.id, staffA.id)
    check('an unexpired pending hold blocks the same staff slot (409)', r6.status === 409)

    await makeBooking({ ...base, name: `${PREFIX}P-expired`, startsAt: at(15, 0), paymentStatus: 'PENDING', holdExpiresAt: new Date(now - 10 * 60000), staffId: staffA.id })
    const freeCandidate = await makeBooking({ ...base, name: `${PREFIX}P-free`, startsAt: at(15, 15) })
    const r7 = await assign(freeCandidate.id, staffA.id)
    check('an expired pending hold does not block a legitimate assignment', r7.status === 200)

    // Concurrent assignment must serialize on the salon+day lock. Anchor
    // ends 17:30, candidates start on its boundary and overlap each other.
    await makeBooking({ ...base, name: `${PREFIX}C-anchor`, startsAt: at(17, 0), status: 'ASSIGNED', staffId: staffA.id })
    const c1 = await makeBooking({ ...base, name: `${PREFIX}C-one`, startsAt: new Date(at(17, 0).getTime() + durationMin * 60000) })
    const c2 = await makeBooking({ ...base, name: `${PREFIX}C-two`, startsAt: new Date(at(17, 0).getTime() + durationMin * 60000) })
    const [rc1, rc2] = await Promise.all([assign(c1.id, staffA.id), assign(c2.id, staffA.id)])
    const statuses = [rc1.status, rc2.status].sort()
    check('concurrent overlapping assignments: exactly one wins (200 + 409)',
      statuses[0] === 200 && statuses[1] === 409)

    // Global same-staff invariant over all active test bookings.
    const active = await prisma.booking.findMany({
      where: {
        customerName: { startsWith: PREFIX },
        status: { notIn: ['CANCELLED', 'CANCELLED_BY_STAFF'] },
        cancelledAt: null,
        OR: [{ paymentStatus: 'PAID' }, { paymentStatus: 'PENDING', holdExpiresAt: { gt: new Date() } }],
        assignedStaffId: { not: null },
      },
      select: { id: true, assignedStaffId: true, startsAt: true, durationMinSnapshot: true },
    })
    let staffOverlap = null
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i]
        const b = active[j]
        if (a.assignedStaffId !== b.assignedStaffId) continue
        const aStart = a.startsAt.getTime()
        const bStart = b.startsAt.getTime()
        if (overlaps(aStart, aStart + a.durationMinSnapshot * 60000, bStart, bStart + b.durationMinSnapshot * 60000)) {
          staffOverlap = [a.id, b.id]
        }
      }
    }
    check('no two active bookings overlap for the same staff member', !staffOverlap)
    if (staffOverlap) console.log(`FAIL overlapping booking ids: ${staffOverlap.join(', ')}`)

  }
  finally {
    try {
      await prisma.booking.deleteMany({ where: { customerName: { startsWith: PREFIX } } })
      await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'DUR-STAFF-' } } })
      if (savedHours && cookie) {
        await adminFetch('/api/admin/working-hours', {
          method: 'PUT',
          body: JSON.stringify({
            days: savedHours.map(x => ({ weekday: x.weekday, openMin: x.openMin, closeMin: x.closeMin, isClosed: x.isClosed })),
          }),
        })
        console.log('cleanup: working hours restored')
      }
      console.log('cleanup: DUR test bookings and staff removed')
    }
    catch (e) {
      console.log(`cleanup warning: ${e?.message || e}`)
    }
    await prisma.$disconnect()
    process.exitCode = allPass ? 0 : 1
  }
}

main().catch((e) => { console.error('FAIL', e?.stack || e); process.exitCode = 1 })
