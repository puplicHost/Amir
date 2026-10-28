import { timingSafeEqual } from 'node:crypto'
import { metricsSnapshot } from '../utils/metrics'

// AUDIT P3-18: metrics are operational data and are never public. Requires
// METRICS_TOKEN (or HEALTH_TOKEN) via the x-metrics-token header; when no token
// is configured the endpoint behaves as if it does not exist.
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const expected = String(config.metricsToken || process.env.METRICS_TOKEN || config.healthToken || process.env.HEALTH_TOKEN || '')
  const supplied = String(getRequestHeader(event, 'x-metrics-token') || '')

  if (!expected) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    setHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  setHeader(event, 'cache-control', 'no-store')
  return metricsSnapshot()
})
