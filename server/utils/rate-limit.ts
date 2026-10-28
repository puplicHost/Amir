import type { H3Event } from 'h3'
import { getClientIp } from './client-ip.ts'

// AUDIT P2-09: fixed-window limiter backed by PostgreSQL so every Nitro
// process/instance shares the same counters. If the database is unavailable
// (e.g. migration not applied yet) the limiter degrades to a process-local
// sliding window rather than failing requests.

interface MemoryRecord { timestamps: number[] }
const memoryHits = new Map<string, MemoryRecord>()
let pruneCounter = 0

function memoryLimit(event: H3Event, key: string, limit: number, windowSec: number): void {
  const now = Date.now()
  const windowMs = windowSec * 1000
  const prev = memoryHits.get(key)?.timestamps || []
  const fresh = prev.filter(ts => now - ts < windowMs)
  if (fresh.length >= limit) {
    const retryAfter = Math.ceil((fresh[0] + windowMs - now) / 1000)
    setHeader(event, 'retry-after', String(Math.max(1, retryAfter)))
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
  }
  fresh.push(now)
  memoryHits.set(key, { timestamps: fresh })
  if (memoryHits.size > 5000) {
    for (const [k, record] of memoryHits) {
      const kept = record.timestamps.filter(ts => now - ts < windowMs)
      if (!kept.length) memoryHits.delete(k)
      else memoryHits.set(k, { timestamps: kept })
    }
  }
}

export async function rateLimit(event: H3Event, opts: { key: string, limit: number, windowSec: number }): Promise<void> {
  const ip = getClientIp(event)
  const windowMs = opts.windowSec * 1000
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const bucketKey = `${opts.key}:${ip}:${windowStart}`

  try {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "RateLimitBucket" ("key", "count", "expiresAt")
      VALUES (${bucketKey}, 1, ${new Date(windowStart + windowMs)})
      ON CONFLICT ("key") DO UPDATE
        SET "count" = "RateLimitBucket"."count" + 1
      RETURNING "count"
    `
    const count = Number(rows[0]?.count ?? 1)
    if (count > opts.limit) {
      const retryAfter = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000))
      setHeader(event, 'retry-after', String(retryAfter))
      throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
    }

    // Opportunistic pruning (maximum once per ~200 requests per process).
    pruneCounter++
    if (pruneCounter % 200 === 0) {
      prisma.rateLimitBucket.deleteMany({
        where: { expiresAt: { lt: new Date(now - 60_000) } },
      }).catch(() => null)
    }
  }
  catch (error: any) {
    if (error?.statusCode === 429) throw error
    // DB/raw-query failure: keep a best-effort local limit.
    memoryLimit(event, `${opts.key}:${ip}`, opts.limit, opts.windowSec)
  }
}
