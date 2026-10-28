// AUDIT P3-02/P3-07: robots.txt is generated at request time so the sitemap
// URL always follows NUXT_PUBLIC_SITE_URL instead of a hardcoded host.
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const configured = String(config.public.siteUrl || '').trim().replace(/\/+$/, '')
  const origin = configured || getRequestURL(event).origin
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return [
    'User-Agent: *',
    'Disallow:',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /dev/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
})
