// Staff-scoped concurrency race tests (Roadmap Phase 4, salon+day lock):
// Scenario 1: N parallel requests, SAME staff + SAME slot -> exactly 1 succeeds.
// Scenario 2: N parallel requests, ANY staff + SAME slot -> one booking per
//             bookable staff member, all on distinct staff.
// Scenario 3: 2 parallel requests, DIFFERENT staff + SAME slot -> both succeed.
// Scenario 4: Half-open per staff: touching slot succeeds, overlapping fails.
// Scenario 5: Booked slots reveal no customer data via public availability.
// Scenario 6: Staff on time-off is excluded from ANY picks; specific fails.
// Scenario 7: N parallel requests for OVERLAPPING DIFFERENT start times ->
//             no two bookings OF THE SAME STAFF overlap.
//
// Prerequisites: dev server running (`npm run dev`), migrations applied.
// Run: node scripts/verify-race.mjs
//
// Test data: clearly-marked RACE-TEST-* bookings, RACE-STAFF-* users and
// RACE time-offs. Restores previous hours and deletes test data on cleanup.
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { wallToUtcMs, tzParts, overlaps } from '../server/utils/booking-slots.ts'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const N = 8
const PHONE = '+491511234567'

function envVal(key, fallback) {
  const m = readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))
  return (m ? m[1].trim().replace(/^"|"$/g, '') : fallback)
}

