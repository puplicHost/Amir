// Global rate limiting — runs before route handlers (no Redis required).
// In-memory sliding window per process, keyed per-IP via server/utils/rate-limit.ts.

interface RateRule {
  key: string
  method: string
  match: (path: string) => boolean
  limit: number
  windowSec: number
}

const RULES: RateRule[] = [
  { key: 'login', method: 'POST', match: p => p === '/api/admin/auth/login', limit: 30, windowSec: 60 },
  { key: 'autocomplete', method: 'GET', match: p => p === '/api/products/autocomplete', limit: 30, windowSec: 60 },
  { key: 'contact-create', method: 'POST', match: p => p === '/api/contact', limit: 5, windowSec: 60 },
  { key: 'facets', method: 'GET', match: p => p === '/api/products/facets', limit: 20, windowSec: 60 },
  { key: 'bookings', method: 'POST', match: p => p === '/api/bookings' || (p.startsWith('/api/bookings/') && p.endsWith('/pay')), limit: 60, windowSec: 60 },
  { key: 'availability', method: 'GET', match: p => p === '/api/availability', limit: 30, windowSec: 60 },
]

export default defineEventHandler((event) => {
  const path = event.path.split('?')[0]
  const method = getMethod(event)
  for (const rule of RULES) {
    if (rule.method === method && rule.match(path)) {
      rateLimit(event, { key: rule.key, limit: rule.limit, windowSec: rule.windowSec })
      return
    }
  }
})
