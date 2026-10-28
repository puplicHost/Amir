import type { H3Event } from 'h3'

function isPrivateAddress(value: string): boolean {
  const ip = value.trim().toLowerCase()
  if (!ip) return false
  if (ip === '::1' || ip === '127.0.0.1' || ip === '0:0:0:0:0:0:0:1') return true
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true
  return false
}

function plausibleIp(value: string): boolean {
  const ip = value.trim()
  if (!ip || ip.length > 45) return false
  // IPv4 or IPv6 characters only; rejects header-injection/odd payloads.
  return /^[0-9a-fA-F:.]+$/.test(ip)
}

/**
 * AUDIT P2-09: only trust X-Forwarded-For when explicitly enabled AND the
 * direct peer is a loopback/private proxy. Otherwise a public client could
 * rotate a forged header and bypass every IP-based limit.
 */
export function getClientIp(event: H3Event): string {
  const remote = (() => {
    try {
      return getRequestIP(event, { xForwardedFor: false }) || ''
    }
    catch {
      return ''
    }
  })()

  const trustProxy = process.env.TRUST_PROXY === 'true' || process.env.NITRO_TRUST_PROXY === 'true'
  if (!trustProxy || (remote && !isPrivateAddress(remote))) {
    return remote || 'unknown'
  }

  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim() || ''
    if (plausibleIp(first)) return first
  }
  return remote || 'unknown'
}
