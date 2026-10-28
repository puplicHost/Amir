// Stripe webhook end-to-end tests against the REAL Nitro route
// (POST /api/webhooks/stripe) with locally signed test-mode-style events.
//
// Covers: raw-body signature verification (valid + invalid), missing
// metadata, unrelated events, amount/currency mismatch flagging, duplicate
// (replayed) events, unpaid-session no-op, async_payment_succeeded/-failed,
// late payment after hold expiry (free + taken slot), concurrent duplicate
// deliveries, and providerRef/providerPaymentId persistence.
//
// Prerequisites: dev server running (`npm run dev`), migrations applied.
// Run: node --env-file=.env scripts/verify-stripe-webhook.mjs
//
// Test data: STRIPE-T-* bookings and a random local webhook secret written
// into siteSettings — both restored to their previous values afterwards.
// NO secret is printed, NO live Stripe API call is made (event payloads are
// synthesised locally and signed with the local secret).
import { createHmac, randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { encryptData } from '../server/utils/encryption.ts'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'
const PREFIX = 'STRIPE-T-'
const CURRENCY = 'EUR'

const prisma = new PrismaClient()
const secret = `whsec_${randomBytes(24).toString('hex')}`

let pass = 0
let fail = 0
const dbg = false
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}${extra ? ` — ${extra}` : ''}`) }
}


// Standard Stripe v1 webhook signature scheme (what constructEvent verifies):
//   t=<unix-seconds>,v1=HMAC_SHA256(secret, `${ts}.${rawBody}`)
function sign(payload, whenMs) {
  const ts = Math.floor((whenMs ?? Date.now()) / 1000)
  const mac = createHmac('sha256', Buffer.from(secret))
    .update(`${ts}.${JSON.stringify(payload)}`)
    .digest('hex')
  return `t=${ts},v1=${mac}`
}

async function post(payload, { sig } = {}) {
  const body = JSON.stringify(payload)
  const res = await fetch(`${BASE}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': sig ?? sign(payload),
    },
    body,
  })
  const raw = await res.clone().text()
  if (res.status !== 200) console.log(`  <- ${res.status} ${raw.slice(0, 120)}`)
  return { status: res.status, json: await res.json().catch(() => null), res, raw }
}

function sessionEvent(overrides = {}) {
  const session = {
    id: overrides.id || `cs_test_${randomBytes(12).toString('hex')}`,
    object: 'checkout.session',
    amount_total: 1500,
    currency: CURRENCY,
    payment_intent: `pi_${randomBytes(10).toString('hex')}`,
    payment_status: 'paid',
    status: 'complete',
    metadata: { bookingId: 'missing', token: 'x' },
    ...overrides.session,
  }
  return { id: `evt_${randomBytes(12).toString('hex')}`, object: 'event',
    api_version: '2025-10-01', created: Math.floor(Date.now() / 1000),
    livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null },
    type: overrides.type || 'checkout.session.completed', data: { object: session } }
}

function ev(type, session) { return { type, session } }

let seq = 0
const now = Date.now()
let slotCursor = 2 * 86400000
// Legacy staff-less bookings block any blocking same-service booking starting
// within the previous 24h — so payment-test slots are spaced 26h apart.
const slotAt = () => new Date(now + (slotCursor += 26 * 3600000))
async function makeBooking(opts) {
  seq++
  const token = `${PREFIX}${now}-${seq}`
  return prisma.booking.create({
    data: {
      bookingNumber: `ST-${now}-${seq}`,
      serviceId: opts.serviceId,
      customerName: opts.name,
      customerPhone: '+4915100000000',
      customerEmail: opts.customerEmail || null,
      startsAt: opts.startsAt,
      durationMinSnapshot: opts.durationMin,
      priceSnapshotCents: opts.priceCents,
      depositCents: opts.depositCents,
      paymentProvider: opts.provider || 'stripe',
      paymentStatus: opts.paymentStatus || 'PENDING',
      status: opts.status || 'UNASSIGNED',
      assignedStaffId: null,
      holdExpiresAt: opts.holdExpiresAt ?? new Date(now + 15 * 60000),
      idempotencyKey: `idem-${token}`,
      publicToken: `pub-${token}`,
      manageToken: `man-${token}`,
      ...(opts.providerRef ? { providerRef: opts.providerRef } : {}),
    },
  })
}

