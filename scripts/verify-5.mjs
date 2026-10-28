// Roadmap Phase 5 checks: manual booking (paid/pending/pay-link),
// double-booking protection, reschedule, calendar feed.
// Prerequisites: dev server running, migrations applied.
// Run: node scripts/verify-5.mjs
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { wallToUtcMs, tzParts } from '../server/utils/booking-slots.ts'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const prisma = new PrismaClient()

function envVal(key, fallback) {
  const m = readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))
  return (m ? m[1].trim().replace(/^"|"$/g, '') : fallback)
}

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

async function main() {
  const login = await fetch(`${BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: envVal('SEED_ADMIN_EMAIL', 'admin@amir.com'),
      password: envVal('SEED_ADMIN_PASSWORD', 'AmirAdmin123!'),
    }),
  })
  if (!login.ok) throw new Error(`admin login failed (${login.status})`)
  const cookie = login.headers.get('set-cookie')?.split(';')[0] || ''
  const adminFetch = (url, opts = {}) => fetch(`${BASE}${url}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(opts.headers || {}) },
  }).then(async r => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => null) }))

  // Hours open all week.
  const cur = await (await fetch(`${BASE}/api/admin/working-hours`, { headers: { Cookie: cookie } })).json()
  const savedHours = cur.days || []
  await adminFetch('/api/admin/working-hours', {
    method: 'PUT',
    body: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, openMin: 0, closeMin: 1440, isClosed: false })) }),
  })

  // Service + staff.
  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH5-TEST-' } } })
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'ph5-staff-' } } })
  const passHash = await bcrypt.hash('Ph5-Staff-123!', 10)
  const staff = await prisma.adminUser.create({
    data: { email: 'ph5-staff-a@test.invalid', name: 'PH5 Staff A', passwordHash: passHash, role: 'STAFF', isActive: true },
  })
  const services = await (await fetch(`${BASE}/api/services`)).json()
  const svc = await (await fetch(`${BASE}/api/services/${services[0].slug}`)).json()

  const bp = tzParts(Date.now(), 'Europe/Berlin')
  const t2 = new Date(Date.UTC(bp.year, bp.month - 1, bp.day) + 2 * 86400000)
  const y = t2.getUTCFullYear()
  const m = t2.getUTCMonth() + 1
  const d = t2.getUTCDate()
  const dayStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const iso = (h, min) => new Date(wallToUtcMs(y, m, d, h, min, 'Europe/Berlin')).toISOString()
  // Slots spaced beyond one service duration so sequential bookings never overlap.
  const dur = svc.durationMin || 30
  const step = (h, min, delta) => {
    const t = h * 60 + min + delta
    return [Math.floor(t / 60), t % 60]
  }
  const gap = Math.ceil((dur + 15) / 15) * 15
  const [h1, m1] = step(10, 0, gap)
  const [h2, m2] = step(h1, m1, gap)
  const [h3, m3] = step(h2, m2, gap)
  const manual = (body) => adminFetch('/api/admin/bookings/manual', { method: 'POST', body: JSON.stringify(body) })
  const base = {
    serviceId: svc.id, staffId: staff.id,
    customerName: 'PH5-TEST-Customer', customerPhone: '+491511234567',
    source: 'WALK_IN',
  }

  // 1. Paid in salon.
  const r1 = await manual({ ...base, startsAt: iso(10, 0), paymentMode: 'paid_in_salon', paymentMethod: 'cash' })
  check('manual paid_in_salon creates PAID+ASSIGNED manual booking',
    r1.ok && r1.json?.booking?.paymentStatus === 'PAID' && r1.json?.booking?.status === 'ASSIGNED'
    && r1.json?.booking?.assignedStaffId === staff.id && r1.json?.payUrl === null)

  // 2. Same staff+slot rejected.
  const r2 = await manual({ ...base, startsAt: iso(10, 0), paymentMode: 'pending' })
  check('manual double-booking same staff is rejected (409)', !r2.ok && r2.status === 409)

  // 3. Pending hold.
  const r3 = await manual({ ...base, startsAt: iso(h1, m1), paymentMode: 'pending' })
  check('manual pending creates PENDING hold',
    r3.ok && r3.json?.booking?.paymentStatus === 'PENDING' && r3.json?.payUrl === null)

  // 4. Pay link.
  const r4 = await manual({ ...base, startsAt: iso(h2, m2), paymentMode: 'pay_link', source: 'WHATSAPP' })
  check('manual pay_link returns /booking/pay/<token>',
    r4.ok && typeof r4.json?.payUrl === 'string' && r4.json.payUrl.startsWith('/booking/pay/'))
  const payPage = await fetch(`${BASE}${r4.json.payUrl}`)
  check('pay-link page renders (200)', payPage.ok)

  // 5. Reschedule: free slot ok, taken slot rejected.
  const id1 = r1.json.booking.id
  const rr1 = await adminFetch(`/api/admin/bookings/${id1}/reschedule`, {
    method: 'PUT', body: JSON.stringify({ startsAt: iso(h3, m3) }),
  })
  check('reschedule to free slot succeeds', rr1.ok)
  const rr2 = await adminFetch(`/api/admin/bookings/${id1}/reschedule`, {
    method: 'PUT', body: JSON.stringify({ startsAt: iso(h1, m1) }),
  })
  check('reschedule onto pending hold is rejected (409)', !rr2.ok && rr2.status === 409)

  // 6. Calendar feed.
  const cal = await adminFetch(`/api/admin/calendar?from=${dayStr}&to=${dayStr}`)
  check('calendar feed returns day bookings + closures',
    cal.ok && Array.isArray(cal.json?.bookings) && cal.json.bookings.length >= 3 && Array.isArray(cal.json?.closures))

  // 7. Staff-scoped feed sees only own.
  const staffLogin = await fetch(`${BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ph5-staff-a@test.invalid', password: 'Ph5-Staff-123!' }),
  })
  const sc = staffLogin.headers.get('set-cookie')?.split(';')[0] || ''
  const scal = await (await fetch(`${BASE}/api/admin/calendar?from=${dayStr}&to=${dayStr}`, { headers: { Cookie: sc } })).json()
  check('staff calendar is scoped to own bookings',
    Array.isArray(scal.bookings) && scal.bookings.length >= 1
    && scal.bookings.every(b => b.assignedStaffId === staff.id))

  // Cleanup.
  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH5-TEST-' } } })
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'ph5-staff-' } } })
  console.log('cleanup: phase 5 fixtures removed')
  if (savedHours.length) {
    await adminFetch('/api/admin/working-hours', {
      method: 'PUT',
      body: JSON.stringify({ days: savedHours.map(x => ({ weekday: x.weekday, openMin: x.openMin, closeMin: x.closeMin, isClosed: x.isClosed })) }),
    })
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exitCode = fail ? 1 : 0
}

main().catch(async (e) => {
  console.error('Test crashed:', e?.message || e)
  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH5-TEST-' } } }).catch(() => null)
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'ph5-staff-' } } }).catch(() => null)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
