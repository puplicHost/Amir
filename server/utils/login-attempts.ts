// In-memory failed admin-login tracker. Alerts users.manage holders once
// per email after a burst of failures (possible brute force), then cools
// down. Process-local by design: best-effort security signal, not a lockout.

interface AttemptRecord {
  failures: number[]
  alertedAt: number | null
}

const attempts = new Map<string, AttemptRecord>()

const WINDOW_MS = 10 * 60 * 1000
const THRESHOLD = 5
const COOLDOWN_MS = 60 * 60 * 1000

function prune(record: AttemptRecord, now: number) {
  record.failures = record.failures.filter(t => now - t < WINDOW_MS)
}

export async function recordFailedLogin(email: string): Promise<void> {
  try {
    const key = email.trim().toLowerCase()
    if (!key) return
    const now = Date.now()
    let record = attempts.get(key)
    if (!record) {
      record = { failures: [], alertedAt: null }
      attempts.set(key, record)
    }
    prune(record, now)
    record.failures.push(now)

    if (record.failures.length >= THRESHOLD && (!record.alertedAt || now - record.alertedAt > COOLDOWN_MS)) {
      record.alertedAt = now
      await notifyAdmins({
        type: 'failed_logins',
        relatedEntityId: key,
        url: '/admin/users',
        titleEn: `Repeated failed logins: ${key}`,
        titleAr: `محاولات دخول فاشلة متكررة: ${key}`,
        bodyEn: `${record.failures.length} failed attempts in 10 minutes`,
        bodyAr: `${record.failures.length} محاولات فاشلة خلال ١٠ دقائق`,
      })
    }
  }
  catch {
    // Alerting must never break the login flow.
  }
}
