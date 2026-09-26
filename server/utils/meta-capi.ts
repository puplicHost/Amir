import { createHash } from 'node:crypto'
import { decryptData } from './encryption'

// Meta Conversions API (server events). Per Meta docs:
// POST https://graph.facebook.com/{VERSION}/{PIXEL_ID}/events
// Required for website events: action_source, event_source_url,
// client_user_agent + client_ip_address. user_data email/phone must be
// SHA-256 hashed. test_event_code routes into Test Events (remove for prod).
// Never throws — tracking must never break checkout/quote flows.

const GRAPH_VERSION = 'v19.0'

export interface MetaCapiEvent {
  eventName: string
  /** Unique ID for dedupe with browser Pixel events (e.g. order number). */
  eventId?: string
  eventSourceUrl?: string
  email?: string | null
  phone?: string | null
  clientIp?: string | null
  clientUa?: string | null
  value?: number
  currency?: string
}

function sha256norm(v: string) {
  return createHash('sha256').update(v.trim().toLowerCase()).digest('hex')
}

function digitsOnly(v: string) {
  return v.replace(/\D/g, '')
}

export async function sendMetaCapiEvent(input: MetaCapiEvent): Promise<boolean> {
  try {
    const settings = await prisma.siteSettings.findFirst()
    const pixelId = settings?.metaPixelId
    const testEventCode = settings?.metaTestEventCode || undefined
    if (!settings?.metaEnabled || !pixelId || !settings.metaCapiToken) return false

    let accessToken: string
    try {
      accessToken = decryptData(settings.metaCapiToken)
    }
    catch {
      console.warn('[meta-capi] Stored access token failed to decrypt; event skipped.')
      return false
    }

    const userData: Record<string, unknown> = {}
    if (input.email) userData.em = [sha256norm(input.email)]
    if (input.phone && digitsOnly(input.phone)) userData.ph = [sha256norm(digitsOnly(input.phone))]
    if (input.clientIp) userData.client_ip_address = input.clientIp
    if (input.clientUa) userData.client_user_agent = input.clientUa

    const config = useRuntimeConfig().public as Record<string, string>
    const siteUrl = (config.siteUrl || process.env.NUXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')

    const body: Record<string, unknown> = {
      data: [
        {
          event_name: input.eventName,
          event_time: Math.floor(Date.now() / 1000),
          ...(input.eventId ? { event_id: input.eventId } : {}),
          action_source: 'website',
          ...(input.eventSourceUrl || siteUrl
            ? { event_source_url: input.eventSourceUrl || siteUrl }
            : {}),
          user_data: userData,
          ...(input.value !== undefined
            ? { custom_data: { value: input.value, currency: input.currency || 'EGP' } }
            : {}),
        },
      ],
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    }

    const res = await $fetch<{ events_received?: number }>(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`,
      { method: 'POST', query: { access_token: accessToken }, body },
    )
    return (res.events_received || 0) > 0
  }
  catch (e) {
    console.warn('[meta-capi] Event send failed:', (e as Error)?.message || e)
    return false
  }
}
