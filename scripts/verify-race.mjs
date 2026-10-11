// Concurrency race tests (Phase 2c fix):
// Scenario 1: N parallel requests for the EXACT SAME slot -> exactly 1 succeeds.
// Scenario 2: N parallel requests for OVERLAPPING DIFFERENT start times
//             (e.g. 11:00, 11:15 on a 30-min service) -> assert that NO TWO
//             successful bookings overlap.
//
// Prerequisites: dev server running (`npm run dev`), migrations applied.
// Run: node scripts/verify-race.mjs
//
// Test data: clearly-marked RACE-TEST-* bookings + temporary working hours.
// Restores previous hours and deletes test bookings on cleanup.
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { wallToUtcMs, tzParts, overlaps } from '../server/utils/booking-slots.ts'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const N = 8

function envVal(key, fallback) {
  const m = readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))
  return (m ? m[1].trim().replace(/^"|"$/g, '') : fallback)
}

async function main() {
  const prisma = new PrismaClient()
  let cookie = ''
  let savedHours = null
  let allPass = true

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

    const services = await (await fetch(`${BASE}/api/services`)).json()
    const slug = services[0]?.slug
    if (!slug) throw new Error('no active services to book')

    const now = Date.now()
    const bp = tzParts(now, 'Europe/Berlin')
    const target = new Date(Date.UTC(bp.year, bp.month - 1, bp.day) + 2 * 86400000)
    const y = target.getUTCFullYear()
    const m = target.getUTCMonth() + 1
    const d = target.getUTCDate()

    // ── SCENARIO 1: N parallel for exact same slot ──
    console.log('=== Scenario 1: Same slot race ===')
    const slot1 = new Date(wallToUtcMs(y, m, d, 10, 0, 'Europe/Berlin')).toISOString()
    console.log(`target slot: ${slot1}`)

    const res1 = await Promise.all(Array.from({ length: N }, (_, i) =>
      fetch(`${BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceSlug: slug,
          customerName: `RACE-TEST-S1-${i}`,
          customerPhone: '+491511234567',
          startsAt: slot1,
        }),
      }).then(async r => ({ ok: r.ok, status: r.status })).catch(e => ({ ok: false, status: String(e) })),
    ))
    const okCount1 = res1.filter(r => r.ok).length
    console.log(`scenario 1 results: ${okCount1} ok, codes=[${res1.map(r => r.status).join(',')}]`)
    if (okCount1 === 1) {
      console.log('ok   scenario 1: exactly one booking won the slot')
    } else {
      console.log(`FAIL scenario 1: expected exactly 1 success, got ${okCount1}`)
      allPass = false
    }

    // Clean up scenario 1 bookings before scenario 2
    await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'RACE-TEST-S1-' } } })

    // ── SCENARIO 2: N parallel for overlapping different start times ──
    console.log('\n=== Scenario 2: Overlapping different start times race ===')
    // Mix of 11:00, 11:15, 11:30. A 30-min service at 11:00 overlaps 11:15; 11:15 overlaps 11:30.
    const timeOffsets = [
      { h: 11, min: 0 },
      { h: 11, min: 15 },
      { h: 11, min: 15 },
      { h: 11, min: 0 },
      { h: 11, min: 15 },
      { h: 11, min: 30 },
      { h: 11, min: 15 },
      { h: 11, min: 30 },
    ]
    const res2 = await Promise.all(timeOffsets.map((t, i) => {
      const slotIso = new Date(wallToUtcMs(y, m, d, t.h, t.min, 'Europe/Berlin')).toISOString()
      return fetch(`${BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceSlug: slug,
          customerName: `RACE-TEST-S2-${i}`,
          customerPhone: '+491511234567',
          startsAt: slotIso,
        }),
      }).then(async r => ({ ok: r.ok, status: r.status, time: `${t.h}:${String(t.min).padStart(2, '0')}` })).catch(e => ({ ok: false, status: String(e), time: '' }))
    }))
    const okCount2 = res2.filter(r => r.ok).length
    console.log(`scenario 2 results: ${okCount2} ok, codes=[${res2.map(r => `${r.time}:${r.status}`).join(', ')}]`)

    // Verify in DB that no two created test bookings overlap
    const winningBookings = await prisma.booking.findMany({
      where: { customerName: { startsWith: 'RACE-TEST-S2-' } },
      select: { customerName: true, startsAt: true, durationMinSnapshot: true },
    })

    let hasOverlap = false
    for (let i = 0; i < winningBookings.length; i++) {
      for (let j = i + 1; j < winningBookings.length; j++) {
        const a = winningBookings[i]
        const b = winningBookings[j]
        const aStart = a.startsAt.getTime()
        const aEnd = aStart + a.durationMinSnapshot * 60000
        const bStart = b.startsAt.getTime()
        const bEnd = bStart + b.durationMinSnapshot * 60000
        if (overlaps(aStart, aEnd, bStart, bEnd)) {
          hasOverlap = true
          console.log(`FAIL: Overlap detected between ${a.customerName} (${new Date(aStart).toISOString()}) and ${b.customerName} (${new Date(bStart).toISOString()})`)
        }
      }
    }

    if (!hasOverlap && winningBookings.length > 0) {
      console.log(`ok   scenario 2: ${winningBookings.length} bookings created and ZERO overlapping bookings`)
    } else if (winningBookings.length === 0) {
      console.log('FAIL scenario 2: no bookings created')
      allPass = false
    } else {
      allPass = false
    }

    // ── CLEANUP ──
    const del = await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'RACE-TEST-' } } })
    console.log(`\ncleanup: deleted ${del.count} test booking(s)`)
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
