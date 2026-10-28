// Roadmap Phase 8 checks: self-cancel window, idempotent double-cancel,
// slot release, admin refund modes, boundary enforcement.
// Deposit refunds run in OUTSIDE/manual mode here (no gateway credentials);
// live PayPal sandbox paths require sandbox keys.
// Prerequisites: dev server running, migrations applied.
// Run: node scripts/verify-8.mjs
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

  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH8-TEST-' } } })
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'PH8-STAFF-' } } })
  const passHash = await bcrypt.hash('Ph8-Staff-123!', 10)
  const staff = await prisma.adminUser.create({
    data: { email: 'PH8-STAFF-A@test.invalid', name: 'PH8 Staff A', passwordHash: passHash, role: 'STAFF', isActive: true },
  })
  const services = await (await fetch(`${BASE}/api/services`)).json()
  const svc = await (await fetch(`${BASE}/api/services/${services[0].slug}`)).json()

  const bp = tzParts(Date.now(), 'Europe/Berlin')
  const base = new Date(Date.UTC(bp.year, bp.month - 1, bp.day))
  const atDay = (plusDays, h, min) => {
    const t = new Date(base.getTime() + plusDays * 86400000)
    return new Date(wallToUtcMs(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), h, min, 'Europe/Berlin')).toISOString()
  }
  const manual = (body) => adminFetch('/api/admin/bookings/manual', { method: 'POST', body: JSON.stringify(body) })
  const mkPaid = (name, at) => manual({
    serviceId: svc.id, staffId: staff.id, startsAt: at,
    customerName: name, customerPhone: '+491511234567', customerEmail: 'ph8@test.invalid',
    source: 'WALK_IN', paymentMode: 'paid_in_salon', paymentMethod: 'cash',
  })

  // 1. Far booking (+3d): manageable + cancellable, full refund → OUTSIDE (manual).
  const far = await mkPaid('PH8-TEST-FAR', atDay(3, 10, 0))
  check('setup far paid booking', far.ok)
  const token = far.json.booking.publicToken
  const manageToken = (await prisma.booking.findUnique({ where: { id: far.json.booking.id } })).manageToken
  const mg = await (await fetch(`${BASE}/api/bookings/manage/${manageToken}`)).json()
  check('manage page reports canCancel=true', mg.canCancel === true)
  const cx = await fetch(`${BASE}/api/bookings/manage/${manageToken}/cancel`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  }).then(async r => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => null) }))
  check('self-cancel succeeds with OUTSIDE refund (manual/cash)',
    cx.ok && cx.json?.refundStatus === 'OUTSIDE' && cx.json?.alreadyCancelled === false)
  const closed = await prisma.booking.findUnique({ where: { id: far.json.booking.id } })
  check('booking CANCELLED by CUSTOMER, staff released',
    closed.status === 'CANCELLED' && closed.cancelledBy === 'CUSTOMER' && closed.assignedStaffId === null)
  const cx2 = await fetch(`${BASE}/api/bookings/manage/${manageToken}/cancel`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  }).then(async r => ({ ok: r.ok, status: r.status, json: await r.json().catch(() => null) }))
  check('double cancel is a no-op success', cx2.ok && cx2.json?.alreadyCancelled === true)
  const refunds = await prisma.bookingRefund.findMany({ where: { bookingId: far.json.booking.id } })
  check('no duplicate refund rows on replay', refunds.length === 0)

  // 2. Slot freed: same staff+slot bookable again.
  const re = await mkPaid('PH8-TEST-REUSE', atDay(3, 10, 0))
  check('cancelled slot is bookable again', re.ok)

  // 3. Near booking (+2h, grid-aligned): lateCancel, self-cancel rejected.
  const nearMs = Math.ceil((Date.now() + 2 * 3600000) / 900000) * 900000
  const near = await mkPaid('PH8-TEST-NEAR', new Date(nearMs).toISOString())
  if (!near.ok) {
    console.log('skip  near-booking setup (outside grid/hours)')
  }
  else {
    const nearToken = (await prisma.booking.findUnique({ where: { id: near.json.booking.id } })).manageToken
    const mg2 = await (await fetch(`${BASE}/api/bookings/manage/${nearToken}`)).json()
    check('late booking reports canCancel=false', mg2.canCancel === false)
    const cxLate = await fetch(`${BASE}/api/bookings/manage/${nearToken}/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    })
    check('late self-cancel rejected (400)', cxLate.status === 400)
  }

  // 4. Admin modes.
  const adm = await mkPaid('PH8-TEST-ADM', atDay(3, 12, 0))
  const over = await adminFetch(`/api/admin/bookings/${adm.json.booking.id}/cancel`, {
    method: 'POST', body: JSON.stringify({ mode: 'custom', amountCents: 99999999 }),
  })
  check('admin custom refund above deposit rejected (400)', !over.ok && over.status === 400)
  const none = await adminFetch(`/api/admin/bookings/${adm.json.booking.id}/cancel`, {
    method: 'POST', body: JSON.stringify({ mode: 'no_refund', reason: 'PH8 test' }),
  })
  check('admin no_refund cancels without refund',
    none.ok && none.json?.refundStatus === 'NONE')
  const mails = await prisma.notificationOutbox.findMany({
    where: { bookingId: adm.json.booking.id, type: 'booking_cancelled' },
  })
  check('cancellation mail queued', mails.length === 1)

  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH8-TEST-' } } })
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'PH8-STAFF-' } } })
  console.log('cleanup: phase 8 fixtures removed')
  if (savedHours.length) {
    await adminFetch('/api/admin/working-hours', {
      method: 'PUT',
      body: JSON.stringify({ days: savedHours.map(x => ({ weekday: x.weekday, openMin: x.openMin, closeMin: x.closeMin, isClosed: x.isClosed })) }),
    })
  }
  void token
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exitCode = fail ? 1 : 0
}

main().catch(async (e) => {
  console.error('Test crashed:', e?.message || e)
  await prisma.booking.deleteMany({ where: { customerName: { startsWith: 'PH8-TEST-' } } }).catch(() => null)
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: 'PH8-STAFF-' } } }).catch(() => null)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
