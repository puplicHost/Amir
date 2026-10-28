// AUDIT P3-18: minimal structured logger (JSON lines) with secret/PII
// redaction. External error tracking/metrics remain a deployment decision; this
// makes existing console output queryable and correlates it with x-request-id.

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const REDACTED = '[redacted]'
const SENSITIVE_KEY = /(password|passwd|secret|token|authorization|cookie|apikey|api_key|privatekey|private_key|card|iban|email|phone)/i

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]'
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  if (Array.isArray(value)) return value.slice(0, 50).map(v => redact(v, depth + 1))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(val, depth + 1)
    }
    return out
  }
  return value
}

function write(level: LogLevel, message: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(redact(fields) as Record<string, unknown>),
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export function logInfo(message: string, fields?: Record<string, unknown>) {
  write('info', message, fields)
}

export function logWarn(message: string, fields?: Record<string, unknown>) {
  write('warn', message, fields)
}

export function logError(message: string, error?: unknown, fields: Record<string, unknown> = {}) {
  write('error', message, { ...fields, error: error instanceof Error ? error : String(error ?? '') })
}

export function requestLogFields(event: { context?: Record<string, unknown> }): Record<string, unknown> {
  return { requestId: event?.context?.requestId }
}
