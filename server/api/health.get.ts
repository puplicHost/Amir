import { timingSafeEqual } from 'node:crypto'

// AUDIT P3-17: public health output no longer discloses database internals.
// Detailed status requires the server-only HEALTH_TOKEN header.
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'no-store')
  try {
    await prisma.$queryRaw`SELECT 1`
  }
  catch {
    throw createError({ statusCode: 503, statusMessage: 'Unavailable' })
  }

  const config = useRuntimeConfig(event)
  const expected = String(config.healthToken || process.env.HEALTH_TOKEN || '')
  const supplied = String(getRequestHeader(event, 'x-health-token') || '')
  if (expected && supplied) {
    const a = Buffer.from(expected)
    const b = Buffer.from(supplied)
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return { status: 'ok', database: 'connected' }
    }
  }
  return { status: 'ok' }
})
