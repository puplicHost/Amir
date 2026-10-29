import type { MarketingEventName, MarketingProviderDefinition } from '../../../shared/marketing'

export interface MarketingEventUser {
  emailHash: string | null
  phoneHash: string | null
  clientIp: string | null
  clientUserAgent: string | null
  fbp: string | null
  fbc: string | null
}

export interface MarketingEventData {
  bookingId?: string
  value?: number
  currency?: string
  serviceId?: string
  productId?: string
  path?: string
}

export interface AdapterRequest {
  url: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

export interface AdapterConfig {
  provider: MarketingProviderDefinition
  config: Record<string, unknown>
  secret: string
  events: Record<string, boolean>
}

export interface AdapterEvent {
  eventId: string
  eventName: MarketingEventName
  occurredAt: string
  data: MarketingEventData
  user: MarketingEventUser
}

function siteUrl(): string {
  try {
    const config = useRuntimeConfig().public as Record<string, string>
    if (config?.siteUrl) return config.siteUrl.replace(/\/$/, '')
  }
  catch {}
  return String(process.env.NUXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function eventTime(iso: string): number {
  const ms = Date.parse(iso)
  return Math.floor((Number.isFinite(ms) ? ms : Date.now()) / 1000)
}

function customData(event: AdapterEvent): Record<string, unknown> | null {
  const value = event.data.value
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return {
    value,
    currency: event.data.currency || 'EUR',
  }
}

/**
 * A Test Event Code is a testing-only setting. In production it must never be
 * silently converted into a normal conversion event: when it is configured
 * without an explicit opt-in, server delivery is suppressed instead.
 */
export function metaTestCodeBlocked(config: Record<string, unknown>): boolean {
  const code = str(config.testEventCode)
  if (!code) return false
  return process.env.NODE_ENV === 'production' && process.env.META_CAPI_ALLOW_TEST_EVENTS !== 'true'
}

function metaTestCode(config: Record<string, unknown>): string | undefined {
  const code = str(config.testEventCode)
  if (!code || metaTestCodeBlocked(config)) return undefined
  return code
}

export function buildAdapterRequest(
  platform: string,
  config: AdapterConfig,
  event: AdapterEvent,
): AdapterRequest | null {
  const eventName = config.provider.eventMap[event.eventName]
  if (!eventName) return null

  if (platform === 'meta') {
    const pixelId = str(config.config.pixelId)
    if (!pixelId) return null
    const userData: Record<string, unknown> = {}
    if (event.user.emailHash) userData.em = [event.user.emailHash]
    if (event.user.phoneHash) userData.ph = [event.user.phoneHash]
    if (event.user.fbp) userData.fbp = event.user.fbp
    if (event.user.fbc) userData.fbc = event.user.fbc
    if (event.user.clientIp) userData.client_ip_address = event.user.clientIp
    if (event.user.clientUserAgent) userData.client_user_agent = event.user.clientUserAgent
    const testEventCode = metaTestCode(config.config)
    return {
      url: `https://graph.facebook.com/v19.0/${encodeURIComponent(pixelId)}/events`,
      headers: {
        Authorization: `Bearer ${config.secret}`,
        'Content-Type': 'application/json',
      },
      body: {
        data: [
          {
            event_name: eventName,
            event_time: eventTime(event.occurredAt),
            event_id: event.eventId,
            action_source: 'website',
            ...(siteUrl() ? { event_source_url: siteUrl() } : {}),
            user_data: userData,
            ...(customData(event) ? { custom_data: customData(event) } : {}),
          },
        ],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      },
    }
  }

  if (platform === 'tiktok') {
    const pixelId = str(config.config.pixelId)
    if (!pixelId) return null
    const user: Record<string, unknown> = {}
    if (event.user.emailHash) user.email = event.user.emailHash
    if (event.user.phoneHash) user.phone = event.user.phoneHash
    if (event.user.clientIp) user.ip = event.user.clientIp
    if (event.user.clientUserAgent) user.user_agent = event.user.clientUserAgent
    return {
      url: 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
      headers: {
        'Access-Token': config.secret,
        'Content-Type': 'application/json',
      },
      body: {
        event_source: 'web',
        event_source_id: pixelId,
        data: [
          {
            event: eventName,
            event_time: eventTime(event.occurredAt),
            event_id: event.eventId,
            user,
            ...(customData(event)
              ? {
                  properties: {
                    ...customData(event),
                    ...(event.data.serviceId ? { content_id: event.data.serviceId } : {}),
                  },
                }
              : {}),
          },
        ],
      },
    }
  }

  if (platform === 'snapchat') {
    const pixelId = str(config.config.pixelId)
    if (!pixelId) return null
    return {
      url: 'https://tr.snapchat.com/v2/conversion',
      headers: {
        Authorization: `Bearer ${config.secret}`,
        'Content-Type': 'application/json',
      },
      body: {
        pixel_id: pixelId,
        event_type: eventName,
        event_conversion_type: 'WEB',
        timestamp: Date.parse(event.occurredAt) || Date.now(),
        ...(event.user.emailHash ? { hashed_email: event.user.emailHash } : {}),
        ...(event.user.phoneHash ? { hashed_phone_number: event.user.phoneHash } : {}),
        ...(event.user.clientIp ? { ip_address: event.user.clientIp } : {}),
        ...(event.user.clientUserAgent ? { user_agent: event.user.clientUserAgent } : {}),
        ...(event.eventId ? { client_dedup_id: event.eventId } : {}),
        ...(customData(event) ? { price: event.data.value, currency: event.data.currency || 'EUR' } : {}),
      },
    }
  }

  if (platform === 'pinterest') {
    const adAccountId = str(config.config.adAccountId)
    if (!adAccountId) return null
    const userData: Record<string, unknown> = {}
    if (event.user.emailHash) userData.em = [event.user.emailHash]
    if (event.user.phoneHash) userData.ph = [event.user.phoneHash]
    if (event.user.clientIp) userData.client_ip_address = event.user.clientIp
    if (event.user.clientUserAgent) userData.client_user_agent = event.user.clientUserAgent
    return {
      url: `https://api.pinterest.com/v5/ad_accounts/${encodeURIComponent(adAccountId)}/events`,
      headers: {
        Authorization: `Bearer ${config.secret}`,
        'Content-Type': 'application/json',
      },
      body: {
        data: [
          {
            event_name: eventName,
            action_source: 'web',
            event_time: eventTime(event.occurredAt),
            event_id: event.eventId,
            user_data: userData,
            ...(customData(event)
              ? {
                  custom_data: {
                    ...customData(event),
                    ...(event.data.serviceId ? { content_ids: [event.data.serviceId] } : {}),
                  },
                }
              : {}),
          },
        ],
      },
    }
  }

  // Google Ads is browser-tag only; no server adapter is registered.
  return null
}

export function adapterSuccess(platform: string, status: number, json: any): boolean {
  if (status < 200 || status >= 300) return false
  if (platform === 'meta') return Number(json?.events_received || 0) > 0
  if (platform === 'tiktok') return Number(json?.code ?? -1) === 0
  // Snapchat/Pinterest return 2xx on accepted events; no invented extra checks.
  return true
}

export function adapterError(platform: string, status: number, json: any): string {
  const message =
    json?.error?.message
    || json?.error_description
    || json?.message
    || json?.error
    || (typeof json === 'string' ? json : '')
  const text = typeof message === 'string' ? message : ''
  return `HTTP ${status}${text ? `: ${text.slice(0, 240)}` : ''}`
}
