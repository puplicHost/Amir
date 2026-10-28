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

// Public media scopes. Every other scope (expense receipts, service-request
// uploads, legacy private files) requires an admin session and is never served
// anonymously or through a shared cache.
const PUBLIC_SCOPES = new Set(['banners', 'categories', 'products', 'settings', 'hero', 'services', 'staff'])

// AUDIT P1-05: permissions are scoped per resource instead of granting every
// private file to services/expenses managers alike. Unknown scopes are
// super-admin only.
const PRIVATE_SCOPE_PERMISSIONS: Record<string, string[]> = {
  expenses: ['expenses.view', 'expenses.manage', 'expenses.export'],
  'service-requests': ['inbox.manage'],
}

export default defineEventHandler(async (event) => {
  const parts = (getRouterParam(event, 'path') || '').split('/').filter(Boolean)
  // Nitro [...path] param arrives joined; split back into segments.
  const scope = parts[0] || ''
  const isPublic = PUBLIC_SCOPES.has(scope)

  if (!isPublic) {
    let sessionUser = null
    try {
      sessionUser = await getSessionUser(event)
    }
    catch {
      sessionUser = null
    }
    const required = PRIVATE_SCOPE_PERMISSIONS[scope]
    const ok = !!sessionUser && (sessionUser.isSuper
      || (!!required && required.some(p => sessionUser!.permissions.includes(p))))
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
  setHeader(event, 'x-content-type-options', 'nosniff')

  if (isPublic) {
    // Stored public files are content-unique (uuid/timestamp names), so they
    // can be cached immutably for a year.
    setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  }
  else {
    // AUDIT P1-05: authenticated private files must never enter a shared cache.
    setHeader(event, 'cache-control', 'private, no-store, max-age=0')
    setHeader(event, 'pragma', 'no-cache')
    setHeader(event, 'vary', 'Cookie, Authorization')
  }

  return sendStream(event, createReadStream(full))
})
