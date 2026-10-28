/**
 * AUDIT P3-02: canonical public origin for share links, JSON-LD and the
 * sitemap. Configured via NUXT_PUBLIC_SITE_URL; falls back to the current
 * request origin so local/staging deployments never emit a hardcoded host.
 */
export function useSiteUrl(): string {
  const config = useRuntimeConfig()
  const configured = String(config.public.siteUrl || '').trim().replace(/\/+$/, '')
  if (configured) return configured
  try {
    return useRequestURL().origin.replace(/\/+$/, '')
  }
  catch {
    return ''
  }
}

/** Join a site-relative path onto the canonical origin. */
export function useAbsoluteUrl(path: string): string {
  const base = useSiteUrl()
  if (!base) return path
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
