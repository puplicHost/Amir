// Dynamically generated XML sitemap: static pages + active categories
// and published products.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const origin = getRequestURL(event).origin
  const base = (config.public.siteUrl as string) || origin

  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const iso = (d: Date) => d.toISOString().split('T')[0]
  const today = iso(new Date())

  const statics: { loc: string, changefreq: string, priority: string }[] = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/products', changefreq: 'daily', priority: '0.9' },
    { loc: '/services', changefreq: 'weekly', priority: '0.8' },
    { loc: '/about', changefreq: 'monthly', priority: '0.7' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.7' },
    // AUDIT P3-07: legal pages are public and belong in the sitemap. Guest
    // booking/token flows are intentionally excluded (not indexable content).
    { loc: '/impressum', changefreq: 'yearly', priority: '0.3' },
    { loc: '/datenschutz', changefreq: 'yearly', priority: '0.3' },
    { loc: '/agb', changefreq: 'yearly', priority: '0.3' },
    { loc: '/stornierung', changefreq: 'yearly', priority: '0.3' },
  ]

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { products: { some: { isActive: true } } },
      select: { slug: true, updatedAt: true },
      take: 5000,
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      take: 5000,
    }),
  ])

  const urls: string[] = []
  for (const s of statics) {
    urls.push(`  <url><loc>${esc(base + s.loc)}</loc><lastmod>${today}</lastmod><changefreq>${s.changefreq}</changefreq><priority>${s.priority}</priority></url>`)
  }
  for (const c of categories) {
    urls.push(`  <url><loc>${esc(`${base}/products/${c.slug}`)}</loc><lastmod>${iso(c.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
  }
  for (const p of products) {
    urls.push(`  <url><loc>${esc(`${base}/p/${p.slug}`)}</loc><lastmod>${iso(p.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`)
  }

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
})
