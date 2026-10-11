/**
 * Browser-side Meta Pixel event dispatchers (Phase 2f).
 * All calls are strict no-ops unless marketing consent is explicitly granted
 * AND the integration is enabled with a Pixel ID.
 * Deduplicates Purchase via sessionStorage using event_id.
 */
export function useMetaEvents() {
  const { hasMarketingConsent } = useCookieConsent()

  function isReady(): boolean {
    if (!import.meta.client || !hasMarketingConsent.value) return false
    return typeof (window as any).fbq === 'function'
  }

  function trackViewContent(payload?: {
    content_name?: string
    content_category?: string
    value?: number
    currency?: string
  }) {
    if (!isReady()) return
    try {
      (window as any).fbq('track', 'ViewContent', payload || {})
    }
    catch {}
  }

  function trackInitiateCheckout(payload?: {
    value?: number
    currency?: string
  }) {
    if (!isReady()) return
    try {
      (window as any).fbq('track', 'InitiateCheckout', payload || {})
    }
    catch {}
  }

  function trackPurchase(eventId: string, value: number, currency: string) {
    if (!isReady()) return
    if (typeof sessionStorage !== 'undefined') {
      const key = `amir_meta_purchase_${eventId}`
      if (sessionStorage.getItem(key)) return // deduplicate reloading
      sessionStorage.setItem(key, '1')
    }
    try {
      (window as any).fbq('track', 'Purchase', {
        value,
        currency,
      }, { eventID: eventId })
    }
    catch {}
  }

  return {
    trackViewContent,
    trackInitiateCheckout,
    trackPurchase,
  }
}
