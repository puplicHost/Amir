import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import sharp from 'sharp'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/ogg'])
const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // 50MB

const ALLOWED_DOC_MIME = new Set(['application/pdf'])
const MAX_DOC_BYTES = 10 * 1024 * 1024 // 10MB

export function storageRoot(): string {
  return resolve(process.cwd(), 'storage')
}

export function heroDir(): string {
  return join(storageRoot(), 'hero')
}

export function productDir(productId: string): string {
  return join(storageRoot(), 'products', productId)
}

export function categoryDir(categoryId: string): string {
  return join(storageRoot(), 'categories', categoryId)
}

function assertSafeId(id: string): void {
  if (!id || id.includes('/') || id.includes('\\') || id.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
}

function assertImagePart(part: { type?: string, data: Buffer }): void {
  if (!part.type || !ALLOWED_MIME.has(part.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Only JPG, PNG, WEBP images allowed' })
  }
  if (part.data.length > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Image exceeds 5MB limit' })
  }
}

export async function saveProductImage(productId: string, data: Buffer, mime: string): Promise<string> {
  assertSafeId(productId)
  assertImagePart({ type: mime, data })
  const dir = productDir(productId)
  await mkdir(dir, { recursive: true })
  const filename = `${randomUUID()}.webp`
  const buffer = await sharp(data).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  await writeFile(join(dir, filename), buffer)
  return `/uploads/products/${productId}/${filename}`
}

export async function saveProductVideo(productId: string, data: Buffer, mime: string): Promise<string> {
  assertSafeId(productId)
  if (!ALLOWED_VIDEO_MIME.has(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'Only MP4, WebM, Ogg video formats allowed' })
  }
  if (data.length > MAX_VIDEO_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Video exceeds 50MB limit' })
  }
  const dir = join(productDir(productId), 'video')
  await mkdir(dir, { recursive: true })
  const ext = mime === 'video/webm' ? 'webm' : mime === 'video/ogg' ? 'ogg' : 'mp4'
  const filename = `${randomUUID()}.${ext}`
  await writeFile(join(dir, filename), data)
  return `/uploads/products/${productId}/video/${filename}`
}

export async function saveProductDocument(productId: string, data: Buffer, originalFilename: string, mime: string): Promise<string> {
  assertSafeId(productId)
  if (!ALLOWED_DOC_MIME.has(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'Only PDF documents allowed' })
  }
  if (data.length > MAX_DOC_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Document exceeds 10MB limit' })
  }
  const dir = join(productDir(productId), 'documents')
  await mkdir(dir, { recursive: true })
  const safeBase = originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_').replace(/\.pdf$/i, '')
  const filename = `${safeBase}-${randomUUID().slice(0, 8)}.pdf`
  await writeFile(join(dir, filename), data)
  return `/uploads/products/${productId}/documents/${filename}`
}

export async function saveCategoryCover(categoryId: string, data: Buffer, mime: string): Promise<string> {
  assertSafeId(categoryId)
  assertImagePart({ type: mime, data })
  const dir = categoryDir(categoryId)
  await mkdir(dir, { recursive: true })
  const filename = `cover-${randomUUID()}.webp`
  const buffer = await sharp(data).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  await writeFile(join(dir, filename), buffer)
  return `/uploads/categories/${categoryId}/${filename}`
}

export function serviceDir(serviceId: string): string {
  return join(storageRoot(), 'services', serviceId)
}

/** Per-service card cover (like category covers): capped 1200px WebP. */
export async function saveServiceCover(serviceId: string, data: Buffer, mime: string): Promise<string> {
  assertSafeId(serviceId)
  assertImagePart({ type: mime, data })
  const dir = serviceDir(serviceId)
  await mkdir(dir, { recursive: true })
  const filename = `cover-${randomUUID()}.webp`
  const buffer = await sharp(data).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  await writeFile(join(dir, filename), buffer)
  return `/uploads/services/${serviceId}/${filename}`
}

// ─── Validated brand / staff / receipt uploads ─────────────────────
// These helpers never trust the filename extension or the client MIME type:
// they sniff real content with sharp (or magic bytes for ICO/PDF) and
// re-encode raster images, so arbitrary bytes can never be published.

export const MAX_BRAND_BYTES = 5 * 1024 * 1024
const RASTER_FORMATS = new Set(['jpeg', 'png', 'webp'])

