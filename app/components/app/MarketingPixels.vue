<script setup lang="ts">
import {
  getMarketingProvider,
  type MarketingEventName,
  type MarketingPublicPlatform,
} from '~~/shared/marketing'

/**
 * Consent-aware browser pixels. No provider script is injected until the
 * visitor has explicitly granted marketing consent. The component also exposes
 * a small `window.__amirMarketing` bridge consumed by useMetaEvents().
 *
 * The bridge deduplicates events by stable event ID so browser and server
 * conversions (and repeated success-page renders) are not counted twice.
 */
const props = defineProps<{
  platforms: Record<string, MarketingPublicPlatform>
}>()

const { hasMarketingConsent } = useCookieConsent()
const route = useRoute()

let initialized = false
let lastPath = ''
let bridgeInstalled = false

type BrowserEventName = Extract<MarketingEventName, 'PageView' | 'ViewService' | 'ViewProduct' | 'BookingStarted' | 'DepositPaid'>

interface BrowserPayload {
  value?: number
  currency?: string
  content_name?: string
  content_category?: string
  content_ids?: string[]
  content_type?: string
  path?: string
}

function injectScript(src: string, id: string) {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

function initMeta(platform: MarketingPublicPlatform) {
  const w = window as any
  if (typeof w.fbq !== 'function') {
    w.fbq = function () {
      if (w.fbq.callMethod) w.fbq.callMethod.apply(w.fbq, arguments)
      else w.fbq.queue.push(arguments)
    }
    if (!w._fbq) w._fbq = w.fbq
    w.fbq.push = w.fbq
    w.fbq.loaded = true
    w.fbq.version = '2.0'
    w.fbq.queue = []
  }
  injectScript('https://connect.facebook.net/en_US/fbevents.js', 'amir-meta-pixel')
  try { w.fbq('consent', 'grant') } catch {}
  w.fbq('init', platform.id)
  if (platform.events.PageView) w.fbq('track', 'PageView')
}

function initTikTok(platform: MarketingPublicPlatform) {
  const w = window as any
  const methods = [
    'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready',
    'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent',
  ]
  w.TikTokAnalyticsObject = 'ttq'
  if (!w.ttq) {
    w.ttq = function () {
      (w.ttq.queue = w.ttq.queue || []).push(arguments)
    }
  }
  if (!w.ttq.methods) {
    w.ttq.methods = methods
    w.ttq.setAndDefer = function (target: any, method: string) {
      target[method] = function () {
        target.push([method].concat(Array.prototype.slice.call(arguments, 0)))
      }
    }
    for (const method of methods) w.ttq.setAndDefer(w.ttq, method)
  }
  injectScript('https://analytics.tiktok.com/i18n/pixel/events.js', 'amir-tiktok-pixel')
  try { w.ttq.grantConsent?.() } catch {}
  w.ttq.load(platform.id)
  if (platform.events.PageView) w.ttq.page()
}

function initSnapchat(platform: MarketingPublicPlatform) {
  const w = window as any
  if (!w.snaptr) {
    w.snaptr = function () {
      (w.snaptr.q = w.snaptr.q || []).push(arguments)
    }
  }
  injectScript('https://sc-static.net/scevent.min.js', 'amir-snap-pixel')
  w.snaptr('init', platform.id)
  if (platform.events.PageView) w.snaptr('track', 'PAGE_VIEW')
}

function initPinterest(platform: MarketingPublicPlatform) {
  const w = window as any
  if (!w.pintrk) {
    w.pintrk = function () {
      (w.pintrk.queue = w.pintrk.queue || []).push(arguments)
    }
  }
  injectScript('https://s.pinimg.com/ct/core.js', 'amir-pinterest-tag')
  w.pintrk('load', platform.id)
  if (platform.events.PageView) w.pintrk('page')
}

function initGoogle(platform: MarketingPublicPlatform) {
  const w = window as any
  w.dataLayer = w.dataLayer || []
  if (!w.gtag) {
    w.gtag = function () {
      w.dataLayer.push(arguments)
    }
  }
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(platform.id)}`, 'amir-google-tag')
  w.gtag('js', new Date())
  // Page views are intentionally not sent: this integration exists only for
  // the server-verified deposit conversion.
  w.gtag('config', platform.id, { send_page_view: false })
}

function initAll() {
  if (!import.meta.client || !hasMarketingConsent.value || initialized) return
  initialized = true
  for (const platform of Object.values(props.platforms || {})) {
    if (!platform?.id) continue
    try {
      if (platform.id === 'meta') initMeta(platform)
      else if (platform.id === 'tiktok') initTikTok(platform)
      else if (platform.id === 'snapchat') initSnapchat(platform)
      else if (platform.id === 'pinterest') initPinterest(platform)
      else if (platform.id === 'google') initGoogle(platform)
    }
    catch {
      // One provider must never prevent the others from initializing.
    }
  }
}

function cleanPayload(payload: BrowserPayload) {
  const out: Record<string, unknown> = {}
  if (typeof payload.value === 'number' && Number.isFinite(payload.value)) out.value = payload.value
  if (payload.currency) out.currency = payload.currency
  if (payload.content_name) out.content_name = payload.content_name
  if (payload.content_category) out.content_category = payload.content_category
  if (payload.content_ids?.length) out.content_ids = payload.content_ids
  if (payload.content_type) out.content_type = payload.content_type
  return out
}

function send(
  platform: MarketingPublicPlatform,
  mappedName: string,
  eventName: BrowserEventName,
  payload: BrowserPayload,
  eventId?: string,
) {
  const w = window as any
  const data = cleanPayload(payload)

  if (platform.id === 'meta' && typeof w.fbq === 'function') {
    if (eventId) w.fbq('track', mappedName, data, { eventID: eventId })
    else w.fbq('track', mappedName, data)
    return
  }

  if (platform.id === 'tiktok' && typeof w.ttq?.track === 'function') {
    const props: Record<string, unknown> = { ...data }
    if (Array.isArray(data.content_ids) && data.content_ids.length) {
      props.content_id = data.content_ids[0]
      delete props.content_ids
    }
    if (eventId) w.ttq.track(mappedName, props, { event_id: eventId })
    else w.ttq.track(mappedName, props)
    return
  }

  if (platform.id === 'snapchat' && typeof w.snaptr === 'function') {
    const snap: Record<string, unknown> = {}
    if (typeof data.value === 'number') snap.price = data.value
    if (data.currency) snap.currency = data.currency
    if (data.content_name) snap.description = data.content_name
    if (data.content_category) snap.item_category = data.content_category
    if (Array.isArray(data.content_ids)) snap.item_ids = data.content_ids
    if (eventId) snap.client_dedup_id = eventId
    w.snaptr('track', mappedName, snap)
    return
  }

  if (platform.id === 'pinterest' && typeof w.pintrk === 'function') {
    const pin: Record<string, unknown> = { ...data }
    if (eventId) pin.event_id = eventId
    w.pintrk('track', mappedName, pin)
    return
  }

  if (platform.id === 'google' && typeof w.gtag === 'function') {
    // Google Ads tag reports one verified conversion only. Standard GA4 event
    // names are not used because an AW- tag does not prove GA4 is configured.
    if (eventName !== 'DepositPaid' || mappedName !== 'conversion') return
    const label = platform.options?.conversionLabel
    if (!label) return
    const conversion: Record<string, unknown> = { send_to: `${platform.id}/${label}` }
    if (typeof data.value === 'number') conversion.value = data.value
    if (data.currency) conversion.currency = data.currency
    if (eventId) conversion.transaction_id = eventId
    w.gtag('event', 'conversion', conversion)
  }
}

function dispatch(eventName: BrowserEventName, payload: BrowserPayload = {}, eventId?: string) {
  if (!import.meta.client || !hasMarketingConsent.value) return

  if (eventId) {
    try {
      const key = `amir_marketing_event_${eventId}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    }
    catch {
      // Storage can be unavailable (private mode); still deliver the event.
    }
  }

  for (const platform of Object.values(props.platforms || {})) {
    if (!platform?.id || !platform.events?.[eventName]) continue
    const provider = getMarketingProvider(platform.id)
    const mappedName = provider?.eventMap[eventName]
    if (!mappedName) continue
    try {
      send(platform, mappedName, eventName, payload, eventId)
    }
    catch {
      // Isolate provider failures from each other and from page rendering.
    }
  }
}

