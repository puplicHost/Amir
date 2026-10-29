/**
 * Shared marketing integration metadata. Safe to import in the admin UI:
 * contains no secrets and no provider credentials.
 *
 * Providers declare their own required fields, secret fields, delivery modes,
 * supported events and event-name mappings. Adding a platform means adding a
 * definition here plus an adapter in server/utils/marketing/adapters.ts.
 */

export const MARKETING_PLATFORMS = ['meta', 'google', 'tiktok', 'snapchat', 'pinterest'] as const
export type MarketingPlatform = (typeof MARKETING_PLATFORMS)[number]

export const MARKETING_EVENTS = [
  'PageView',
  'ViewService',
  'ViewProduct',
  'BookingStarted',
  'BookingConfirmed',
  'DepositPaid',
  'BookingCancelled',
] as const
export type MarketingEventName = (typeof MARKETING_EVENTS)[number]

export interface MarketingEventDefinition {
  key: MarketingEventName
  labelEn: string
  labelDe: string
  descriptionEn: string
  descriptionDe: string
  browser: boolean
  server: boolean
}

export const MARKETING_EVENT_DEFINITIONS: MarketingEventDefinition[] = [
  { key: 'PageView', labelEn: 'Page view', labelDe: 'Seitenaufruf', descriptionEn: 'Public page navigation.', descriptionDe: 'Öffentliche Seitennavigation.', browser: true, server: false },
  { key: 'ViewService', labelEn: 'View service', labelDe: 'Leistung ansehen', descriptionEn: 'A service page is viewed.', descriptionDe: 'Eine Leistungsseite wird angesehen.', browser: true, server: false },
  { key: 'ViewProduct', labelEn: 'View product', labelDe: 'Produkt ansehen', descriptionEn: 'A product page is viewed.', descriptionDe: 'Eine Produktseite wird angesehen.', browser: true, server: false },
  { key: 'BookingStarted', labelEn: 'Booking started', labelDe: 'Buchung begonnen', descriptionEn: 'A customer begins checkout for a booking.', descriptionDe: 'Ein Kunde beginnt den Buchungs-Checkout.', browser: true, server: false },
  { key: 'BookingConfirmed', labelEn: 'Booking confirmed', labelDe: 'Buchung bestätigt', descriptionEn: 'Server-side confirmed booking (no payment value).', descriptionDe: 'Serverseitig bestätigte Buchung (ohne Zahlungswert).', browser: false, server: true },
  { key: 'DepositPaid', labelEn: 'Deposit paid', labelDe: 'Anzahlung bezahlt', descriptionEn: 'Server-verified successful deposit payment.', descriptionDe: 'Serverseitig bestätigte erfolgreiche Anzahlung.', browser: true, server: true },
  { key: 'BookingCancelled', labelEn: 'Booking cancelled', labelDe: 'Buchung storniert', descriptionEn: 'Booking cancelled; never counted as a successful conversion by default.', descriptionDe: 'Buchung storniert; standardmäßig nicht als erfolgreiche Conversion gezählt.', browser: false, server: true },
]

export type MarketingFieldType = 'text' | 'password'

export interface MarketingFieldDefinition {
  key: string
  labelEn: string
  labelDe: string
  type: MarketingFieldType
  required?: boolean
  secret?: boolean
  placeholder?: string
  helpEn?: string
  helpDe?: string
}

export interface MarketingProviderDefinition {
  id: MarketingPlatform
  name: string
  docsUrl: string
  descriptionEn: string
  descriptionDe: string
  fields: MarketingFieldDefinition[]
  delivery: { browser: boolean; server: boolean }
  /** A real external verification is available. Others validate config only. */
  testConnection: boolean
  testNoteEn?: string
  testNoteDe?: string
  eventMap: Record<MarketingEventName, string | null>
  defaultEvents: MarketingEventName[]
}

const meta: MarketingProviderDefinition = {
  id: 'meta',
  name: 'Meta Ads',
  docsUrl: 'https://developers.facebook.com/docs/marketing-api/conversions-api/',
  descriptionEn: 'Facebook and Instagram Pixel plus Conversions API.',
  descriptionDe: 'Facebook- und Instagram-Pixel sowie Conversions API.',
  delivery: { browser: true, server: true },
  testConnection: true,
  fields: [
    { key: 'pixelId', labelEn: 'Pixel ID', labelDe: 'Pixel-ID', type: 'text', required: true, placeholder: '123456789012345', helpEn: 'Events Manager → Data sources → your Pixel.', helpDe: 'Events Manager → Datenquellen → Ihr Pixel.' },
    { key: 'accessToken', labelEn: 'Conversions API access token', labelDe: 'Conversions-API-Zugriffstoken', type: 'password', secret: true, helpEn: 'Events Manager → Settings → Conversions API. Encrypted at rest.', helpDe: 'Events Manager → Einstellungen → Conversions API. Wird verschlüsselt gespeichert.' },
    { key: 'testEventCode', labelEn: 'Test Event Code (optional)', labelDe: 'Test-Event-Code (optional)', type: 'text', placeholder: 'TEST12345', helpEn: 'Testing only. In production, server events are suppressed while this is set unless META_CAPI_ALLOW_TEST_EVENTS=true.', helpDe: 'Nur zum Testen. In Produktion werden Server-Events pausiert, solange dieser Code gesetzt ist, es sei denn META_CAPI_ALLOW_TEST_EVENTS=true.' },
  ],
  eventMap: {
    PageView: 'PageView',
    ViewService: 'ViewContent',
    ViewProduct: 'ViewContent',
    BookingStarted: 'InitiateCheckout',
    BookingConfirmed: 'Schedule',
    DepositPaid: 'Purchase',
    BookingCancelled: 'BookingCancelled',
  },
  defaultEvents: ['PageView', 'ViewService', 'ViewProduct', 'BookingStarted', 'DepositPaid'],
}