/** Assert the buffer is a real, decodable raster image (jpeg/png/webp). */
export async function assertRasterImage(data: Buffer, maxBytes = MAX_BRAND_BYTES): Promise<void> {
  if (!data.length) throw createError({ statusCode: 400, statusMessage: 'Empty file' })
  if (data.length > maxBytes) {
    throw createError({ statusCode: 400, statusMessage: `Image exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit` })
  }
  let meta
  try {
    meta = await sharp(data).metadata()
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image file' })
  }
  if (!meta.format || !RASTER_FORMATS.has(meta.format)) {
    throw createError({ statusCode: 400, statusMessage: 'Only JPG, PNG or WEBP images allowed' })
  }
}

/** Validate + re-encode a brand image (logo/banner) to WebP under `folder/`. */
export async function saveBrandImage(folder: string, prefix: string, data: Buffer, maxWidth: number): Promise<string> {
  assertSafeId(folder.replace(/\//g, ''))
  await assertRasterImage(data)
  const dir = join(storageRoot(), folder)
  await mkdir(dir, { recursive: true })
  const filename = `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}.webp`
  const buffer = await sharp(data).rotate().resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  await writeFile(join(dir, filename), buffer)
  return `/uploads/${folder}/${filename}`
}

const ICO_MAGIC = Buffer.from([0x00, 0x00, 0x01, 0x00])

/** Favicon: accepts a real ICO (magic bytes) or a raster image → PNG. */
export async function saveFavicon(data: Buffer): Promise<string> {
  if (!data.length) throw createError({ statusCode: 400, statusMessage: 'Empty file' })
  const dir = join(storageRoot(), 'settings')
  await mkdir(dir, { recursive: true })
  if (data.length > 4 && data.subarray(0, 4).equals(ICO_MAGIC)) {
    if (data.length > 1024 * 1024) throw createError({ statusCode: 400, statusMessage: 'Favicon exceeds 1MB limit' })
    const filename = `favicon-${Date.now()}-${randomUUID().slice(0, 8)}.ico`
    await writeFile(join(dir, filename), data)
    return `/uploads/settings/${filename}`
  }
  await assertRasterImage(data, 1024 * 1024)
  const filename = `favicon-${Date.now()}-${randomUUID().slice(0, 8)}.png`
  const buffer = await sharp(data).rotate().resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
  await writeFile(join(dir, filename), buffer)
  return `/uploads/settings/${filename}`
}

/** Staff avatar: validated + re-encoded WebP (publicly served under staff/). */
export async function saveStaffPhoto(userId: string, data: Buffer): Promise<string> {
  assertSafeId(userId)
  await assertRasterImage(data, 2 * 1024 * 1024)
  const dir = join(storageRoot(), 'staff')
  await mkdir(dir, { recursive: true })
  const filename = `staff-${userId}-${Date.now()}-${randomUUID().slice(0, 8)}.webp`
  const buffer = await sharp(data).rotate().resize({ width: 600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  await writeFile(join(dir, filename), buffer)
  return `/uploads/staff/${filename}`
}

const PDF_MAGIC = Buffer.from('%PDF-')

/** Expense receipt: real PDF (magic bytes) or a validated raster image. */
export async function saveReceipt(expenseId: string, data: Buffer): Promise<string> {
  assertSafeId(expenseId)
  if (!data.length) throw createError({ statusCode: 400, statusMessage: 'Empty file' })
  const dir = join(storageRoot(), 'expenses')
  await mkdir(dir, { recursive: true })
  if (data.length > 5 && data.subarray(0, 5).equals(PDF_MAGIC)) {
    if (data.length > 10 * 1024 * 1024) throw createError({ statusCode: 400, statusMessage: 'PDF exceeds 10MB limit' })
    const filename = `expense-${expenseId}-${Date.now()}-${randomUUID().slice(0, 8)}.pdf`
    await writeFile(join(dir, filename), data)
    return `/uploads/expenses/${filename}`
  }
  await assertRasterImage(data, 5 * 1024 * 1024)
  const filename = `expense-${expenseId}-${Date.now()}-${randomUUID().slice(0, 8)}.webp`
  const buffer = await sharp(data).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  await writeFile(join(dir, filename), buffer)
  return `/uploads/expenses/${filename}`
}

/** Delete a previously stored service cover file (by public path). */
export async function deleteServiceCoverFile(imagePath: string): Promise<void> {
  const parts = (imagePath || '').replace(/^\/uploads\//, '').split('/')
  const full = resolveUploadPath(parts)
  if (!full) return
  // Only ever delete inside services/.
  if (!full.startsWith(join(storageRoot(), 'services') + sep)) return
  await rm(full, { force: true })
}

export async function deleteServiceDir(serviceId: string): Promise<void> {
  assertSafeId(serviceId)
  await rm(serviceDir(serviceId), { recursive: true, force: true })
}

export async function deleteProductDir(productId: string): Promise<void> {
  assertSafeId(productId)
  await rm(productDir(productId), { recursive: true, force: true })
}

// ─── Homepage hero slideshow ─────────────────────────────────────
// Two variants per slide (2400px + 1200px WebP) derived by naming convention:
// `/uploads/hero/<uuid>.webp` and `/uploads/hero/<uuid>-1200.webp`.
// Slides backfilled from the legacy single hero image keep their old path and
// simply reuse it as their small variant.

export const MAX_HERO_SLIDES = 8
export const MAX_HERO_BYTES = 5 * 1024 * 1024
export const MIN_HERO_WIDTH = 800
const HERO_FORMATS = new Set(['jpeg', 'png', 'webp'])

/** Validate actual file content via sharp (never trust extensions or MIME). */
export async function assertHeroImage(data: Buffer): Promise<void> {
  if (data.length > MAX_HERO_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Image exceeds 5MB limit' })
  }
  let meta
  try {
    meta = await sharp(data).metadata()
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image file' })
  }
  if (!meta.format || !HERO_FORMATS.has(meta.format)) {
    throw createError({ statusCode: 400, statusMessage: 'Only JPG, PNG, WEBP images allowed' })
  }
  if (!meta.width || meta.width < MIN_HERO_WIDTH) {
    throw createError({ statusCode: 400, statusMessage: 'Image must be at least 800 px wide' })
  }
}

/** Auto-rotate, strip metadata, cap width at 2400px, write both WebP variants. */
export async function saveHeroSlide(data: Buffer): Promise<string> {
  const id = randomUUID()
  const dir = heroDir()
  await mkdir(dir, { recursive: true })
  const base = sharp(data).rotate()
  await base.clone().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(dir, `${id}.webp`))
  await base.clone().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(dir, `${id}-1200.webp`))
  return `/uploads/hero/${id}.webp`
}

/** Small-variant URL by convention; legacy paths fall back to the same URL. */
export function heroVariant1200(imagePath: string): string {
  const m = /^\/uploads\/hero\/([A-Za-z0-9-]+)\.webp$/.exec(imagePath)
  return m ? `/uploads/hero/${m[1]}-1200.webp` : imagePath
}

/** Delete ONLY the slide's own files (both variants); never anything else. */
export async function deleteHeroSlideFiles(imagePath: string): Promise<void> {
  const targets = [...new Set([imagePath, heroVariant1200(imagePath)])]
  for (const target of targets) {
    const parts = target.replace(/^\/uploads\//, '').split('/')
    const full = resolveUploadPath(parts)
    if (!full) continue
    await rm(full, { force: true })
  }
}

export function resolveUploadPath(parts: string[]): string | null {
  const clean = parts.filter(p => p && p !== '.' && p !== '..' && !p.includes('/') && !p.includes('\\'))
  if (clean.length !== parts.length || clean.length === 0) return null
  const full = join(storageRoot(), ...clean)
  if (!full.startsWith(storageRoot() + sep)) return null
  return full
}

import fsSync from 'fs'

export async function storeFile(data: Buffer, folder: string, filename: string): Promise<{ relativePath: string }> {
  assertSafeId(folder.replace(/\//g, '')) // basic check, though folder might have slashes
  const dir = join(storageRoot(), folder)
  await mkdir(dir, { recursive: true })
  
  // sanitize filename
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  
  await writeFile(join(dir, safeName), data)
  return { relativePath: `/uploads/${folder}/${safeName}` }
}

export async function getFileStream(relativePath: string): Promise<{ stream: fsSync.ReadStream, mimeType: string, size: number }> {
  // relativePath is like /uploads/service-requests/xxx/file.pdf
  const parts = relativePath.replace(/^\/uploads\//, '').split('/')
  const path = resolveUploadPath(parts)
  if (!path || !fsSync.existsSync(path)) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }
  
  const stat = fsSync.statSync(path)
  const mimeType = path.endsWith('.pdf') ? 'application/pdf' : 
                   path.endsWith('.png') ? 'image/png' : 
                   path.endsWith('.webp') ? 'image/webp' : 
                   path.endsWith('.jpg') || path.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream'

  return {
    stream: fsSync.createReadStream(path),
    mimeType,
    size: stat.size
  }
}