function installBridge() {
  if (!import.meta.client || bridgeInstalled) return
  bridgeInstalled = true
  const w = window as any
  w.__amirMarketing = {
    track: (eventName: BrowserEventName, payload: BrowserPayload, eventId?: string) => {
      dispatch(eventName, payload, eventId)
    },
  }
  const queued = Array.isArray(w.__amirMarketingQueue) ? w.__amirMarketingQueue.splice(0) : []
  for (const entry of queued) {
    if (!entry || typeof entry.eventName !== 'string') continue
    dispatch(entry.eventName, entry.payload || {}, entry.eventId)
  }
}

function teardown() {
  if (!import.meta.client) return
  // Keep loaded globals so consent can be granted again in the same session.
  // No event is sent while consent is absent because dispatch() gates every
  // call and useMetaEvents() refuses to queue events without consent.
  initialized = false
  const w = window as any
  try { w.fbq?.('consent', 'revoke') } catch {}
  try { w.ttq?.revokeConsent?.() } catch {}
}

onMounted(() => {
  lastPath = route.fullPath
  // Initialize providers before draining events queued by page components.
  initAll()
  installBridge()

  window.addEventListener('amir:marketing-consent-granted', () => {
    initAll()
  })
})

watch(hasMarketingConsent, (consent) => {
  if (consent) initAll()
  else teardown()
})

watch(() => props.platforms, () => {
  if (hasMarketingConsent.value && !initialized) initAll()
}, { deep: true })

watch(() => route.fullPath, (path) => {
  if (!import.meta.client || !hasMarketingConsent.value) return
  if (path === lastPath) return
  lastPath = path
  dispatch('PageView', { path })
})
</script>

<template>
  <div style="display: none" aria-hidden="true" />
</template>
