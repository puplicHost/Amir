// Booking flow: payment-gateway availability + creation guards.
// Run: BASE_URL=http://127.0.0.1:3012 node --env-file=.env scripts/verify-booking-gateway.mjs
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { gatewayStatusFromSettings } from '../server/utils/booking-payments.ts'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const prisma = new PrismaClient()
const PREFIX = 'QA-GW-'
const STAFF_PREFIX = 'QA-GW-STAFF-'
let pass = 0
let fail = 0
let cookie = ''
let savedHours = null
let fixtureStaff = null

function envVal(key, fallback) {
  const m = readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))
  return (m ? m[1].trim().replace(/^"|"$/g, '') : fallback)
}

function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name} ${extra}`) }
}

async function jsonFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

function iso(ms) { return new Date(ms).toISOString() }

async function pickFreeSlot(staffId) {
  const svc = await prisma.service.findFirst({ where: { isActive: true }, select: { slug: true } })
  if (!svc) throw new Error('no active service')
  const now = Date.now()
  for (let d = 1; d <= 10; d++) {
    const day = new Date(now + d * 86400000).toISOString().slice(0, 10)
    const q = new URLSearchParams({ service: svc.slug, date: day, staff: staffId || 'any' })
    const { status, body } = await jsonFetch(`/api/availability?${q}`)
    if (status !== 200 || !body?.slots) continue
    const slot = body.slots.find(s => s.available)
    if (slot) return { slug: svc.slug, startsAt: slot.startsAt }
  }
  throw new Error('no free slot found')
}

function payload(slug, startsAt, staffId, name) {
  return {
    serviceSlug: slug,
    customerName: `${PREFIX}${name}`,
    customerPhone: '+49123456789',
    startsAt,
    locale: 'en',
    ...(staffId ? { staffId } : {}),
    idempotencyKey: crypto.randomUUID(),
  }
}

async function cleanup() {
  await prisma.booking.deleteMany({ where: { customerName: { startsWith: PREFIX } } })
  await prisma.staffTimeOff.deleteMany({ where: { staff: { email: { startsWith: STAFF_PREFIX } } } })
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: STAFF_PREFIX } } })
  fixtureStaff = null
  if (savedHours && cookie) {
    const res = await fetch(`${BASE}/api/admin/working-hours`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        days: savedHours.map(d => ({ weekday: d.weekday, openMin: d.openMin, closeMin: d.closeMin, isClosed: d.isClosed })),
      }),
    })
    savedHours = null
    console.log(res.ok ? 'cleanup: hours restored' : `cleanup: WARNING hours restore failed (${res.status})`)
  }
  else if (savedHours && !cookie) {
    console.log('cleanup: WARNING saved hours could not be restored (no admin session)')
  }
}

async function main() {
  await cleanup()

  // ---------- pure gateway availability ----------
  check('paypal: enabled + client id + secret is available',
    gatewayStatusFromSettings({ paypalEnabled: true, paypalClientId: 'id', paypalSecret: 'enc' }).paypal === true)
  check('paypal: enabled without secret is unavailable',
    gatewayStatusFromSettings({ paypalEnabled: true, paypalClientId: 'id' }).paypal === false)
  check('paypal: enabled without client id is unavailable',
    gatewayStatusFromSettings({ paypalEnabled: true, paypalSecret: 'enc' }).paypal === false)
  check('paypal: disabled with credentials is unavailable',
    gatewayStatusFromSettings({ paypalEnabled: false, paypalClientId: 'id', paypalSecret: 'enc' }).paypal === false)
  check('empty settings: paypal unavailable',
    JSON.stringify(gatewayStatusFromSettings(null)) === JSON.stringify({ paypal: false }))

  // ---------- fixtures (self-contained: staff user + open hours, race-style) ----------
  await prisma.staffTimeOff.deleteMany({ where: { staff: { email: { startsWith: STAFF_PREFIX } } } })
  await prisma.adminUser.deleteMany({ where: { email: { startsWith: STAFF_PREFIX } } })
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
  const cur = await (await fetch(`${BASE}/api/admin/working-hours`, { headers: { Cookie: cookie } })).json()
  savedHours = cur.days || []
  const open = await fetch(`${BASE}/api/admin/working-hours`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, openMin: 0, closeMin: 1440, isClosed: false })) }),
  })
  if (!open.ok) throw new Error(`hours setup failed (${open.status})`)
  fixtureStaff = await prisma.adminUser.create({
    data: {
      email: `${STAFF_PREFIX}${Date.now()}@test.invalid`,
      name: 'QA Gateway Staff',
      passwordHash: await bcrypt.hash('QA-GW-Staff-123!', 10),
      role: 'STAFF', isActive: true,
    },
  })
  const svcSlug = (await prisma.service.findFirst({ where: { isActive: true }, select: { slug: true } }))?.slug
  const staffRes = await jsonFetch('/api/staff?service=' + encodeURIComponent(svcSlug))
  const staff = staffRes.body?.staff?.find(s => s.id === fixtureStaff.id)
  if (!staff) throw new Error('fixture staff not bookable: ' + JSON.stringify(staffRes.body).slice(0, 120))
  const admin = await prisma.adminUser.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
  if (!admin) throw new Error('fixture missing: admin user')

  // ---------- successful booking ----------
  const slot1 = await pickFreeSlot(staff.id)
  const r1 = await jsonFetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload(slot1.slug, slot1.startsAt, staff.id, 'ok')),
  })
  check('valid staff + free slot creates booking', r1.status === 200, `${r1.status} ${JSON.stringify(r1.body)}`)
  check('response reports paypal gateway available', r1.body?.gateways?.paypal === true, JSON.stringify(r1.body?.gateways))
  check('booking is PENDING with assigned staff',
    r1.body?.paymentStatus === 'PENDING' && r1.body?.assignedStaffId === staff.id)

  // ---------- slot taken before submission ----------
  const r2 = await jsonFetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload(slot1.slug, slot1.startsAt, staff.id, 'taken')),
  })
  check('same slot second attempt is rejected with 409', r2.status === 409, `${r2.status} ${JSON.stringify(r2.body)}`)
  const dupes = await prisma.booking.count({
    where: { startsAt: new Date(slot1.startsAt), paymentStatus: { in: ['PENDING', 'PAID'] }, customerName: { startsWith: PREFIX } },
  })
  check('only one active booking exists for the slot', dupes === 1, String(dupes))

  // ---------- staff not eligible ----------
  const notStaff = await jsonFetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload(slot1.slug, slot1.startsAt, admin.id, 'notstaff')),
  })
  check('non-STAFF id is rejected with 400', notStaff.status === 400, `${notStaff.status} ${JSON.stringify(notStaff.body)}`)

  // ---------- invalid payload ----------
  const badBody = payload(slot1.slug, 'not-a-date', staff.id, 'baddate')
  delete badBody.idempotencyKey
  const bad = await jsonFetch('/api/bookings', { method: 'POST', body: JSON.stringify(badBody) })
  check('invalid startsAt is rejected with 400', bad.status === 400, `${bad.status} ${JSON.stringify(bad.body)}`)

  // ---------- expired hold ----------
  const token = r1.body?.token
  const row = await prisma.booking.findFirst({ where: { publicToken: token } })
  if (row) {
    await prisma.booking.update({ where: { id: row.id }, data: { holdExpiresAt: new Date(Date.now() - 60000) } })
    const pay = await jsonFetch(`/api/bookings/${token}/pay`, { method: 'POST', body: JSON.stringify({ provider: 'paypal' }) })
    check('expired hold cannot start payment (410)', pay.status === 410, `${pay.status} ${JSON.stringify(pay.body)}`)
    const after = await prisma.booking.findUnique({ where: { id: row.id }, select: { paymentStatus: true } })
    check('expired hold is marked EXPIRED', after?.paymentStatus === 'EXPIRED', after?.paymentStatus)
  }
  else {
    check('expired hold fixture exists', false)
  }

  // ---------- concurrent same slot ----------
  const slot2 = await pickFreeSlot(staff.id)
  const [c1, c2] = await Promise.all([
    jsonFetch('/api/bookings', { method: 'POST', body: JSON.stringify(payload(slot2.slug, slot2.startsAt, staff.id, 'race-a')) }),
    jsonFetch('/api/bookings', { method: 'POST', body: JSON.stringify(payload(slot2.slug, slot2.startsAt, staff.id, 'race-b')) }),
  ])
  const codes = [c1.status, c2.status].sort()
  check('concurrent attempts: exactly one 200 and one 409',
    codes[0] === 200 && codes[1] === 409, JSON.stringify(codes))
  const raceCount = await prisma.booking.count({
    where: { startsAt: new Date(slot2.startsAt), paymentStatus: { in: ['PENDING', 'PAID'] }, customerName: { startsWith: `${PREFIX}race-` } },
  })
  check('concurrent attempts created one booking', raceCount === 1, String(raceCount))

  // ---------- no gateway: refuse before creating a hold ----------
  const settings = await prisma.siteSettings.findFirst()
  const paypalEnabled = settings?.paypalEnabled
  let noGw
  try {
    await prisma.siteSettings.updateMany({ data: { paypalEnabled: false } })
    const slot3 = await pickFreeSlot(null)
    const body = payload(slot3.slug, slot3.startsAt, null, 'nogw')
    noGw = await jsonFetch('/api/bookings', { method: 'POST', body: JSON.stringify(body) })
    check('no gateway: booking refused with 503', noGw.status === 503, `${noGw.status} ${JSON.stringify(noGw.body)}`)
    const leaked = await prisma.booking.count({ where: { customerName: `${PREFIX}nogw` } })
    check('no gateway: no PENDING hold was created', leaked === 0, String(leaked))
  }
  finally {
    await prisma.siteSettings.updateMany({ data: { paypalEnabled: !!paypalEnabled } })
  }

  // ---------- cleanup ----------
  await cleanup()
  const left = await prisma.booking.count({ where: { customerName: { startsWith: PREFIX } } })
  check('test bookings cleaned up', left === 0, String(left))

  console.log(`\n${pass} passed, ${fail} failed`)
  await prisma.$disconnect()
  process.exit(fail ? 1 : 0)
}

main().catch(async (e) => {
  console.error(e)
  await cleanup().catch(() => {})
  await prisma.$disconnect()
  process.exit(1)
})
