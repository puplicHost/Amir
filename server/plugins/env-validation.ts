// AUDIT P3-14: fail fast at boot instead of surfacing misconfiguration as a
// 500 on the first login/payment. Development only warns.
export default defineNitroPlugin(() => {
  const production = process.env.NODE_ENV === 'production'
  const problems: string[] = []
  const warnings: string[] = []

  const databaseUrl = process.env.DATABASE_URL || ''
  if (!databaseUrl) problems.push('DATABASE_URL is missing')

  const sessionPassword = process.env.NUXT_SESSION_PASSWORD || ''
  if (sessionPassword.length < 32) problems.push('NUXT_SESSION_PASSWORD must be at least 32 characters')

  const encryptionKey = process.env.ENCRYPTION_KEY || ''
  if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    problems.push('ENCRYPTION_KEY must be 32 bytes encoded as 64 hexadecimal characters')
  }

  const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || ''
  if (!siteUrl) problems.push('NUXT_PUBLIC_SITE_URL is missing')
  else if (production && !siteUrl.startsWith('https://')) {
    problems.push('NUXT_PUBLIC_SITE_URL must use https:// in production')
  }

  const stripeSecret = (process.env.STRIPE_SECRET_KEY || '').trim()
  if (stripeSecret && !stripeSecret.startsWith('sk_')) {
    warnings.push('STRIPE_SECRET_KEY does not look like a Stripe secret key')
  }
  if (stripeSecret.includes('_live_') && process.env.STRIPE_ALLOW_LIVE !== 'true') {
    warnings.push('STRIPE_SECRET_KEY is a live key; the integration is test-mode only until STRIPE_ALLOW_LIVE=true')
  }
  if (stripeSecret && !process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push('STRIPE_WEBHOOK_SECRET is missing: Stripe webhook confirmation is disabled (the return URL still verifies the session)')
  }

  if (production) {
    const legalReviewed = process.env.NUXT_PUBLIC_LEGAL_REVIEWED
    if (legalReviewed !== 'true') {
      warnings.push('NUXT_PUBLIC_LEGAL_REVIEWED is not "true": legal pages stay in draft/noindex mode')
    }
    if (process.env.TRUST_PROXY !== 'true') {
      warnings.push('TRUST_PROXY is not "true": X-Forwarded-For is ignored (correct unless behind a trusted proxy)')
    }
  }

  if (warnings.length) {
    for (const warning of warnings) console.warn(`[env] ${warning}`)
  }
  if (problems.length) {
    const message = `Invalid environment configuration:\n- ${problems.join('\n- ')}`
    if (production) throw new Error(message)
    console.warn(`[env] ${message}`)
  }
})
