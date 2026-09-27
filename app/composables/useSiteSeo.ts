/**
 * Site-wide SEO/GEO fallback settings (public, cached).
 * Rule: page-specific SEO data always wins; these templates/descriptions
 * apply only when a page has no specific data of its own.
 */
export async function useSiteSeo() {
  const { data } = await useAsyncData('site-seo', () =>
    $fetch<{
      titleTemplateAr: string | null
      titleTemplateEn: string | null
      descriptionAr: string | null
      descriptionEn: string | null
      keywords: string | null
      geoDescription: string | null
    }>('/api/settings/seo-public'),
  )
  return data
}

/** Apply a `{page}` title template, falling back when the template is empty. */
export function applySeoTitle(template: string | null | undefined, pageName: string, fallback: string): string {
  const t = (template || '').trim()
  if (!t) return fallback
  return t.includes('{page}') ? t.replace('{page}', pageName) : t
}