async function main() {
  const prisma = new PrismaClient()
  let cookie = ''
  let savedHours = null
  let allPass = true
  let staffA = null
  let staffB = null
  let service = null

  const check = (name, cond) => {
    if (cond) { console.log(`ok   ${name}`) }
    else { console.log(`FAIL ${name}`); allPass = false }
  }
  const postBooking = (customerName, startsAt, staffId) =>
    fetch(`${BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceSlug: service.slug,
        customerName,
        customerPhone: PHONE,
        startsAt,
        ...(staffId ? { staffId } : {}),
      }),
    }).then(async r => ({ ok: r.ok, status: r.status, json: r.ok ? await r.json() : null }))
      .catch(e => ({ ok: false, status: String(e), json: null }))
  const cleanBookings = (prefix) =>
    prisma.booking.deleteMany({ where: { customerName: { startsWith: prefix } } })

  try {
    // 1. Admin login (for working-hours setup/teardown only).
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
    const adminFetch = (url, opts = {}) => fetch(`${BASE}${url}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(opts.headers || {}) },
    })

    // 2. Save current hours, then open the whole week 00:00-24:00.
    const cur = await (await adminFetch('/api/admin/working-hours')).json()
    savedHours = cur.days || []
    const open = await adminFetch('/api/admin/working-hours', {
      method: 'PUT',
      body: JSON.stringify({
        days: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, openMin: 0, closeMin: 1440, isClosed: false })),
      }),
    })
    if (!open.ok) throw new Error(`hours setup failed (${open.status})`)

    // 3. Service under test (duration drives half-open checks).
    const services = await (await fetch(`${BASE}/api/services`)).json()
    const slug = services[0]?.slug
    if (!slug) throw new Error('no active services to book')
    service = await (await fetch(`${BASE}/api/services/${slug}`)).json()
    const durationMin = service.durationMin || 30
    console.log(`service: ${slug} (${durationMin} min)`)

    // 4. Two bookable race staff (no profile/service rows = bookable, all services).
    await cleanBookings('RACE-TEST-')
    await prisma.staffTimeOff.deleteMany({ where: { staff: { email: { startsWith: 'RACE-STAFF-' } } } })
    await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'RACE-STAFF-' } } })
    const passHash = await bcrypt.hash('RACE-Staff-123!', 10)
    staffA = await prisma.adminUser.create({
      data: { email: 'RACE-STAFF-A@test.invalid', name: 'Race Staff A', passwordHash: passHash, role: 'STAFF', isActive: true },
    })
    staffB = await prisma.adminUser.create({
      data: { email: 'RACE-STAFF-B@test.invalid', name: 'Race Staff B', passwordHash: passHash, role: 'STAFF', isActive: true },
    })
    const eligible = await (await fetch(`${BASE}/api/staff?service=${slug}`)).json()
    const eligibleIds = new Set((eligible.staff || []).map(s => s.id))
    check('race staff A+B are bookable for the service',
      eligibleIds.has(staffA.id) && eligibleIds.has(staffB.id))
    const eligibleCount = (eligible.staff || []).length
    console.log(`bookable staff for service: ${eligibleCount}`)

    const now = Date.now()
    const bp = tzParts(now, 'Europe/Berlin')
    const target = new Date(Date.UTC(bp.year, bp.month - 1, bp.day) + 2 * 86400000)
    const y = target.getUTCFullYear()
    const m = target.getUTCMonth() + 1
    const d = target.getUTCDate()
    const iso = (h, min) => new Date(wallToUtcMs(y, m, d, h, min, 'Europe/Berlin')).toISOString()

    // ── SCENARIO 1: same staff + same slot -> exactly 1 ──
    console.log('\n=== Scenario 1: Same staff + same slot race ===')
    const res1 = await Promise.all(Array.from({ length: N }, (_, i) =>
      postBooking(`RACE-TEST-S1-${i}`, iso(10, 0), staffA.id),
    ))
    const ok1 = res1.filter(r => r.ok)
    console.log(`scenario 1: ${ok1.length} ok, codes=[${res1.map(r => r.status).join(',')}]`)
    check('scenario 1: exactly one booking won the staff slot',
      ok1.length === 1 && ok1[0].json?.assignedStaffId === staffA.id)
    await cleanBookings('RACE-TEST-S1-')

    // ── SCENARIO 2: ANY staff + same slot -> one per bookable staff ──
    console.log('\n=== Scenario 2: ANY staff + same slot race ===')
    const res2 = await Promise.all(Array.from({ length: N }, (_, i) =>
      postBooking(`RACE-TEST-S2-${i}`, iso(11, 0)),
    ))
    const ok2 = res2.filter(r => r.ok)
    const winners2 = [...new Set(ok2.map(r => r.json?.assignedStaffId))]
    console.log(`scenario 2: ${ok2.length} ok on [${winners2.join(',')}] (eligible: ${eligibleCount})`)
    check('scenario 2: one booking per staff, distinct staff, race staff included',
      ok2.length >= 2 && winners2.length === ok2.length
      && winners2.includes(staffA.id) && winners2.includes(staffB.id)
      && ok2.length <= eligibleCount)
    await cleanBookings('RACE-TEST-S2-')

    // ── SCENARIO 3: different staff + same slot -> both succeed ──
    console.log('\n=== Scenario 3: Different staff + same slot ===')
    const res3 = await Promise.all([
      postBooking('RACE-TEST-S3-A', iso(12, 0), staffA.id),
      postBooking('RACE-TEST-S3-B', iso(12, 0), staffB.id),
    ])
    check('scenario 3: both staff booked the same slot',
      res3.every(r => r.ok) && res3[0].json?.assignedStaffId === staffA.id && res3[1].json?.assignedStaffId === staffB.id)
    await cleanBookings('RACE-TEST-S3-')

    // ── SCENARIO 4: half-open per staff ──
    console.log('\n=== Scenario 4: Half-open intervals per staff ===')
    const base = iso(13, 0)
    const r4a = await postBooking('RACE-TEST-S4-A', base, staffA.id)
    check('scenario 4: first booking succeeds', r4a.ok)
    if (durationMin > 15) {
      const r4b = await postBooking('RACE-TEST-S4-B', iso(13, 15), staffA.id)
      check('scenario 4: overlapping +15min is rejected (409)', !r4b.ok && r4b.status === 409)
    }
    else {
      console.log('skip  scenario 4: overlap check (duration <= 15 min)')
    }
    if (durationMin % 15 === 0) {
      const endH = 13 + Math.floor(durationMin / 60)
      const endM = durationMin % 60
      const r4c = await postBooking('RACE-TEST-S4-C', iso(endH, endM), staffA.id)
      check('scenario 4: touching end boundary succeeds', r4c.ok)
    }
    else {
      console.log('skip  scenario 4: touching check (duration not on 15-min grid)')
    }
    await cleanBookings('RACE-TEST-S4-')

    // ── SCENARIO 5: booked slots reveal nothing ──
    console.log('\n=== Scenario 5: Availability privacy ===')
    const r5 = await postBooking('RACE-TEST-S5-A', iso(14, 0), staffA.id)
    check('scenario 5: setup booking succeeds', r5.ok)
    const avail = await (await fetch(
      `${BASE}/api/availability?service=${slug}&date=${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}&staff=${staffA.id}`,
    )).json()
    const raw = JSON.stringify(avail)
    const slot5 = (avail.slots || []).find(s => s.startsAt === iso(14, 0))
    check('scenario 5: booked slot reads unavailable', slot5 && slot5.available === false)
    check('scenario 5: no customer PII in availability',
      !raw.includes('491511234567') && !raw.includes('RACE-TEST')
      && !raw.includes('customerName') && !raw.includes('customerPhone') && !raw.includes('customerEmail'))
    const staffKeys = new Set()
    for (const s of avail.staffOptions || []) Object.keys(s).forEach(k => staffKeys.add(k))
    check('scenario 5: staff options expose public fields only',
      [...staffKeys].every(k => ['id', 'displayName', 'imagePath', 'sortOrder'].includes(k)))
    await cleanBookings('RACE-TEST-S5-')

    // ── SCENARIO 6: time-off exclusion ──
    console.log('\n=== Scenario 6: Time-off exclusion ===')
    await prisma.staffTimeOff.create({
      data: {
        staffId: staffB.id,
        startsAt: new Date(wallToUtcMs(y, m, d, 14, 0, 'Europe/Berlin')),
        endsAt: new Date(wallToUtcMs(y, m, d, 16, 0, 'Europe/Berlin')),
        reason: 'RACE time-off',
        createdBy: 'verify-race',
      },
    })
    const r6any = await postBooking('RACE-TEST-S6-ANY', iso(15, 0))
    check('scenario 6: ANY pick skips staff on time-off',
      r6any.ok && r6any.json?.assignedStaffId !== staffB.id)
    const r6b = await postBooking('RACE-TEST-S6-B', iso(15, 0), staffB.id)
    check('scenario 6: specific off-duty staff is rejected (409)', !r6b.ok && r6b.status === 409)
    await cleanBookings('RACE-TEST-S6-')
    await prisma.staffTimeOff.deleteMany({ where: { staffId: { in: [staffA.id, staffB.id] } } })

    // ── SCENARIO 7: overlapping different starts, staff-scoped invariant ──
    console.log('\n=== Scenario 7: Overlapping different start times race ===')
    const timeOffsets = [
      { h: 16, min: 0 }, { h: 16, min: 15 }, { h: 16, min: 15 }, { h: 16, min: 0 },
      { h: 16, min: 15 }, { h: 16, min: 30 }, { h: 16, min: 15 }, { h: 16, min: 30 },
    ]
    const res7 = await Promise.all(timeOffsets.map((t, i) =>
      postBooking(`RACE-TEST-S7-${i}`, iso(t.h, t.min)),
    ))
    const winners7 = await prisma.booking.findMany({
      where: { customerName: { startsWith: 'RACE-TEST-S7-' } },
      select: { customerName: true, assignedStaffId: true, startsAt: true, durationMinSnapshot: true },
    })
    console.log(`scenario 7: ${winners7.length} bookings created`)
    let staffOverlap = false
    for (let i = 0; i < winners7.length; i++) {
      for (let j = i + 1; j < winners7.length; j++) {
        const a = winners7[i]
        const b = winners7[j]
        if (a.assignedStaffId !== b.assignedStaffId) continue
        const aStart = a.startsAt.getTime()
        const aEnd = aStart + a.durationMinSnapshot * 60000
        const bStart = b.startsAt.getTime()
        const bEnd = bStart + b.durationMinSnapshot * 60000
        if (overlaps(aStart, aEnd, bStart, bEnd)) {
          staffOverlap = true
          console.log(`FAIL: staff overlap ${a.customerName} vs ${b.customerName}`)
        }
      }
    }
    check('scenario 7: bookings created and zero same-staff overlaps',
      winners7.length > 0 && !staffOverlap)
    void res7

    // ── CLEANUP ──
    const del = await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'RACE-TEST-' } } })
    console.log(`\ncleanup: deleted ${del.count} test booking(s)`)
    await prisma.staffTimeOff.deleteMany({ where: { staffId: { in: [staffA.id, staffB.id] } } })
    await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'RACE-STAFF-' } } })
    console.log('cleanup: race staff removed')
    if (savedHours.length) {
      await adminFetch('/api/admin/working-hours', {
        method: 'PUT',
        body: JSON.stringify({
          days: savedHours.map(d => ({ weekday: d.weekday, openMin: d.openMin, closeMin: d.closeMin, isClosed: d.isClosed })),
        }),
      })
      console.log('cleanup: hours restored')
    } else {
      await prisma.workingHours.deleteMany({})
      console.log('cleanup: test hours removed (table was empty before)')
    }

    process.exitCode = allPass ? 0 : 1
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error('FAIL', e?.message || e); process.exitCode = 1 })
