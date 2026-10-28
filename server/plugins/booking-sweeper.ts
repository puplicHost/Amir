import { logError } from '../utils/logger'

// Background sweeper: expire unpaid PENDING holds, queue due customer
// reminders, send queued customer mail (no cron dependency). Availability
// and booking creation also expire lazily, so this is a backstop.
// Single-instance assumption: with multiple Nitro instances, overlapping
// sweeps are harmless (idempotent updateMany, outbox rows claimed
// exactly-once, reminder dedupeKeys).
export default defineNitroPlugin(() => {
  const timer = setInterval(() => {
    expireHolds().catch(e => logError('booking_sweeper_failed', e))
    import('../utils/reminders.ts')
      .then(m => m.queueDueReminders())
      .catch(e => logError('reminder_sweeper_failed', e))
    import('../utils/outbox.ts')
      .then(m => m.processOutbox(20))
      .catch(e => logError('mail_sweeper_failed', e))
  }, 60 * 1000)
  // Do not keep the process alive for the sweeper alone in tests/runners.
  if (typeof (timer as any).unref === 'function') (timer as any).unref()
})
