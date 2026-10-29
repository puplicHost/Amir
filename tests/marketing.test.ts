import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultEventConfig,
  getMarketingProvider,
  isValidMarketingFieldValue,
  providerSupportedEvents,
} from '../shared/marketing.ts'
import {
  adapterError,
  adapterSuccess,
  buildAdapterRequest,
  metaTestCodeBlocked,
} from '../server/utils/marketing/adapters.ts'

const user = {
  emailHash: 'a'.repeat(64),
  phoneHash: 'b'.repeat(64),
  clientIp: '203.0.113.10',
  clientUserAgent: 'Test Agent',
  fbp: 'fb.1.123',
  fbc: 'fb.2.456',
}

const paidEvent = {
  eventId: 'purchase-booking-1',
  eventName: 'DepositPaid' as const,
  occurredAt: '2026-10-29T12:00:00.000Z',
  data: {
    bookingId: 'booking-1',
    value: 23.5,
    currency: 'EUR',
    serviceId: 'service-1',
  },
  user,
}

function cfg(platform: string, config: Record<string, unknown>) {
  return {
    provider: getMarketingProvider(platform)!,
    config,
    secret: 'server-secret',
    events: { DepositPaid: true },
  }
}

test('Meta CAPI payload maps DepositPaid to Purchase with the shared event id', () => {
  const request = buildAdapterRequest('meta', cfg('meta', { pixelId: '123456789012345' }), paidEvent)!
  assert.ok(request.url.endsWith('/123456789012345/events'))
  assert.equal(request.headers.Authorization, 'Bearer server-secret')
  const data = (request.body.data as any[])[0]
  assert.equal(data.event_name, 'Purchase')
  assert.equal(data.event_id, 'purchase-booking-1')
  assert.equal(data.action_source, 'website')
  assert.equal(data.custom_data.value, 23.5)
  assert.equal(data.custom_data.currency, 'EUR')
  assert.equal(data.user_data.em[0], 'a'.repeat(64))
})

test('Meta Test Event Code is included only when configured', () => {
  const without = buildAdapterRequest('meta', cfg('meta', { pixelId: '123456789012345' }), paidEvent)!
  assert.equal(Object.hasOwn(without.body, 'test_event_code'), false)
  const withCode = buildAdapterRequest('meta', cfg('meta', {
    pixelId: '123456789012345',
    testEventCode: 'TEST12345',
  }), paidEvent)!
  assert.equal(withCode.body.test_event_code, 'TEST12345')
})

test('TikTok Events API payload uses the normalized event id', () => {
  const request = buildAdapterRequest('tiktok', cfg('tiktok', { pixelId: 'C123' }), paidEvent)!
  assert.equal(request.headers['Access-Token'], 'server-secret')
  assert.equal(request.body.event_source, 'web')
  assert.equal(request.body.event_source_id, 'C123')
  const data = (request.body.data as any[])[0]
  assert.equal(data.event, 'CompletePayment')
  assert.equal(data.event_id, 'purchase-booking-1')
  assert.equal(data.properties.value, 23.5)
})

test('Snapchat Conversions API payload includes client_dedup_id and millisecond time', () => {
  const request = buildAdapterRequest('snapchat', cfg('snapchat', { pixelId: 'S123' }), paidEvent)!
  assert.equal(request.body.pixel_id, 'S123')
  assert.equal(request.body.event_type, 'PURCHASE')
  assert.equal(request.body.event_conversion_type, 'WEB')
  assert.equal(request.body.client_dedup_id, 'purchase-booking-1')
  assert.equal(request.body.timestamp, Date.parse(paidEvent.occurredAt))
  assert.equal(request.body.price, 23.5)
})

test('Pinterest Conversions API payload targets the ad account and event id', () => {
  const request = buildAdapterRequest('pinterest', cfg('pinterest', {
    tagId: 'T123',
    adAccountId: '549755885175',
  }), paidEvent)!
  assert.ok(request.url.includes('/ad_accounts/549755885175/events'))
  const data = (request.body.data as any[])[0]
  assert.equal(data.event_name, 'checkout')
  assert.equal(data.event_id, 'purchase-booking-1')
  assert.equal(data.custom_data.currency, 'EUR')
})

