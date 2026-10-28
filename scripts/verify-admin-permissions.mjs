// Admin RBAC key integrity: every permission string referenced by the UI
// (useAdminCan / requiredPermission) and by server endpoints
// (requirePermission) must exist in shared/permissions.ts.
// Run: node scripts/verify-admin-permissions.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { ALL_PERMISSIONS } from '../shared/permissions.ts'

const ROOTS = ['app', 'server/api/admin']
const KNOWN = new Set(ALL_PERMISSIONS)
const findings = []

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(vue|ts)$/.test(name)) out.push(p)
  }
  return out
}

function scan(file, pattern, label) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(pattern)) {
    const key = m[1]
    if (!KNOWN.has(key)) findings.push(`${label}: ${file} -> ${key}`)
  }
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    scan(file, /useAdminCan\(\s*'([^']+)'/g, 'useAdminCan')
    if (file.startsWith('app/')) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/requiredPermission:\s*(\[[^\]]+\]|'[^']+')/g)) {
        for (const k of m[1].matchAll(/'([^']+)'/g)) {
          if (!KNOWN.has(k[1])) findings.push(`requiredPermission: ${file} -> ${k[1]}`)
        }
      }
    }
    if (file.startsWith('server/api/admin')) {
      for (const m of readFileSync(file, 'utf8').matchAll(/requirePermission\([^,]+,\s*(\[[^\]]+\]|'[^']+')/g)) {
        for (const k of m[1].matchAll(/'([^']+)'/g)) {
          if (!KNOWN.has(k[1])) findings.push(`requirePermission: ${file} -> ${k[1]}`)
        }
      }
    }
  }
}

if (findings.length) {
  console.error(`FAIL ${findings.length} unknown permission reference(s)`)
  for (const f of findings) console.error(' -', f)
  process.exit(1)
}
console.log(`ok   permission catalog consistent (${KNOWN.size} keys)`)
