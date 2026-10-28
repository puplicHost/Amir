import { randomUUID } from 'node:crypto'

// AUDIT P3-18: attach a request id for structured logs and incident support.
// Client-supplied ids are ignored; only a fresh server id is trusted.
export default defineEventHandler((event) => {
  const requestId = randomUUID()
  event.context.requestId = requestId
  setHeader(event, 'x-request-id', requestId)
})