async function outboxCount(bookingId) {
  return prisma.notificationOutbox.count({ where: { bookingId } })
}

/** finalizePaidBooking runs off the ACK path (event.waitUntil) — poll briefly. */
async function waitForOutbox(bookingId, min = 1, ms = 6000) {
  const id = setInterval(async () => {
    try {
      if (await outboxCount(bookingId) >= min) clearInterval(id)
    }
    catch { clearInterval(id) }
  }, 250)
  const started = Date.now()
  while (await outboxCount(bookingId) < min && Date.now() - started < ms) {
    await new Promise(r => setTimeout(r, 200))
  }
  clearInterval(id)
  return outboxCount(bookingId)
}

const dump = (b) => console.log('   state:', JSON.stringify({
  id: b?.id?.slice(-6), paymentStatus: b?.paymentStatus, status: b?.status,
  needsRefund: b?.needsRefund, providerRef: b?.providerRef ? b.providerRef.slice(0, 12) : null,
  providerPaymentId: b?.providerPaymentId ? b.providerPaymentId.slice(0, 12) : null,
  startsAt: b?.startsAt, holdExpiresAt: b?.holdExpiresAt,
}))

async function main() {
  // DB guard: dev/test only (same guard as update-service-durations.mjs).
  let dbHost = ''
  try { dbHost = new URL(process.env.DATABASE_URL || '').hostname }
  catch { throw new Error('DATABASE_URL missing or invalid') }
  const localHost = ['localhost', '127.0.0.1', '::1'].includes(dbHost)
  if (process.env.NODE_ENV === 'production' || !localHost) {
    throw new Error(`Refusing to mutate database at host "${dbHost}" (dev/test only)`)
  }
  console.log(`database: ${new URL(process.env.DATABASE_URL).pathname.slice(1)} @ ${dbHost} (non-production guard passed)`)

  // Reach pre-check.
  const ping = await fetch(`${BASE}/api/services`)
  if (!ping.ok) throw new Error(`dev server not reachable (${ping.status})`)

  // Save + temporarily install a local webhook secret (in-memory backup only).
  const settings = await prisma.siteSettings.findFirst({ select: { id: true, stripeEnabled: true } })
  if (!settings || !settings.stripeEnabled) throw new Error('stripeEnabled is off — webhook would reject before signature')
  const prev = { secretEnc: (await prisma.siteSettings.findFirst({ select: { stripeWebhookSecret: true } })).stripeWebhookSecret }
  await prisma.siteSettings.update({
    where: { id: settings.id },
    data: { stripeWebhookSecret: encryptData(secret) },
  })

  const svc = await prisma.service.findFirst({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  if (!svc) throw new Error('no active service')
  const depositCents = 1500

  let bookings = []
  try {
    // Signatures: missing header → 400 before any state change.
    const noSig = await post(sessionEvent(ev('checkout.session.completed', { metadata: {} })), { sig: '' })
    check('T4a: missing stripe-signature → 400', noSig.status === 400)
    const badSig = await fetch(`${BASE}/api/webhooks/stripe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' },
      body: JSON.stringify(sessionEvent(ev('checkout.session.completed', { metadata: {} }))),
    })
    check('T4b: invalid signature → 400', badSig.status === 400)

    // T6: valid signature but NO bookingId mapping → ack, no side effects.
    const noMetaBooking = await makeBooking({ name: `${PREFIX}nometa`, serviceId: svc.id,
      startsAt: slotAt(), durationMin: 30, priceCents: 6000, depositCents })
    bookings.push(noMetaBooking)
    const before = { ...noMetaBooking }
    const rNoMeta = await post(sessionEvent(ev('checkout.session.completed', { metadata: {} })))
    check('T6a: session without bookingId → 200 received', rNoMeta.status === 200 && rNoMeta.json?.received === true)
    const afterNoMeta = await prisma.booking.findUnique({ where: { id: noMetaBooking.id } })
    check('T6b: session without bookingId leaves the booking untouched',
      afterNoMeta.paymentStatus === 'PENDING' && afterNoMeta.status === before.status)

    const otherType = await post(sessionEvent(ev('invoice.paid', {}))) // unrelated event type
    check('T6c: unrelated event type → 200 received, ignored', otherType.status === 200)

    // T1: successful payment confirms the matching booking.
    const payBooking = await makeBooking({ name: `${PREFIX}pay`, serviceId: svc.id,
      startsAt: slotAt(), durationMin: 30, priceCents: 6000, depositCents,
      customerEmail: 'qa-stripe-t1@example.invalid' })
    bookings.push(payBooking)
    const payEvt = sessionEvent(ev('checkout.session.completed', {
      metadata: { bookingId: payBooking.id, token: payBooking.publicToken },
    }))
    const r1 = await post(payEvt)
    const b1 = await prisma.booking.findUnique({ where: { id: payBooking.id } })
    check('T1a: valid completed event → 200 accepted', r1.status === 200)
    check('T1b: booking flipped PENDING→PAID, hold cleared, still UNASSIGNED (staffless)',
      b1.paymentStatus === 'PAID' && b1.holdExpiresAt === null && b1.status === 'UNASSIGNED')
    check('T1c: providerRef + providerPaymentId persisted from the session',
      b1.providerRef === payEvt.data.object.id && b1.providerPaymentId === payEvt.data.object.payment_intent)
    const ob1 = await waitForOutbox(payBooking.id)
    check('T1d: confirmation side effect (customer mail) queued', ob1 >= 1, `outbox=${ob1}`)

    // T5: exact same event redelivered → already-paid, no new side effects.
    const r5 = await post(payEvt)
    const b5 = await prisma.booking.findUnique({ where: { id: payBooking.id } })
    check('T5a: duplicate delivery → 200, still PAID', r5.status === 200 && b5.paymentStatus === 'PAID')
    check('T5b: duplicate delivery wrote no further customer mail', (await outboxCount(payBooking.id)) === ob1)

    // T10: concurrent duplicated deliveries for an unpaid booking.
    const concBooking = await makeBooking({ name: `${PREFIX}conc`, serviceId: svc.id,
      startsAt: slotAt(), durationMin: 30, priceCents: 6000, depositCents })
    bookings.push(concBooking)
    const concEvt = sessionEvent(ev('checkout.session.completed', {
      metadata: { bookingId: concBooking.id, token: concBooking.publicToken },
    }))
    const rc = await Promise.all([post(concEvt), post(concEvt), post(concEvt)])
    const bc = await prisma.booking.findUnique({ where: { id: concBooking.id } })
    check('T10: 3 concurrent identical deliveries → single PAID transition, all acked',
      rc.every(r => r.status === 200) && bc.paymentStatus === 'PAID')

    // T9: amount/currency mismatch → flag-for-refund, never confirmed.
    const misAmt = await makeBooking({ name: `${PREFIX}amt`, serviceId: svc.id,
      startsAt: slotAt(), durationMin: 30, priceCents: 6000, depositCents })
    bookings.push(misAmt)
    const rMisAmt = await post(sessionEvent(ev('checkout.session.completed', {
      metadata: { bookingId: misAmt.id, token: misAmt.publicToken }, amount_total: 500,
    })))
    console.log('  T9a post:', rMisAmt.status, JSON.stringify(rMisAmt.json), rMisAmt.raw.slice(0, 90))
    const bm = await prisma.booking.findUnique({ where: { id: misAmt.id } })
    dump(bm)
    check('T9a: wrong amount cannot confirm (PENDING + needsRefund)',
      bm.paymentStatus === 'PENDING' && bm.needsRefund === true)
    const misCur = await makeBooking({ name: `${PREFIX}cur`, serviceId: svc.id,
      startsAt: slotAt(), durationMin: 30, priceCents: 6000, depositCents })
    bookings.push(misCur)
    const rMisCur = await post(sessionEvent(ev('checkout.session.completed', {
      metadata: { bookingId: misCur.id, token: misCur.publicToken }, currency: 'USD',
    })))
    console.log('  T9b post:', rMisCur.status, JSON.stringify(rMisCur.json), rMisCur.raw.slice(0, 90))
    const bmc = await prisma.booking.findUnique({ where: { id: misCur.id } })
    dump(bmc)
    check('T9b: wrong currency cannot confirm (PENDING + needsRefund)',
      bmc.paymentStatus === 'PENDING' && bmc.needsRefund === true)

    // T-unpaid: completed with payment_status 'unpaid' (delayed method) must
    // NOT confirm — regression for the async-delayed-methods fix.
    const unpaid = await makeBooking({ name: `${PREFIX}unpaid`, serviceId: svc.id,
      startsAt: slotAt(), durationMin: 30, priceCents: 6000, depositCents })
    bookings.push(unpaid)
    await post(sessionEvent(ev('checkout.session.completed', {
      metadata: { bookingId: unpaid.id, token: unpaid.publicToken }, payment_status: 'unpaid',
      amount_total: null, payment_intent: null,
    })))
    const bu = await prisma.booking.findUnique({ where: { id: unpaid.id } })
    check('T-unpaid: completed+unpaid session does NOT confirm the booking',
      bu.paymentStatus === 'PENDING' && bu.needsRefund === false && bu.providerRef === null)
    // ...and the async succeeded event later DOES confirm it.
    const rAs = await post(sessionEvent(ev('checkout.session.async_payment_succeeded', {
      metadata: { bookingId: unpaid.id, token: unpaid.publicToken }, payment_status: 'paid',
    })))
    console.log('  async-ok post:', rAs.status, JSON.stringify(rAs.json), rAs.raw.slice(0, 90))
    const bu2 = await prisma.booking.findUnique({ where: { id: unpaid.id } })
    dump(bu2)
    check('T-async-ok: async_payment_succeeded → confirmed PAID',
      rAs.status === 200 && bu2.paymentStatus === 'PAID' && bu2.needsRefund === false)

    // T-async-fail: async_payment_failed is a deliberate no-op (hold rules).
    const asyncFail = await makeBooking({ name: `${PREFIX}afail`, serviceId: svc.id,
      startsAt: slotAt(), durationMin: 30, priceCents: 6000, depositCents })
    bookings.push(asyncFail)
    const raf = await post(sessionEvent(ev('checkout.session.async_payment_failed', {
      metadata: { bookingId: asyncFail.id, token: asyncFail.publicToken }, payment_status: 'unpaid',
    })))
    const baf = await prisma.booking.findUnique({ where: { id: asyncFail.id } })
    check('T-async-fail: async_payment_failed → no state change (200 received, still PENDING)',
      raf.status === 200 && baf.paymentStatus === 'PENDING')

    // T7/T8: late payment after hold expiry.
    const lateFree = await makeBooking({ name: `${PREFIX}late-free`, serviceId: svc.id,
      startsAt: slotAt(), durationMin: 30, priceCents: 6000, depositCents, paymentStatus: 'EXPIRED', holdExpiresAt: new Date(now - 3600000) })
    bookings.push(lateFree)
    const rlf = await post(sessionEvent(ev('checkout.session.completed', {
      metadata: { bookingId: lateFree.id, token: lateFree.publicToken },
      amount_total: lateFree.depositCents, currency: CURRENCY, payment_status: 'paid',
      status: 'complete', payment_intent: `pi_${randomBytes(10).toString('hex')}`,
    })))
    console.log('  late free post:', rlf.status, JSON.stringify(rlf.json), rlf.raw.slice(0, 90))
    const blf = await prisma.booking.findUnique({ where: { id: lateFree.id } })
    dump(blf)
    check('T7: paid event after hold expiry, slot still free → honored PAID',
      rlf.status === 200 && blf.paymentStatus === 'PAID' && blf.needsRefund === false)

    const takenSlot = slotAt()
    const lateTaken1 = await makeBooking({ name: `${PREFIX}late-blocker`, serviceId: svc.id,
      startsAt: takenSlot, durationMin: 30, priceCents: 6000, depositCents, paymentStatus: 'PAID', status: 'ASSIGNED',
      holdExpiresAt: null })
    bookings.push(lateTaken1)
    const lateTaken2 = await makeBooking({ name: `${PREFIX}late-taken`, serviceId: svc.id,
      startsAt: takenSlot, durationMin: 30, priceCents: 6000, depositCents, paymentStatus: 'EXPIRED', holdExpiresAt: new Date(now - 3600000) })
    bookings.push(lateTaken2)
    const rlt2 = await post(sessionEvent(ev('checkout.session.completed', {
      metadata: { bookingId: lateTaken2.id, token: lateTaken2.publicToken },
      amount_total: lateTaken2.depositCents, currency: CURRENCY, payment_status: 'paid',
      status: 'complete', payment_intent: `pi_${randomBytes(10).toString('hex')}`,
    })))
    console.log('  late taken post:', rlt2.status, JSON.stringify(rlt2.json), rlt2.raw.slice(0, 90))
    const bt = await prisma.booking.findUnique({ where: { id: lateTaken2.id } })
    dump(bt)
    check('T7-TAKEN: paid event after hold expiry, slot taken → never confirmed, flagged for review',
      bt.paymentStatus === 'EXPIRED' && bt.needsRefund === true && bt.providerRef !== null && bt.providerPaymentId === null)

    // ProviderRef mismatch: money for a superseded attempt cannot confirm.
    const stale = await makeBooking({ name: `${PREFIX}stale`, serviceId: svc.id,
      startsAt: slotAt(), durationMin: 30, priceCents: 6000, depositCents,
      providerRef: 'cs_test_other_attempt' })
    bookings.push(stale)
    const rst = await post(sessionEvent(ev('checkout.session.completed', {
      metadata: { bookingId: stale.id, token: stale.publicToken }, id: 'cs_test_current_attempt',
    })))
    console.log('  stale post:', rst.status, JSON.stringify(rst.json), rst.raw.slice(0, 90))
    const bs = await prisma.booking.findUnique({ where: { id: stale.id } })
    dump(bs)
    check('T-stale: event for a superseded payment attempt is flagged, not confirmed',
      bs.paymentStatus === 'PENDING' && bs.needsRefund === true)
  }
  finally {
    // Cleanup: notifications referencing test bookings, then bookings, then
    // restore the previous webhook secret (never printing values).
    const ids = bookings.map(b => b.id)
    if (ids.length) {
      await prisma.notificationOutbox.deleteMany({ where: { bookingId: { in: ids } } })
      await prisma.adminNotification.deleteMany({ where: { relatedEntityId: { in: ids } } })
      await prisma.booking.deleteMany({ where: { id: { in: ids } } })
    }
    await prisma.booking.deleteMany({ where: { customerName: { startsWith: PREFIX } } })
    await prisma.siteSettings.update({
      where: { id: (await prisma.siteSettings.findFirst({ select: { id: true } })).id },
      data: {
        stripeWebhookSecret: prev.secretEnc ?? null,
      },
    })
    await prisma.$disconnect()
    console.log(`cleanup: ${ids.length} test bookings removed; webhook secret restored to previous state (${prev.secretEnc ? 'original value' : 'not set'})`)
  }

  console.log(`\n${pass} passed, ${fail} failed${fail ? '' : ''}`)
  process.exitCode = fail ? 1 : 0
}

main().catch((e) => {
  console.error('FAIL', e?.message || e)
  process.exitCode = 1
})
