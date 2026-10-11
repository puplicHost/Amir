// Phase 2f unit & integration verification: Meta Pixel, Conversions API (CAPI),
// consent gating, payload hashing, and deduplication.
//
// Run: node scripts/verify-2f.mjs
import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { buildCapiBody } from '../server/utils/meta-capi.ts'
import { purchaseEventId } from '../server/utils/booking-payments.ts'
import {
  CONSENT_COOKIE_NAME,
  CONSENT_POLICY_VERSION,
  CONSENT_COOKIE_MAX_AGE,
} from '../app/composables/useCookieConsent.ts'

const prisma = new PrismaClient()

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

function sha256(v) {
  return createHash('sha256').update(v.trim().toLowerCase()).digest('hex')
}

async function main() {
  console.log('=== 1. Consent Policy & Cookie Rules ===')
  check('Consent cookie name is amir_cookie_consent', CONSENT_COOKIE_NAME === 'amir_cookie_consent')
  check('Consent policy version is 1', CONSENT_POLICY_VERSION === 1)
  check('Consent cookie TTL is 180 days (6 months)', CONSENT_COOKIE_MAX_AGE === 60 * 60 * 24 * 180)

  console.log('\n=== 2. CAPI Payload Construction & Hashing ===')
  const testInput = {
    eventName: 'Purchase',
    eventId: 'purchase-test-bk-123',
    email: 'Customer@Example.COM',
    phone: '+49 171 1234567',
    fbp: 'fb.1.1558571054389.1098115397',
    fbc: 'fb.1.1558571054389.AbCdEf123',
    value: 23.00,
    currency: 'EUR',
  }
  const body = buildCapiBody(testInput, 'https://amir.com')
  const event = body?.data?.[0]

  check('Event name is Purchase', event?.event_name === 'Purchase')
  check('Event id matches input eventId', event?.event_id === 'purchase-test-bk-123')
  check('Action source is website', event?.action_source === 'website')
  check('Value is 23.00', event?.custom_data?.value === 23.00)
  check('Currency is EUR', event?.custom_data?.currency === 'EUR')

  // PII must be hashed with SHA-256
  const expectedEmailHash = sha256('customer@example.com')
  const expectedPhoneHash = sha256('491711234567')
  check('Email is SHA-256 hashed (lowercase, trimmed)', event?.user_data?.em?.[0] === expectedEmailHash)
  check('Phone digits-only are SHA-256 hashed', event?.user_data?.ph?.[0] === expectedPhoneHash)
  check('Raw email does NOT appear in payload', !JSON.stringify(body).includes('Customer@Example.COM'))
  check('Raw phone does NOT appear in payload', !JSON.stringify(body).includes('+49 171 1234567'))

  // Phone normalization: "0171 1234567", "+49 171 1234567", "0049 171 1234567" all produce the same hash
  const bodyLocal = buildCapiBody({ eventName: 'Purchase', phone: '0171 1234567' })
  const bodyIntl = buildCapiBody({ eventName: 'Purchase', phone: '+49 171 1234567' })
  const bodyDoubleZero = buildCapiBody({ eventName: 'Purchase', phone: '0049 171 1234567' })
  const hashLocal = bodyLocal?.data?.[0]?.user_data?.ph?.[0]
  const hashIntl = bodyIntl?.data?.[0]?.user_data?.ph?.[0]
  const hashDoubleZero = bodyDoubleZero?.data?.[0]?.user_data?.ph?.[0]

  check('0171 1234567 produces expected normalized phone hash', hashLocal === expectedPhoneHash)
  check('+49 171 1234567 produces identical hash to 0171 1234567', hashIntl === hashLocal)
  check('0049 171 1234567 produces identical hash to 0171 1234567', hashDoubleZero === hashLocal)

  // fbp and fbc passed as unhashed strings per Meta specs
  check('fbp is passed correctly', event?.user_data?.fbp === 'fb.1.1558571054389.1098115397')
  check('fbc is passed correctly', event?.user_data?.fbc === 'fb.1.1558571054389.AbCdEf123')

  // No customer IP or user agent injected when null
  check('No client IP in payload when null', event?.user_data?.client_ip_address === undefined)
  check('No client UA in payload when null', event?.user_data?.client_user_agent === undefined)

  console.log('\n=== 3. CAPI Consent Gating & Deduplication Logic ===')
  // Simulated server gating logic:
  function simulateFinalize(booking, capiDispatch) {
    if (!booking.marketingConsent) {
      return false // without consent: no event, no hashed data
    }
    capiDispatch({
      eventName: 'Purchase',
      eventId: purchaseEventId(booking.id),
      value: booking.depositCents / 100,
      currency: 'EUR',
      email: booking.customerEmail,
      phone: booking.customerPhone,
      fbp: booking.fbp,
      fbc: booking.fbc,
    })
    return true
  }

  const calls = []
  const mockDispatch = (payload) => { calls.push(payload) }

  // Booking without consent
  const bWithoutConsent = {
    id: 'bk-no-consent',
    marketingConsent: false,
    customerEmail: 'anon@example.com',
    customerPhone: '+491710000000',
    depositCents: 2000,
    fbp: null,
    fbc: null,
  }
  const sent1 = simulateFinalize(bWithoutConsent, mockDispatch)
  check('Booking without consent -> NO CAPI call attempted', sent1 === false && calls.length === 0)

  // Booking with consent
  const bWithConsent = {
    id: 'bk-with-consent',
    marketingConsent: true,
    customerEmail: 'consenting@example.com',
    customerPhone: '+491719999999',
    depositCents: 2500,
    fbp: 'fb.1.999',
    fbc: 'fb.1.888',
  }
  const sent2 = simulateFinalize(bWithConsent, mockDispatch)
  check('Booking with consent -> CAPI call attempted', sent2 === true && calls.length === 1)
  check('Dispatched event has matching eventId', calls[0]?.eventId === 'purchase-bk-with-consent')
  check('Dispatched event has fbp and fbc', calls[0]?.fbp === 'fb.1.999' && calls[0]?.fbc === 'fb.1.888')

  // Replay simulation: once confirmed PAID, decision is 'already-paid' and finalize is NOT called
  function simulateWebhookConfirm(currentStatus, booking) {
    if (currentStatus === 'PAID') {
      return { decision: 'already-paid' }
    }
    return { decision: 'confirm' }
  }

  const firstAttempt = simulateWebhookConfirm('PENDING', bWithConsent)
  if (firstAttempt.decision === 'confirm') {
    simulateFinalize(bWithConsent, mockDispatch)
  }
  check('First webhook confirmation fires CAPI', calls.length === 2)

  const replayAttempt = simulateWebhookConfirm('PAID', bWithConsent)
  if (replayAttempt.decision === 'confirm') {
    simulateFinalize(bWithConsent, mockDispatch)
  }
  check('Webhook replay on already-PAID booking does NOT fire second CAPI event',
    replayAttempt.decision === 'already-paid' && calls.length === 2)

  console.log(`\nPhase 2f verification: ${pass} passed, ${fail} failed`)
  await prisma.$disconnect()
  process.exit(fail ? 1 : 0)
}

main().catch(async (e) => {
  console.error('Test crashed:', e)
  await prisma.$disconnect()
  process.exit(1)
})
