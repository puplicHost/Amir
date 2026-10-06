import { createReadStream, promises as fs } from 'node:fs'

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
}

export default defineEventHandler(async (event) => {
  const parts = (getRouterParam(event, 'path') || '').split('/').filter(Boolean)
  // Nitro [...path] param arrives joined; split back into segments.
  const scope = parts[0] || ''

  // Sensitive scopes: quote PDFs contain customer PII; service-request files
  // may contain customer uploads. Never serve them anonymously.
  if (scope === 'quotes' || scope === 'service-requests') {
    let sessionUser = null
    try {
      sessionUser = await getSessionUser(event)
    }
    catch {
      sessionUser = null
    }
    const need = scope === 'quotes' ? 'quotes.view' : 'services.view'
    const ok = !!sessionUser && (sessionUser.isSuper
      || sessionUser.permissions.includes(need)
      || sessionUser.permissions.includes('quotes.manage')
      || sessionUser.permissions.includes('services.manage'))
    if (!ok) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  const full = resolveUploadPath(parts)
  if (!full) throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
  try {
    const stat = await fs.stat(full)
    if (!stat.isFile()) throw new Error('not a file')
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const ext = full.slice(full.lastIndexOf('.')).toLowerCase()
  setHeader(event, 'content-type', MIME[ext] || 'application/octet-stream')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return sendStream(event, createReadStream(full))
})
