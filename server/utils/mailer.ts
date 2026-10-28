// Customer mail provider (Roadmap Phase 7).
// Providers: 'log' (server log, default — no dependency, no account) and
// 'http' (generic JSON API via fetch — no dependency). Secrets are
// AES-256-GCM encrypted in settings and never returned raw.

import { decryptData } from './encryption.ts'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string | null
  ical?: string | null
}

export interface MailSettings {
  provider: string
  from: string
  fromName: string
  httpEndpoint: string | null
  httpKey: string | null
}

export async function getMailSettings(): Promise<MailSettings> {
  const s = await prisma.siteSettings.findFirst()
  let httpKey: string | null = null
  if ((s as any)?.mailHttpKey) {
    try {
      httpKey = decryptData((s as any).mailHttpKey)
    }
    catch {
      httpKey = null
    }
  }
  return {
    provider: (s as any)?.mailProvider || 'log',
    from: (s as any)?.mailFrom || '',
    fromName: (s as any)?.mailFromName || '',
    httpEndpoint: (s as any)?.mailHttpEndpoint || null,
    httpKey,
  }
}

/** Public site base URL for self-service links (manage URLs). Empty when unconfigured. */
export function siteBaseUrl(): string {
  try {
    const config: any = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null
    const fromConfig = config?.public?.siteUrl || config?.siteUrl || ''
    const raw = fromConfig || process.env.NUXT_PUBLIC_SITE_URL || ''
    return String(raw).replace(/\/$/, '')
  }
  catch {
    return String(process.env.NUXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  }
}

/** Send one message. Throws on failure (outbox retries). Never throws for 'log'. */
export async function sendMail(msg: MailMessage): Promise<void> {
  const settings = await getMailSettings()
  if (settings.provider === 'http') {
    if (!settings.httpEndpoint) throw new Error('Mail HTTP endpoint not configured')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    try {
      const res = await fetch(settings.httpEndpoint, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(settings.httpKey ? { Authorization: `Bearer ${settings.httpKey}` } : {}),
        },
        body: JSON.stringify({
          from: settings.fromName ? `${settings.fromName} <${settings.from}>` : settings.from,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          ...(msg.html ? { html: msg.html } : {}),
          ...(msg.ical ? { ical: msg.ical } : {}),
        }),
      })
      if (!res.ok) throw new Error(`Mail API responded ${res.status}`)
    }
    finally {
      clearTimeout(timer)
    }
    return
  }
  console.log(`[mail:${settings.provider}] to=${msg.to} subject=${msg.subject}\n${msg.text}`)
}