const google: MarketingProviderDefinition = {
  id: 'google',
  name: 'Google Ads',
  docsUrl: 'https://support.google.com/google-ads/answer/6095821',
  descriptionEn: 'Google Ads conversion tag for the verified deposit. Server-side upload requires OAuth, a developer token, customer/conversion IDs and click IDs — not enabled here.',
  descriptionDe: 'Google-Ads-Conversion-Tag für die bestätigte Anzahlung. Serverseitiger Upload benötigt OAuth, Developer-Token, Kunden-/Conversion-IDs und Klick-IDs — hier nicht aktiviert.',
  delivery: { browser: true, server: false },
  testConnection: false,
  testNoteEn: 'Configuration is validated locally. Google Ads does not expose a safe connection test for tag IDs, and no conversion is sent.',
  testNoteDe: 'Die Konfiguration wird lokal geprüft. Google Ads bietet keinen sicheren Verbindungstest für Tag-IDs, und es wird keine Conversion gesendet.',
  fields: [
    { key: 'conversionId', labelEn: 'Conversion ID', labelDe: 'Conversion-ID', type: 'text', required: true, placeholder: 'AW-123456789', helpEn: 'Google Ads → Goals → Conversions → Tag setup. Public tag ID, safe for the browser.', helpDe: 'Google Ads → Ziele → Conversions → Tag-Einrichtung. Öffentliche Tag-ID, sicher für den Browser.' },
    { key: 'conversionLabel', labelEn: 'Conversion label', labelDe: 'Conversion-Label', type: 'text', required: true, placeholder: 'AbCdEfGhIj', helpEn: 'The label of the deposit conversion action. Required to report a conversion.', helpDe: 'Das Label der Anzahlungs-Conversion. Erforderlich, um eine Conversion zu melden.' },
  ],
  eventMap: {
    PageView: null,
    ViewService: null,
    ViewProduct: null,
    BookingStarted: null,
    BookingConfirmed: null,
    DepositPaid: 'conversion',
    BookingCancelled: null,
  },
  defaultEvents: ['DepositPaid'],
}

const tiktok: MarketingProviderDefinition = {
  id: 'tiktok',
  name: 'TikTok Ads',
  docsUrl: 'https://business-api.tiktok.com/portal/docs?id=1771101186666498',
  descriptionEn: 'TikTok Pixel plus Events API 1.3.',
  descriptionDe: 'TikTok-Pixel sowie Events API 1.3.',
  delivery: { browser: true, server: true },
  testConnection: false,
  testNoteEn: 'Configuration is validated locally. A live TikTok event test requires a test event code from TikTok.',
  testNoteDe: 'Die Konfiguration wird lokal geprüft. Ein Live-Test erfordert einen Test-Event-Code von TikTok.',
  fields: [
    { key: 'pixelId', labelEn: 'Pixel ID', labelDe: 'Pixel-ID', type: 'text', required: true, helpEn: 'TikTok Ads Manager → Assets → Events → Pixel.', helpDe: 'TikTok Ads Manager → Assets → Events → Pixel.' },
    { key: 'accessToken', labelEn: 'Events API access token', labelDe: 'Events-API-Zugriffstoken', type: 'password', secret: true, helpEn: 'TikTok Events API credentials. Encrypted at rest.', helpDe: 'TikTok Events-API-Zugangsdaten. Wird verschlüsselt gespeichert.' },
  ],
  eventMap: {
    PageView: 'Pageview',
    ViewService: 'ViewContent',
    ViewProduct: 'ViewContent',
    BookingStarted: 'InitiateCheckout',
    BookingConfirmed: 'SubmitForm',
    DepositPaid: 'CompletePayment',
    BookingCancelled: null,
  },
  defaultEvents: ['PageView', 'ViewService', 'ViewProduct', 'BookingStarted', 'DepositPaid'],
}

