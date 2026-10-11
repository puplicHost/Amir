// Background sweeper: expire unpaid PENDING holds (no cron dependency).
// Availability and booking creation also expire lazily, so this is a
// backstop. Single-instance assumption: with multiple Nitro instances,
// overlapping sweeps are harmless (idempotent updateMany).
export default defineNitroPlugin(() => {
  const timer = setInterval(() => {
    expireHolds().catch(e => console.error('[booking-sweeper]', (e as Error)?.message || e))
  }, 60 * 1000)
  // Do not keep the process alive for the sweeper alone in tests/runners.
  if (typeof (timer as any).unref === 'function') (timer as any).unref()
})
