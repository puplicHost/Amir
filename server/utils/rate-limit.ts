import type { H3Event } from 'h3'

// Simple in-memory sliding-window rate limiter (per process).
// Acceptable until Redis is introduced; each instance tracks its own counters.
const hits = new Map<string, number[]>()

function clientIp(event: H3Event): string {
  try {
    return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  }
  catch {
    return 'unknown'
  }
}

export function rateLimit(event: H3Event, opts: { key: string, limit: number, windowSec: number }): void {
  const now = Date.now()
  const windowMs = opts.windowSec * 1000
  const mapKey = `${opts.key}:${clientIp(event)}`
  const prev = hits.get(mapKey) || []
  const fresh = prev.filter(ts => now - ts < windowMs)
  if (fresh.length >= opts.limit) {
    const retryAfter = Math.ceil((fresh[0] + windowMs - now) / 1000)
    setHeader(event, 'retry-after', String(Math.max(1, retryAfter)))
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
  }
  fresh.push(now)
  hits.set(mapKey, fresh)
  // Opportunistic cleanup to bound memory.
  if (hits.size > 5000) {
    const cutoff = now - windowMs
    for (const [k, v] of hits) {
      const kept = v.filter(ts => ts > cutoff)
      if (!kept.length) hits.delete(k)
      else hits.set(k, kept)
    }
  }
}
