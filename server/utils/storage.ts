import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import sharp from 'sharp'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function storageRoot(): string {
  return resolve(process.cwd(), 'storage')
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

export async function deleteProductDir(productId: string): Promise<void> {
  assertSafeId(productId)
  await rm(productDir(productId), { recursive: true, force: true })
}

export function resolveUploadPath(parts: string[]): string | null {
  const clean = parts.filter(p => p && p !== '.' && p !== '..' && !p.includes('/') && !p.includes('\\'))
  if (clean.length !== parts.length || clean.length === 0) return null
  const full = join(storageRoot(), ...clean)
  if (!full.startsWith(storageRoot() + sep)) return null
  return full
}
