import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

export default defineEventHandler(async () => {
  // Bundled section card images (Women/Men/Kids/Beauty). If the folder
  // cannot be read (e.g. production bundle), return an empty list and
  // the homepage falls back to its built-in map.
  try {
    const dir = join(resolve(process.cwd(), 'public'), 'service')
    const files = await fs.readdir(dir)
    const images = files
      .filter(f => IMAGE_EXTS.has(f.slice(f.lastIndexOf('.')).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map(f => ({ name: f, url: `/service/${f}` }))
    return { images }
  }
  catch {
    return { images: [] }
  }
})
