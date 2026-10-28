// Roadmap Phase 6 checks: "I'm unavailable" absence flow, admin-recorded
// absence, reassignment queue, assignment guards (service/schedule/time-off).
// Prerequisites: dev server running, migrations applied.
// Run: node scripts/verify-6.mjs
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

  const cur = await (await fetch(`${BASE}/api/admin/working-hours`, { headers: { Cookie: cookie } })).json()
  const savedHours = cur.days || []
  await adminFetch('/api/admin/working-hours', {
    method: 'PUT',
    body: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, openMin: 0, closeMin: 1440, isClosed: false })) }),
  })

  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH6-TEST-' } } })
  await prisma.staffTimeOff.deleteMany({ where: { staff: { email: { startsWith: 'ph6-staff-' } } } })
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'ph6-staff-' } } })
  const passHash = await bcrypt.hash('Ph6-Staff-123!', 10)
  const mkStaff = suf => prisma.adminUser.create({
    data: { email: `ph6-staff-${suf.toLowerCase()}@test.invalid`, name: `PH6 Staff ${suf}`, passwordHash: passHash, role: 'STAFF', isActive: true },
  })
  const staffA = await mkStaff('A')
  const staffB = await mkStaff('B')
  const services = await (await fetch(`${BASE}/api/services`)).json()
  const svc = await (await fetch(`${BASE}/api/services/${services[0].slug}`)).json()

  const bp = tzParts(Date.now(), 'Europe/Berlin')
  const t2 = new Date(Date.UTC(bp.year, bp.month - 1, bp.day) + 2 * 86400000)
  const y = t2.getUTCFullYear()
  const m = t2.getUTCMonth() + 1
  const d = t2.getUTCDate()
  const iso = (h, min) => new Date(wallToUtcMs(y, m, d, h, min, 'Europe/Berlin')).toISOString()

  // Two paid bookings for A (manual, assigned immediately).
  const mkPaid = (name, at) => adminFetch('/api/admin/bookings/manual', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: svc.id, staffId: staffA.id, startsAt: at,
      customerName: name, customerPhone: '+491511234567',
      source: 'WALK_IN', paymentMode: 'paid_in_salon', paymentMethod: 'cash',
    }),
  })
  const b1 = await mkPaid('PH6-TEST-1', iso(10, 0))
  const b2 = await mkPaid('PH6-TEST-2', iso(16, 0))
  check('setup: two paid assigned bookings for A', b1.ok && b2.ok)

  // 1. "I'm unavailable" as A.
  const sLogin = await fetch(`${BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ph6-staff-a@test.invalid', password: 'Ph6-Staff-123!' }),
  })
  const sc = sLogin.headers.get('set-cookie')?.split(';')[0] || ''
  const staffFetch = (url, opts = {}) => fetch(`${BASE}${url}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Cookie: sc, ...(opts.headers || {}) },
  }).then(async r => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => null) }))
  const off = await staffFetch('/api/admin/staff/unavailable', {
    method: 'POST',
    body: JSON.stringify({
      from: iso(9, 0), to: iso(15, 0), reason: 'PH6 sick',
    }),
  })
  check('unavailable returns 1 unassigned booking', off.ok && off.json?.unassignedCount === 1)
  const after1 = await prisma.booking.findUnique({ where: { id: b1.json.booking.id } })
  const after2 = await prisma.booking.findUnique({ where: { id: b2.json.booking.id } })
  check('overlapping booking returned to UNASSIGNED with null staff',
    after1.status === 'UNASSIGNED' && after1.assignedStaffId === null)
  check('non-overlapping booking stays ASSIGNED', after2.status === 'ASSIGNED')
  const offs = await prisma.staffTimeOff.findMany({ where: { staffId: staffA.id } })
  check('time-off recorded, blocks new picks', offs.length === 1)

  // 2. Assign guard: time-off staff rejected (A is off 09:00-15:00).
  const b3 = await adminFetch('/api/admin/bookings/manual', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: svc.id, staffId: staffB.id, startsAt: iso(14, 0),
      customerName: 'PH6-TEST-3', customerPhone: '+491511234567',
      source: 'PHONE', paymentMode: 'paid_in_salon', paymentMethod: 'cash',
    }),
  })
  const g2 = await adminFetch(`/api/admin/bookings/${b3.json.booking.id}/assign`, {
    method: 'PUT', body: JSON.stringify({ staffId: staffA.id }),
  })
  check('assign to off-duty staff rejected (409)', !g2.ok && g2.status === 409)

  // 3. Reassignment queue shows the unassigned paid booking.
  const q = await adminFetch(`/api/admin/bookings?status=UNASSIGNED&limit=50`)
  const queued = (q.json?.bookings || []).filter(b => String(b.customerName || '').startsWith('PH6-TEST-'))
  check('unassigned paid booking visible in queue', queued.some(b => b.id === b1.json.booking.id))

  // 4. Admin-recorded absence for B unassigns too.
  const off2 = await adminFetch(`/api/admin/staff/${staffB.id}/timeoff`, {
    method: 'POST',
    body: JSON.stringify({ startsAt: iso(13, 0), endsAt: iso(15, 0), reason: 'PH6 admin-recorded' }),
  })
  check('admin absence returns 1 booking to queue', off2.ok && off2.json?.unassignedCount === 1)

  // Cleanup.
  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH6-TEST-' } } })
  await prisma.staffTimeOff.deleteMany({ where: { staffId: { in: [staffA.id, staffB.id] } } })
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'ph6-staff-' } } })
  console.log('cleanup: phase 6 fixtures removed')
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
  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH6-TEST-' } } }).catch(() => null)
  await prisma.staffTimeOff.deleteMany({ where: { staff: { email: { startsWith: 'ph6-staff-' } } } }).catch(() => null)
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'ph6-staff-' } } }).catch(() => null)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
