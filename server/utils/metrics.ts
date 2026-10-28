// AUDIT P3-18: dependency-free operational metrics.
//
// Per-process, in-memory counters. They answer "is the app healthy right now?"
// and survive nothing — a restart resets them. Multi-replica deployments must
// scrape each replica separately or move these counters to Redis/a metrics
// backend (documented in Docs/FULL-WEBSITE-REMEDIATION.md).

interface MetricState {
  startedAt: number
  requests: number
  responses: Record<string, number>
  statusClasses: { '2xx': number, '3xx': number, '4xx': number, '5xx': number }
  errors: number
  durationBuckets: Record<string, number>
  routes: Map<string, number>
}

const DURATION_BUCKETS_MS = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

const state: MetricState = {
  startedAt: Date.now(),
  requests: 0,
  responses: {},
  statusClasses: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
  errors: 0,
  durationBuckets: Object.fromEntries(DURATION_BUCKETS_MS.map(b => [`le_${b}`, 0])),
  routes: new Map(),
}

const MAX_ROUTE_KEYS = 200

/** Collapse dynamic ids so route labels stay bounded (no user data). */
export function normalizeRoute(path: string): string {
  const clean = path.split('?')[0] || '/'
  return clean
    .replace(/\/[0-9a-f]{16,}(?=\/|$)/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/[A-Za-z0-9_-]{24,}(?=\/|$)/g, '/:token')
    .slice(0, 120)
}

function bump(map: Map<string, number>, key: string) {
  if (!map.has(key) && map.size >= MAX_ROUTE_KEYS) return
  map.set(key, (map.get(key) || 0) + 1)
}

export function recordRequest(path: string) {
  state.requests += 1
  bump(state.routes, normalizeRoute(path))
}

export function recordResponse(statusCode: number, durationMs: number) {
  const key = String(statusCode)
  state.responses[key] = (state.responses[key] || 0) + 1
  if (statusCode >= 500) state.statusClasses['5xx'] += 1
  else if (statusCode >= 400) state.statusClasses['4xx'] += 1
  else if (statusCode >= 300) state.statusClasses['3xx'] += 1
  else state.statusClasses['2xx'] += 1

  for (const bucket of DURATION_BUCKETS_MS) {
    if (durationMs <= bucket) state.durationBuckets[`le_${bucket}`] += 1
  }
}

export function recordError() {
  state.errors += 1
}

export function metricsSnapshot() {
  return {
    uptimeSec: Math.round((Date.now() - state.startedAt) / 1000),
    memory: process.memoryUsage(),
    requests: state.requests,
    responsesByStatus: { ...state.responses },
    statusClasses: { ...state.statusClasses },
    errors: state.errors,
    durationBucketsMs: { ...state.durationBuckets },
    topRoutes: [...state.routes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([route, count]) => ({ route, count })),
  }
}
