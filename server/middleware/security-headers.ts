import type { H3Event } from 'h3'

// AUDIT P2-06: defense-in-depth headers at the Nitro layer. CSP is shipped in
// report-only mode first because Nuxt hydration, payment redirects and Meta
// tooling need staging verification before enforcement.

function isHttps(event: H3Event): boolean {
  const proto = getRequestHeader(event, 'x-forwarded-proto')
  if (proto) return proto.split(',')[0].trim().toLowerCase() === 'https'
  return Boolean((event.node?.req?.socket as any)?.encrypted)
}

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.googletagmanager.com https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://api.stripe.com https://www.facebook.com https://graph.facebook.com https://www.paypal.com https://www.sandbox.paypal.com https://identitytoolkit.googleapis.com https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://www.google-analytics.com",
  "frame-src https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
].join('; ')

export default defineEventHandler((event) => {
  setHeader(event, 'x-content-type-options', 'nosniff')
  setHeader(event, 'x-frame-options', 'DENY')
  setHeader(event, 'referrer-policy', 'strict-origin-when-cross-origin')
  setHeader(event, 'permissions-policy', 'camera=(), microphone=(), geolocation=(), usb=()')
  setHeader(event, 'x-permitted-cross-domain-policies', 'none')
  setHeader(event, 'x-dns-prefetch-control', 'off')
  setHeader(event, 'content-security-policy-report-only', CSP)

  if (process.env.NODE_ENV === 'production' && isHttps(event)) {
    setHeader(event, 'strict-transport-security', 'max-age=31536000; includeSubDomains')
  }
})
