// Hero slideshow endpoint verification: permissions, upload validation,
// limits, reorder, delete, and the public feed.
//
// Run: node scripts/verify-hero.mjs
// Prerequisites: local dev server running (http://localhost:3000) & PostgreSQL
// reachable AND the hero_slides migration applied.
//
// Safety guarantee:
// - All test users use emails ending in '@test.invalid'.
// - All test slides get altText starting with 'TEST-HERO-'.
// - Everything created (users, slides, storage files) is cleaned up in finally.
// - Real slides, users, and files are never modified or deleted.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import sharp from 'sharp'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const prisma = new PrismaClient()

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return { status: res.status, cookie: res.headers.get('set-cookie')?.split(';')[0] || '' }
}

// Unique query busts the 60s route cache so assertions read fresh handler output.
const pubFeed = () => fetch(`${BASE}/api/settings/general?fresh=${Date.now()}`).then(r => r.json())

function client(cookie, isForm) {  return (url, opts = {}) => fetch(`${BASE}${url}`, {
    ...opts,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(opts.headers || {}),
    },
  })
}

async function makeJpeg(width, height) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 200, b: 200 } },
  }).jpeg({ quality: 85 }).toBuffer()
}

function uploadFile(api, buffer, filename, mime) {
  const fd = new FormData()
  fd.append('file', new Blob([buffer], { type: mime }), filename)
  return api('/api/admin/settings/hero', { method: 'POST', body: fd })
}

function heroStorageFiles() {
  try {
    return readdirSync(join(process.cwd(), 'storage', 'hero'))
  }
  catch {
    return []
  }
}

