import { createHash } from 'node:crypto'
import { normalizePhoneForWa } from '../../../shared/booking'
import { getSiteSettings } from '../site-settings'
import {
  claimDelivery,
  finishDelivery,
  getServerDeliveryConfig,
} from './config'
import {
  adapterError,
  adapterSuccess,
  buildAdapterRequest,
  metaTestCodeBlocked,
  type AdapterEvent,
  type MarketingEventData,
  type MarketingEventUser,
} from './adapters'
import type { MarketingEventName, MarketingPlatform } from '../../../shared/marketing'

const TIMEOUT_MS = 8000
const MAX_RESPONSE_CHARS = 8192

function sha(value: string | null | undefined): string | null {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return v ? createHash('sha256').update(v).digest('hex') : null
}

function hashedPhone(value: string | null | undefined): string | null {
  const v = normalizePhoneForWa(value || '')
  return v ? sha(v) : null
}

function userFromBooking(booking: {
  customerEmail?: string | null
  customerPhone?: string | null
  metaClientIp?: string | null
  metaClientUa?: string | null
  fbp?: string | null
  fbc?: string | null
}): MarketingEventUser {
  return {
    emailHash: sha(booking.customerEmail),
    phoneHash: hashedPhone(booking.customerPhone),
    clientIp: booking.metaClientIp || null,
    clientUserAgent: booking.metaClientUa || null,
    fbp: booking.fbp || null,
    fbc: booking.fbc || null,
  }
}

async function postAdapter(
  platform: MarketingPlatform,
  request: { url: string, headers: Record<string, string>, body: Record<string, unknown> },
): Promise<{ ok: boolean, status: number, error: string | null }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: controller.signal,
    })
    const text = (await res.text()).slice(0, MAX_RESPONSE_CHARS)
    let json: any = null
    try { json = JSON.parse(text) } catch { json = text }
    const ok = adapterSuccess(platform, res.status, json)
    return {
      ok,
      status: res.status,
      error: ok ? null : adapterError(platform, res.status, json),
    }
  }
  catch (e: any) {
    return {
      ok: false,
      status: 0,
      error: e?.name === 'AbortError' ? 'Provider timeout' : String(e?.message || e).slice(0, 240),
    }
  }
  finally {
    clearTimeout(timer)
  }
}

/**
 * Send a server-side normalized event to every enabled, configured provider.
 * Consent must already be true. Never throws and never blocks payment flows.
 */
export async function dispatchMarketingEvent(event: AdapterEvent): Promise<{ sent: number, failed: number }> {
  // Providers are independent: run them in parallel so one slow API cannot
  // multiply the timeout across the whole fan-out.
  const results = await Promise.all(
    (['meta', 'tiktok', 'snapchat', 'pinterest'] as MarketingPlatform[]).map(async (platform) => {
      try {
        const config = await getServerDeliveryConfig(platform)
        if (!config) return null
        if (config.provider.eventMap[event.eventName] === null) return null
        if (!config.events[event.eventName]) return null
        if (platform === 'meta' && metaTestCodeBlocked(config.config)) {
          // Never turn a configured Test Event Code into a real production
          // conversion. Record an explicit skipped diagnostic instead.
          const claimId = await claimDelivery({
            platform,
            eventName: event.eventName,
            eventId: event.eventId,
          })
          if (claimId) {
            await finishDelivery(
              claimId,
              'SKIPPED',
              null,
              'Meta Test Event Code is set in production; delivery suppressed until META_CAPI_ALLOW_TEST_EVENTS=true or the code is removed.',
            )
          }
          return 'skipped'
        }
        const request = buildAdapterRequest(platform, config, event)
        if (!request) return null
        const claimId = await claimDelivery({
          platform,
          eventName: event.eventName,
          eventId: event.eventId,
        })
        if (!claimId) {
          console.info('[marketing] delivery not claimed (duplicate or storage unavailable):', platform, event.eventName)
          return null // already sent/handled by this platform
        }
        const result = await postAdapter(platform, request)
        await finishDelivery(claimId, result.ok ? 'SENT' : 'FAILED', result.status, result.error)
        return result.ok ? 'sent' : 'failed'
      }
      catch {
        return 'failed'
      }
    }),
  )
  return {
    sent: results.filter(r => r === 'sent').length,
    failed: results.filter(r => r === 'failed').length,
  }
}

export interface BookingEventOptions {
  value?: number
  currency?: string
}

/**
 * Build a consent-aware server event from the authoritative booking row.
 * Only called after verified payment/confirmation/cancellation.
 */
export async function dispatchBookingMarketingEvent(
  eventName: Extract<MarketingEventName, 'BookingConfirmed' | 'DepositPaid' | 'BookingCancelled'>,
  bookingId: string,
  options: BookingEventOptions = {},
): Promise<{ sent: number, failed: number }> {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) return { sent: 0, failed: 0 }
    if (!booking.marketingConsent) {
      console.info('[marketing] event suppressed (no marketing consent):', eventName)
      return { sent: 0, failed: 0 }
    }
    const settings = await getSiteSettings()
    const eventId =
      eventName === 'DepositPaid'
        ? `purchase-${booking.id}`
        : eventName === 'BookingConfirmed'
          ? `booking-confirmed-${booking.id}`
          : `booking-cancelled-${booking.id}`
    const data: MarketingEventData = {
      bookingId: booking.id,
      ...(eventName === 'DepositPaid'
        ? { value: options.value ?? booking.depositCents / 100, currency: options.currency || settings?.defaultCurrency || 'EUR' }
        : {}),
    }
    return await dispatchMarketingEvent({
      eventId,
      eventName,
      occurredAt: new Date().toISOString(),
      data,
      user: userFromBooking({
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        metaClientIp: (booking as any).metaClientIp,
        metaClientUa: (booking as any).metaClientUa,
        fbp: (booking as any).fbp,
        fbc: (booking as any).fbc,
      }),
    })
  }
  catch {
    // Marketing must never break booking or payment flows.
    return { sent: 0, failed: 0 }
  }
}

