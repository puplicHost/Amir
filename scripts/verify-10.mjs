// Roadmap Phase 10 checks: category seeding, expense CRUD, totals,
// CSV export (BOM, injection guard), permission gating.
// Prerequisites: dev server running, migrations applied.
// Run: node scripts/verify-10.mjs
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const prisma = new PrismaClient()

function envVal(key, fallback) {
  const m = readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))
  return (m ? m[1].trim().replace(/^"|"$/g, '') : fallback)
}

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

async function main() {
  const login = await fetch(`${BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: envVal('SEED_ADMIN_EMAIL', 'admin@amir.com'),
      password: envVal('SEED_ADMIN_PASSWORD', 'AmirAdmin123!'),
    }),
  })
  if (!login.ok) throw new Error(`admin login failed (${login.status})`)
  const cookie = login.headers.get('set-cookie')?.split(';')[0] || ''
  const adminFetch = (url, opts = {}) => fetch(`${BASE}${url}`, {
    ...opts,
    headers: { Cookie: cookie, ...(opts.headers || {}) },
  }).then(async r => ({ ok: r.ok, status: r.status, text: opts.raw ? await r.text() : null, json: opts.raw ? null : await r.json().catch(() => null) }))

  // 1. Categories auto-seed.
  const cats = await adminFetch('/api/admin/expense-categories')
  check('default categories seeded (incl. Miete)',
    cats.ok && (cats.json?.categories?.length || 0) >= 8
    && cats.json.categories.some((c) => c.nameDe === 'Miete'))
  const catId = cats.json.categories[0].id

  // 2. Create + totals + injection attempt.
  const e1 = await adminFetch('/api/admin/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      day: '2026-10-05', categoryId: catId, amountEur: 120.5,
      description: 'PH10 rent', vendor: 'Landlord', payMethod: 'transfer', taxPercent: 19,
    }),
  })
  check('expense created', e1.ok && e1.json?.expense?.amountCents === 12050)
  const e2 = await adminFetch('/api/admin/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      day: '2026-10-06', categoryId: catId, amountEur: 9.5,
      description: '=HYPERLINK("http://evil")', payMethod: 'cash',
    }),
  })
  check('formula-looking description accepted (guarded on export)', e2.ok)
  const list = await adminFetch('/api/admin/expenses?from=2026-10-01&to=2026-10-31')
  check('list total matches created rows', list.ok && list.json?.total === 13000)
  const id1 = e1.json.expense.id

  // 3. Export CSV (BOM checked on raw bytes: fetch text() strips it).
  const expRes = await fetch(`${BASE}/api/admin/expenses/export?from=2026-10-01&to=2026-10-31`, {
    headers: { Cookie: cookie },
  })
  const expBytes = Buffer.from(await expRes.arrayBuffer())
  const exp = { ok: expRes.ok, text: expBytes.toString('utf-8') }
  check('export 200 with BOM + header',
    exp.ok && expBytes[0] === 0xEF && expBytes[1] === 0xBB && expBytes[2] === 0xBF
    && exp.text.includes('Betrag (EUR)'))
  check('export guards formula injection', exp.text.includes(`'=HYPERLINK`))
  check('export has category + month summaries and grand total',
    exp.text.includes('Summe (EUR)') && exp.text.includes('130,00'))

  // 4. Soft delete removes from totals.
  const del = await adminFetch(`/api/admin/expenses/${id1}`, { method: 'DELETE' })
  const list2 = await adminFetch('/api/admin/expenses?from=2026-10-01&to=2026-10-31')
  check('soft-deleted row excluded from totals', del.ok && list2.json?.total === 950)

  // 5. Permission gating: staff gets 403.
  await prisma.adminUser.deleteMany({ where: { email: 'ph10-staff@test.invalid' } })
  const passHash = await bcrypt.hash('Ph10-Staff-123!', 10)
  await prisma.adminUser.create({
    data: { email: 'ph10-staff@test.invalid', name: 'PH10 Staff', passwordHash: passHash, role: 'STAFF', isActive: true },
  })
  const sLogin = await fetch(`${BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ph10-staff@test.invalid', password: 'Ph10-Staff-123!' }),
  })
  const sc = sLogin.headers.get('set-cookie')?.split(';')[0] || ''
  const forbidden = await fetch(`${BASE}/api/admin/expenses/export`, { headers: { Cookie: sc } })
  check('staff without permission gets 403 on export', forbidden.status === 403)

  await prisma.expense.deleteMany({ where: { description: { contains: 'PH10' } } })
  await prisma.expense.deleteMany({ where: { description: { startsWith: '=' } } })
  await prisma.adminUser.deleteMany({ where: { email: 'ph10-staff@test.invalid' } })
  console.log('cleanup: phase 10 fixtures removed')
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exitCode = fail ? 1 : 0
}

main().catch(async (e) => {
  console.error('Test crashed:', e?.message || e)
  await prisma.expense.deleteMany({ where: { description: { contains: 'PH10' } } }).catch(() => null)
  await prisma.adminUser.deleteMany({ where: { email: 'ph10-staff@test.invalid' } }).catch(() => null)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
