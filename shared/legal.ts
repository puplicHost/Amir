/**
 * AUDIT P1-01: legal document versions and template metadata.
 *
 * These are deliberately TEMPLATES. They must be reviewed by qualified German
 * counsel and completed with real provider data before publication. Never flip
 * `legalReviewed` to true in code: it is environment-driven and must only be
 * enabled after sign-off.
 */

export const LEGAL_TERMS_VERSION = '2026-10-28'
export const LEGAL_PRIVACY_VERSION = '2026-10-28'
export const LEGAL_MARKETING_VERSION = '2026-10-28'

export const LEGAL_DOCUMENTS = [
  { key: 'impressum', path: '/impressum' },
  { key: 'datenschutz', path: '/datenschutz' },
  { key: 'agb', path: '/agb' },
  { key: 'stornierung', path: '/stornierung' },
] as const

export interface PublicLegalConfig {
  legalReviewed?: boolean | string
  legalVersion?: string
  legalProviderName?: string
  legalLegalForm?: string
  legalRepresentative?: string
  legalStreet?: string
  legalAddressLine2?: string
  legalPostalCode?: string
  legalCity?: string
  legalCountry?: string
  legalEmail?: string
  legalPhone?: string
  legalRegisterCourt?: string
  legalRegisterNumber?: string
  legalVatId?: string
  legalSupervisoryAuthority?: string
  legalPrivacyEmail?: string
  legalHostingProvider?: string
  legalDataProtectionOfficer?: string
  legalCancellationDeadlineHours?: string
  legalCancellationFeePercent?: string
  legalNoShowFeePercent?: string
}

export function legalValue(value: unknown, fallback = ''): string {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}

/** Required for a publishable Impressum under DDG § 5. */
export function missingImpressumFields(c: PublicLegalConfig): string[] {
  const required: Array<[keyof PublicLegalConfig, string]> = [
    ['legalProviderName', 'Anbietername / Firma'],
    ['legalRepresentative', 'Vertretungsberechtigte Person'],
    ['legalStreet', 'Straße und Hausnummer'],
    ['legalPostalCode', 'Postleitzahl'],
    ['legalCity', 'Ort'],
    ['legalEmail', 'E-Mail-Adresse'],
  ]
  return required.filter(([key]) => !legalValue(c[key])).map(([, label]) => label)
}

/** Required for a complete Art. 13/14 privacy notice in this template. */
export function missingPrivacyFields(c: PublicLegalConfig): string[] {
  const required: Array<[keyof PublicLegalConfig, string]> = [
    ['legalProviderName', 'Verantwortlicher'],
    ['legalStreet', 'Anschrift'],
    ['legalPostalCode', 'Postleitzahl'],
    ['legalCity', 'Ort'],
    ['legalPrivacyEmail', 'Datenschutz-Kontakt'],
    ['legalHostingProvider', 'Hosting-Anbieter'],
  ]
  return required.filter(([key]) => !legalValue(c[key])).map(([, label]) => label)
}

export function isLegalReviewed(c: PublicLegalConfig): boolean {
  return c.legalReviewed === true || c.legalReviewed === 'true'
}
