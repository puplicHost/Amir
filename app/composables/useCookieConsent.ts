export const CONSENT_COOKIE_NAME = 'amir_cookie_consent'
export const CONSENT_POLICY_VERSION = 1
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180 // 180 days (~6 months)

export interface StoredConsent {
  v: number
  necessary: boolean
  marketing: boolean
  decided: boolean
  ts: string
}

export function useCookieConsent() {
  const cookie = useCookie<StoredConsent | null>(CONSENT_COOKIE_NAME, {
    maxAge: CONSENT_COOKIE_MAX_AGE,
    sameSite: 'lax',
    path: '/',
    default: () => null,
  })

  const bannerOpen = useState<boolean>('cookie-banner-open', () => false)
  const settingsModalOpen = useState<boolean>('cookie-settings-modal-open', () => false)

  const isDecided = computed(() => {
    return Boolean(cookie.value && cookie.value.v === CONSENT_POLICY_VERSION && cookie.value.decided)
  })

  const hasMarketingConsent = computed(() => {
    return Boolean(isDecided.value && cookie.value?.marketing)
  })

  function removeMetaCookies() {
    if (import.meta.client) {
      const domains = [window.location.hostname, `.${window.location.hostname}`]
      const cookieNames = ['_fbp', '_fbc']
      for (const name of cookieNames) {
        for (const domain of domains) {
          document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`
        }
        document.cookie = `${name}=; Max-Age=0; path=/`
      }
    }
  }

  function setConsent(marketing: boolean) {
    cookie.value = {
      v: CONSENT_POLICY_VERSION,
      necessary: true,
      marketing,
      decided: true,
      ts: new Date().toISOString(),
    }
    bannerOpen.value = false
    settingsModalOpen.value = false

    if (!marketing) {
      removeMetaCookies()
      if (import.meta.client) {
        const w = window as any
        if (w.fbq) {
          try {
            w.fbq('consent', 'revoke')
          }
          catch {}
          delete w.fbq
          delete w._fbq
        }
      }
    }
    else if (import.meta.client) {
      // Trigger pixel init on client if enabled
      window.dispatchEvent(new CustomEvent('amir:marketing-consent-granted'))
    }
  }

  function acceptAll() {
    setConsent(true)
  }

  function rejectAll() {
    setConsent(false)
  }

  function openBanner() {
    settingsModalOpen.value = false
    bannerOpen.value = true
  }

  function openSettings() {
    settingsModalOpen.value = true
  }

  function closeSettings() {
    settingsModalOpen.value = false
  }

  function getMetaCookie(name: '_fbp' | '_fbc'): string | null {
    if (!hasMarketingConsent.value || !import.meta.client) return null
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`))
    return match ? decodeURIComponent(match[2] || '') : null
  }

  return {
    cookie,
    bannerOpen,
    settingsModalOpen,
    isDecided,
    hasMarketingConsent,
    acceptAll,
    rejectAll,
    setConsent,
    openBanner,
    openSettings,
    closeSettings,
    removeMetaCookies,
    getMetaCookie,
  }
}
