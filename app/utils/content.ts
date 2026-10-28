/**
 * AUDIT P2-11: catalog content fallback policy.
 *
 * The salon runs German + English. Products/categories historically stored
 * `nameAr`/`nameEn` only, so the German UI silently rendered English copy.
 * Optional `nameDe`/`descriptionDe` fields now exist; when they are empty the
 * German UI falls back to English, and English falls back to German. Arabic is
 * not a configured locale (kept only so legacy data stays readable).
 */

export interface LocalizedContent {
  de?: string | null
  en?: string | null
  ar?: string | null
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Pick the best available text for a locale.
 * Order: requested locale → English → German → Arabic → fallback.
 */
export function localizedText(
  locale: string | undefined | null,
  value: LocalizedContent,
  fallback = '',
): string {
  const de = clean(value.de)
  const en = clean(value.en)
  const ar = clean(value.ar)

  if (locale === 'ar') return ar || en || de || fallback
  if (locale === 'de') return de || en || ar || fallback
  return en || de || ar || fallback
}