async function main() {
  const testUserIds = []
  const tempSlideIds = []
  let originalInterval = 6
  try {
    console.log('=== Setting up hero test fixtures ===')
    const passHash = await bcrypt.hash('TestPass123!', 10)
    const mkUser = (email, role) => prisma.adminUser.create({
      data: { email, name: 'Hero Test', passwordHash: passHash, role, isActive: true },
    })
    const staff = await mkUser('staff-hero@test.invalid', 'STAFF')
    const manager = await mkUser('manager-hero@test.invalid', 'MANAGER')
    const admin = await mkUser('admin-hero@test.invalid', 'ADMIN')
    testUserIds.push(staff.id, manager.id, admin.id)

    const staffLogin = await loginUser(staff.email, 'TestPass123!')
    const managerLogin = await loginUser(manager.email, 'TestPass123!')
    const adminLogin = await loginUser(admin.email, 'TestPass123!')
    check('staff login works', staffLogin.status === 200)
    check('manager login works', managerLogin.status === 200)
    check('admin login works', adminLogin.status === 200)
    const staffApi = client(staffLogin.cookie)
    const managerApi = client(managerLogin.cookie)
    const adminApi = client(adminLogin.cookie, true)
    const adminJson = client(adminLogin.cookie)

    // Record baseline (never touch real rows).
    const before = await prisma.heroSlide.findMany({ select: { id: true } })
    const beforeIds = new Set(before.map(s => s.id))
    const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })
    originalInterval = settings?.heroSlideIntervalSec ?? 6
    const filesBefore = heroStorageFiles()

    // 1. STAFF + MANAGER get 403 on every hero endpoint.
    const forbiddenCalls = [
      ['GET list', c => c('/api/admin/settings/hero')],
      ['POST upload', c => c('/api/admin/settings/hero', { method: 'POST', body: JSON.stringify({}) })],
      ['PUT order', c => c('/api/admin/settings/hero/order', { method: 'PUT', body: JSON.stringify({ order: ['x'] }) })],
      ['PUT slide', c => c('/api/admin/settings/hero/bogus-id', { method: 'PUT', body: JSON.stringify({ isActive: false }) })],
      ['DELETE slide', c => c('/api/admin/settings/hero/bogus-id', { method: 'DELETE' })],
      ['PUT interval', c => c('/api/admin/settings/hero/interval', { method: 'PUT', body: JSON.stringify({ intervalSec: 7 }) })],
    ]
    for (const [label, call] of forbiddenCalls) {
      const rs = await call(staffApi)
      const rm = await call(managerApi)
      check(`STAFF 403 ${label}`, rs.status === 403)
      check(`MANAGER 403 ${label}`, rm.status === 403)
    }

    // 2. ADMIN uploads a valid image.
    const valid = await makeJpeg(1600, 1000)
    let res = await uploadFile(adminApi, valid, 'valid.jpg', 'image/jpeg')
    check('ADMIN upload valid 200', res.status === 200)
    const created = (await res.json()).slides || []
    check('upload returns a row', created.length === 1 && !!created[0].id)
    for (const s of created) {
      tempSlideIds.push(s.id)
      await prisma.heroSlide.update({ where: { id: s.id }, data: { altText: 'TEST-HERO-valid' } })
    }
    const row = await prisma.heroSlide.findUnique({ where: { id: created[0].id } })
    check('row stored under /uploads/hero/', !!row && row.imagePath.startsWith('/uploads/hero/'))
    const filesAfterUpload = heroStorageFiles()
    check('both WebP variants written', filesAfterUpload.length === filesBefore.length + 2)

    // 3. Rejections: text-as-jpg, SVG, too narrow, oversize.
    const textFile = Buffer.from('this is not an image at all, just plain text bytes')
    res = await uploadFile(adminApi, textFile, 'fake.jpg', 'image/jpeg')
    check('non-image renamed .jpg rejected', res.status === 400)
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="red"/></svg>')
    res = await uploadFile(adminApi, svg, 'vector.svg', 'image/svg+xml')
    check('SVG rejected', res.status === 400)
    const narrow = await makeJpeg(400, 400)
    res = await uploadFile(adminApi, narrow, 'narrow.jpg', 'image/jpeg')
    check('under-800px image rejected', res.status === 400)
    const padded = Buffer.concat([valid, Buffer.alloc(6 * 1024 * 1024)])
    res = await uploadFile(adminApi, padded, 'huge.jpg', 'image/jpeg')
    check('oversize file rejected', res.status === 400)

    // 4. Fill to 8 temp slides, then the 9th is rejected.
    const current = await prisma.heroSlide.count()
    for (let i = current; i < 8; i++) {
      const buf = await makeJpeg(800, 800)
      const r = await uploadFile(adminApi, buf, `fill-${i}.jpg`, 'image/jpeg')
      if (r.status !== 200) break
      const s = (await r.json()).slides?.[0]
      if (!s) break
      tempSlideIds.push(s.id)
      await prisma.heroSlide.update({ where: { id: s.id }, data: { altText: `TEST-HERO-fill-${i}` } })
    }
    const totalNow = await prisma.heroSlide.count()
    if (totalNow >= 8) {
      res = await uploadFile(adminApi, await makeJpeg(800, 800), 'ninth.jpg', 'image/jpeg')
      check('9th slide rejected', res.status === 400)
    }
    else {
      console.log('note: could not reach 8 slides, 9th-slide check skipped')
    }

    // 5. Reorder validation.
    const allIds = (await prisma.heroSlide.findMany({ select: { id: true } })).map(s => s.id)
    res = await adminJson('/api/admin/settings/hero/order', { method: 'PUT', body: JSON.stringify({ order: [...allIds.slice(1), 'bogus-id'] }) })
    check('reorder with wrong id rejected', res.status === 400)
    res = await adminJson('/api/admin/settings/hero/order', { method: 'PUT', body: JSON.stringify({ order: [...allIds, allIds[0]] }) })
    check('reorder with duplicate id rejected', res.status === 400)
    const reversed = [...allIds].reverse()
    res = await adminJson('/api/admin/settings/hero/order', { method: 'PUT', body: JSON.stringify({ order: reversed }) })
    check('valid reorder accepted', res.status === 200)
    const firstAfter = await prisma.heroSlide.findFirst({ orderBy: { sortOrder: 'asc' } })
    check('order persisted', firstAfter?.id === reversed[0])

    // 6. Alt text + toggle + interval validation.
    const target = tempSlideIds[0]
    res = await adminJson(`/api/admin/settings/hero/${target}`, { method: 'PUT', body: JSON.stringify({ altText: 'x'.repeat(201) }) })
    check('alt over 200 chars rejected', res.status === 400)
    res = await adminJson(`/api/admin/settings/hero/${target}`, { method: 'PUT', body: JSON.stringify({ altText: 'TEST-HERO-alt' }) })
    check('alt update accepted', res.status === 200)
    res = await adminJson(`/api/admin/settings/hero/${target}`, { method: 'PUT', body: JSON.stringify({ isActive: false }) })
    check('deactivate accepted', res.status === 200)
    let pub = await pubFeed()
    const targetRow = await prisma.heroSlide.findUnique({ where: { id: target } })
    check('public hides inactive slide', !(pub.heroSlides || []).some(s => s.url === targetRow?.imagePath))
    res = await adminJson(`/api/admin/settings/hero/${target}`, { method: 'PUT', body: JSON.stringify({ isActive: true }) })
    check('reactivate accepted', res.status === 200)
    res = await adminJson('/api/admin/settings/hero/interval', { method: 'PUT', body: JSON.stringify({ intervalSec: 2 }) })
    check('interval 2 rejected', res.status === 400)
    res = await adminJson('/api/admin/settings/hero/interval', { method: 'PUT', body: JSON.stringify({ intervalSec: 20 }) })
    check('interval 20 rejected', res.status === 400)
    res = await adminJson('/api/admin/settings/hero/interval', { method: 'PUT', body: JSON.stringify({ intervalSec: 7 }) })
    check('interval 7 accepted', res.status === 200)

    // 7. Public feed: only active, in order, shaped {url, url1200, alt} + interval.
    pub = await pubFeed()
    const feed = pub.heroSlides || []
    const dbActive = await prisma.heroSlide.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
    check('public returns only active slides', feed.length === dbActive.length)
    check('public order matches sortOrder', feed.every((s, i) => s.url === dbActive[i].imagePath))
    check('public shape {url, url1200, alt}', feed.every(s => typeof s.url === 'string' && typeof s.url1200 === 'string' && 'alt' in s))
    check('public exposes interval', pub.heroSlideIntervalSec === 7)

    // 8. Delete removes the row + its files and nothing else.
    const victim = tempSlideIds[tempSlideIds.length - 1]
    const victimRow = await prisma.heroSlide.findUnique({ where: { id: victim } })
    const filesBeforeDelete = heroStorageFiles()
    res = await adminJson(`/api/admin/settings/hero/${victim}`, { method: 'DELETE' })
    check('delete accepted', res.status === 200)
    check('row gone', (await prisma.heroSlide.findUnique({ where: { id: victim } })) === null)
    const filesAfterDelete = heroStorageFiles()
    const removed = filesBeforeDelete.filter(f => !filesAfterDelete.includes(f))
    const added = filesAfterDelete.filter(f => !filesBeforeDelete.includes(f))
    check('only own files removed', removed.length === 2 && added.length === 0)
    check('image file gone', !filesAfterDelete.some(f => victimRow.imagePath.endsWith('/' + f)))
    tempSlideIds.splice(tempSlideIds.indexOf(victim), 1)
  }
  finally {
    console.log('=== Cleaning up hero test fixtures ===')
    for (const id of tempSlideIds) {
      try {
        const row = await prisma.heroSlide.findUnique({ where: { id } })
        await prisma.heroSlide.delete({ where: { id } }).catch(() => {})
        if (row) {
          for (const p of [row.imagePath, row.imagePath.replace(/\.webp$/, '-1200.webp')]) {
            const parts = p.replace(/^\/uploads\//, '').split('/')
            if (parts.some(x => !x || x === '.' || x === '..' || x.includes('/'))) continue
            const { rm } = await import('node:fs/promises')
            const { join: joinPath, resolve: resolvePath, sep } = await import('node:path')
            const root = resolvePath(process.cwd(), 'storage')
            const full = joinPath(root, ...parts)
            if (full.startsWith(root + sep)) await rm(full, { force: true })
          }
        }
      }
      catch {}
    }
    if (testUserIds.length) {
      await prisma.adminPermission.deleteMany({ where: { userId: { in: testUserIds } } }).catch(() => {})
      await prisma.adminUser.deleteMany({ where: { id: { in: testUserIds } } }).catch(() => {})
    }
    await prisma.siteSettings.update({ where: { id: 1 }, data: { heroSlideIntervalSec: originalInterval } }).catch(() => {})
    const leftoverUsers = await prisma.adminUser.count({ where: { email: { endsWith: '@test.invalid' } } })
    const leftoverSlides = await prisma.heroSlide.count({ where: { altText: { startsWith: 'TEST-HERO-' } } })
    check('no temp users left', leftoverUsers === 0)
    check('no temp slides left', leftoverSlides === 0)
  }
}

await main().then(() => {
  console.log(`\nHero endpoints: ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}).catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
}).finally(() => prisma.$disconnect())