const snapchat: MarketingProviderDefinition = {
  id: 'snapchat',
  name: 'Snapchat Ads',
  docsUrl: 'https://businesshelp.snapchat.com/s/article/conversion-api',
  descriptionEn: 'Snap Pixel plus Conversions API.',
  descriptionDe: 'Snap-Pixel sowie Conversions API.',
  delivery: { browser: true, server: true },
  testConnection: false,
  testNoteEn: 'Configuration is validated locally. Snapchat does not expose a safe test call for this setup.',
  testNoteDe: 'Die Konfiguration wird lokal geprüft. Snapchat bietet für diese Einrichtung keinen sicheren Testaufruf.',
  fields: [
    { key: 'pixelId', labelEn: 'Snap Pixel ID', labelDe: 'Snap-Pixel-ID', type: 'text', required: true, helpEn: 'Snapchat Ads Manager → Events Manager.', helpDe: 'Snapchat Ads Manager → Events Manager.' },
    { key: 'accessToken', labelEn: 'Conversions API token', labelDe: 'Conversions-API-Token', type: 'password', secret: true, helpEn: 'Snapchat Conversions API token. Encrypted at rest.', helpDe: 'Snapchat Conversions-API-Token. Wird verschlüsselt gespeichert.' },
  ],
  eventMap: {
    PageView: 'PAGE_VIEW',
    ViewService: 'VIEW_CONTENT',
    ViewProduct: 'VIEW_CONTENT',
    BookingStarted: 'START_CHECKOUT',
    BookingConfirmed: null,
    DepositPaid: 'PURCHASE',
    BookingCancelled: null,
  },
  defaultEvents: ['PageView', 'ViewService', 'ViewProduct', 'BookingStarted', 'DepositPaid'],
}

const pinterest: MarketingProviderDefinition = {
  id: 'pinterest',
  name: 'Pinterest Ads',
  docsUrl: 'https://developers.pinterest.com/docs/api/v5/conversions/',
  descriptionEn: 'Pinterest Tag plus Conversions API.',
  descriptionDe: 'Pinterest-Tag sowie Conversions API.',
  delivery: { browser: true, server: true },
  testConnection: false,
  testNoteEn: 'Configuration is validated locally. Pinterest does not expose a safe test call for this setup.',
  testNoteDe: 'Die Konfiguration wird lokal geprüft. Pinterest bietet für diese Einrichtung keinen sicheren Testaufruf.',
  fields: [
    { key: 'tagId', labelEn: 'Tag ID', labelDe: 'Tag-ID', type: 'text', required: true, helpEn: 'Pinterest Ads → Conversions → Tag manager.', helpDe: 'Pinterest Ads → Conversions → Tag-Manager.' },
    { key: 'adAccountId', labelEn: 'Ad account ID', labelDe: 'Werbekonto-ID', type: 'text', required: true, helpEn: 'Pinterest Ads → Ad account settings.', helpDe: 'Pinterest Ads → Einstellungen des Werbekontos.' },
    { key: 'accessToken', labelEn: 'Conversions API token', labelDe: 'Conversions-API-Token', type: 'password', secret: true, helpEn: 'Pinterest Conversions API token. Encrypted at rest.', helpDe: 'Pinterest Conversions-API-Token. Wird verschlüsselt gespeichert.' },
  ],
  eventMap: {
    PageView: 'page_visit',
    ViewService: 'view_category',
    ViewProduct: 'view_category',
    BookingStarted: 'add_to_cart',
    BookingConfirmed: 'signup',
    DepositPaid: 'checkout',
    BookingCancelled: null,
  },
  defaultEvents: ['PageView', 'ViewService', 'ViewProduct', 'BookingStarted', 'DepositPaid'],
}

export const MARKETING_PROVIDERS: MarketingProviderDefinition[] = [meta, google, tiktok, snapchat, pinterest]

export function getMarketingProvider(id: string): MarketingProviderDefinition | undefined {
  return MARKETING_PROVIDERS.find(p => p.id === id)
}

/** Browser-safe provider configuration returned by /api/marketing/public-config. */
export interface MarketingPublicPlatform {
  id: string
  events: Record<string, boolean>
  options?: Record<string, string>
}

export type MarketingPublicConfig = Record<string, MarketingPublicPlatform>

export function providerSupportedEvents(provider: MarketingProviderDefinition): MarketingEventName[] {
  return MARKETING_EVENTS.filter(e => provider.eventMap[e] !== null)
}

export function defaultEventConfig(provider: MarketingProviderDefinition): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const e of MARKETING_EVENTS) out[e] = provider.defaultEvents.includes(e)
  return out
}

/**
 * Provider-specific format validation shared by server save/read paths and
 * unit tests. Empty values are invalid; optional fields are handled by callers.
 */
export function isValidMarketingFieldValue(platform: string, key: string, value: string): boolean {
  if (!value) return false
  if (platform === 'meta' && key === 'pixelId') return /^\d{5,30}$/.test(value)
  if (platform === 'google' && key === 'conversionId') return /^AW-\d{5,20}$/.test(value)
  if (platform === 'pinterest' && key === 'adAccountId') return /^\d{5,30}$/.test(value)
  return true
}
