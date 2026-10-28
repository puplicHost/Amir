import { logError, logInfo } from '../utils/logger'
import { recordError, recordRequest, recordResponse } from '../utils/metrics'

// AUDIT P3-18: one access-log line per request plus in-process metrics. Static
// asset noise is skipped; query strings are never logged (booking tokens live
// there). Errors are logged as structured JSON and counted.
const SKIP_PREFIXES = ['/_nuxt/', '/__nuxt', '/favicon', '/robots.txt', '/sitemap.xml']

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const path = event.path || '/'
    ;(event.context as Record<string, unknown>).startedAtMs = Date.now()
    if (!SKIP_PREFIXES.some(p => path.startsWith(p))) recordRequest(path)
  })

  nitroApp.hooks.hook('response', (event) => {
    const started = Number((event.context as Record<string, unknown>).startedAtMs || 0)
    const durationMs = started ? Date.now() - started : 0
    const status = event.node?.res?.statusCode || 200
    recordResponse(status, durationMs)

    const path = event.path || '/'
    if (SKIP_PREFIXES.some(p => path.startsWith(p))) return
    // Do not log tokens in query strings — path only.
    logInfo('http_request', {
      requestId: (event.context as Record<string, unknown>).requestId,
      method: event.method,
      path: path.split('?')[0],
      status,
      durationMs,
    })
  })

  nitroApp.hooks.hook('error', (error, event) => {
    recordError()
    logError('unhandled_error', error, {
      requestId: (event?.context as Record<string, unknown> | undefined)?.requestId,
      method: event?.method,
      path: event?.path?.split('?')[0],
    })
  })
})
