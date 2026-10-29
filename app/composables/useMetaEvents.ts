/**
 * Browser-side normalized marketing events.
 *
 * The actual provider pixels are loaded by AppMarketingPixels only after
 * explicit marketing consent. This composable is a thin, consent-gated bridge:
 * every call is a no-op without consent, and events that arrive before the
 * pixel bridge is mounted are queued briefly until it initializes.
 *
 * Deduplication uses a stable event ID (shared with server-side conversions)
 * inside AppMarketingPixels, so refreshing a success page or calling a legacy
 * helper twice does not create a second conversion.
 */

export interface MarketingBrowserPayload {
  value?: number
  currency?: string
  content_name?: string
  content_category?: string
  content_ids?: string[]
  content_type?: string
  path?: string
}

type MarketingBrowserEvent =
  | 'PageView'
  | 'ViewService'
  | 'ViewProduct'
  | 'BookingStarted'
  | 'DepositPaid'

interface QueuedMarketingEvent {
  eventName: MarketingBrowserEvent
  payload: MarketingBrowserPayload
  eventId?: string
}

interface MarketingBridge {
  track: (eventName: MarketingBrowserEvent, payload: MarketingBrowserPayload, eventId?: string) => void
}

export function useMetaEvents() {
  const { hasMarketingConsent } = useCookieConsent()

  function push(eventName: MarketingBrowserEvent, payload: MarketingBrowserPayload = {}, eventId?: string) {
    if (!import.meta.client || !hasMarketingConsent.value) return
    const w = window as any
    const bridge = w.__amirMarketing as MarketingBridge | undefined
    if (bridge && typeof bridge.track === 'function') {
      bridge.track(eventName, payload, eventId)
      return
    }
    const queue: QueuedMarketingEvent[] = Array.isArray(w.__amirMarketingQueue)
      ? w.__amirMarketingQueue
      : (w.__amirMarketingQueue = [])
    queue.push({ eventName, payload, eventId })
  }

  /** Service / catalog view (Meta ViewContent, TikTok ViewContent, …). */
  function trackViewContent(payload?: MarketingBrowserPayload) {
    push('ViewService', payload || {})
  }

  /** Product detail view. */
  function trackViewProduct(payload?: MarketingBrowserPayload, eventId?: string) {
    push('ViewProduct', payload || {}, eventId)
  }

  /**
   * A customer has genuinely begun a booking (slot selected / checkout
   * clicked). Pass a stable event ID so both entry points collapse into one.
   */
  function trackBookingStarted(payload?: MarketingBrowserPayload, eventId?: string) {
    push('BookingStarted', payload || {}, eventId)
  }

  /** Legacy name kept for existing booking pages; maps to BookingStarted. */
  function trackInitiateCheckout(payload?: MarketingBrowserPayload, eventId?: string) {
    push('BookingStarted', payload || {}, eventId)
  }

  /**
   * DepositPaid may only be called after the server reports PAID. The event ID
   * `purchase-<bookingId>` is shared with the server-side dispatcher.
   */
  function trackPurchase(eventId: string, value: number, currency: string) {
    push('DepositPaid', { value, currency }, eventId)
  }

  function trackPageView(path?: string) {
    push('PageView', { path: path || (import.meta.client ? window.location.pathname : undefined) })
  }

  return {
    trackViewContent,
    trackViewProduct,
    trackBookingStarted,
    trackInitiateCheckout,
    trackPurchase,
    trackPageView,
  }
}
