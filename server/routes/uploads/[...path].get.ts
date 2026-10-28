import { createReadStream, promises as fs } from 'node:fs'

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
}

export default defineEventHandler(async (event) => {
  const parts = (getRouterParam(event, 'path') || '').split('/').filter(Boolean)
  // Nitro [...path] param arrives joined; split back into segments.
  const scope = parts[0] || ''

  // Public media scopes. Every other scope (expense receipts, service-request
  // uploads, legacy private files) requires an admin session and is never
  // served anonymously. Hero slides are public homepage content, and staff
  // avatars are intentionally public (rendered in the customer staff picker).
  const PUBLIC_SCOPES = new Set(['banners', 'categories', 'products', 'settings', 'hero', 'services', 'staff'])
  if (!PUBLIC_SCOPES.has(scope)) {
    let sessionUser = null
    try {
      sessionUser = await getSessionUser(event)
    }
    catch {
      sessionUser = null
    }
    const ok = !!sessionUser && (sessionUser.isSuper
      || sessionUser.permissions.includes('services.manage')
      || sessionUser.permissions.includes('expenses.view')
      || sessionUser.permissions.includes('expenses.manage'))
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
  // PERF-04: stored files are content-unique (uuid/timestamp names), so they
  // can be cached immutably for a year.
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return sendStream(event, createReadStream(full))
})