test('Google Ads has no server adapter; its browser integration supports only DepositPaid', () => {
  assert.equal(buildAdapterRequest('google', cfg('google', { conversionId: 'AW-123456789' }), paidEvent), null)
  const google = getMarketingProvider('google')!
  assert.deepEqual(providerSupportedEvents(google), ['DepositPaid'])
  assert.deepEqual(defaultEventConfig(google), {
    PageView: false,
    ViewService: false,
    ViewProduct: false,
    BookingStarted: false,
    BookingConfirmed: false,
    DepositPaid: true,
    BookingCancelled: false,
  })
})

test('provider event maps never advertise unsupported events', () => {
  for (const platform of ['meta', 'google', 'tiktok', 'snapchat', 'pinterest']) {
    const provider = getMarketingProvider(platform)!
    for (const event of providerSupportedEvents(provider)) {
      assert.ok(provider.eventMap[event], `${platform} maps ${event}`)
    }
  }
  for (const platform of ['meta', 'tiktok', 'snapchat', 'pinterest']) {
    assert.equal(defaultEventConfig(getMarketingProvider(platform)!).BookingCancelled, false)
  }
})

test('provider success parsing does not accept a 2xx error body', () => {
  assert.equal(adapterSuccess('meta', 200, { events_received: 1 }), true)
  assert.equal(adapterSuccess('meta', 200, { events_received: 0 }), false)
  assert.equal(adapterSuccess('tiktok', 200, { code: 0 }), true)
  assert.equal(adapterSuccess('tiktok', 200, { code: 40001 }), false)
  assert.equal(adapterSuccess('snapchat', 204, {}), true)
  assert.equal(adapterSuccess('snapchat', 500, {}), false)
})

test('adapter errors are bounded and contain no request secrets', () => {
  const message = adapterError('meta', 401, { error: { message: 'Invalid OAuth access token' } })
  assert.equal(message, 'HTTP 401: Invalid OAuth access token')
  assert.ok(!message.includes('server-secret'))
})

test('a production Test Event Code suppresses delivery instead of becoming a conversion', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousAllow = process.env.META_CAPI_ALLOW_TEST_EVENTS
  try {
    process.env.NODE_ENV = 'production'
    delete process.env.META_CAPI_ALLOW_TEST_EVENTS
    assert.equal(metaTestCodeBlocked({ testEventCode: 'TEST12345' }), true)
    assert.equal(metaTestCodeBlocked({}), false)
    process.env.META_CAPI_ALLOW_TEST_EVENTS = 'true'
    assert.equal(metaTestCodeBlocked({ testEventCode: 'TEST12345' }), false)
    // The request still omits the test code when production opt-in is absent,
    // which is why the dispatcher suppresses instead of sending it as a real event.
    delete process.env.META_CAPI_ALLOW_TEST_EVENTS
    const request = buildAdapterRequest('meta', cfg('meta', {
      pixelId: '123456789012345',
      testEventCode: 'TEST12345',
    }), paidEvent)!
    assert.equal(Object.hasOwn(request.body, 'test_event_code'), false)
  }
  finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousAllow === undefined) delete process.env.META_CAPI_ALLOW_TEST_EVENTS
    else process.env.META_CAPI_ALLOW_TEST_EVENTS = previousAllow
  }
})

test('legacy placeholder pixel ids are rejected before reaching public config', () => {
  assert.equal(isValidMarketingFieldValue('meta', 'pixelId', 'owner@example.com'), false)
  assert.equal(isValidMarketingFieldValue('meta', 'pixelId', '123456789012345'), true)
  assert.equal(isValidMarketingFieldValue('google', 'conversionId', 'AW-123456789'), true)
  assert.equal(isValidMarketingFieldValue('google', 'conversionId', '123456789'), false)
  assert.equal(isValidMarketingFieldValue('pinterest', 'adAccountId', 'abc'), false)
  assert.equal(isValidMarketingFieldValue('pinterest', 'adAccountId', '549755885175'), true)
})
