// scripts/verify-parity.mjs
// Verifies 100% exact key parity between en.json and de.json.
import fs from 'node:fs'

const en = JSON.parse(fs.readFileSync('i18n/locales/en.json', 'utf8'))
const de = JSON.parse(fs.readFileSync('i18n/locales/de.json', 'utf8'))

function extractKeys(obj, prefix = '') {
  let keys = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(extractKeys(v, full))
    }
    else {
      keys.push(full)
    }
  }
  return keys
}

const enKeys = extractKeys(en).sort()
const deKeys = extractKeys(de).sort()

const missingInDe = enKeys.filter(k => !deKeys.includes(k))
const extraInDe = deKeys.filter(k => !enKeys.includes(k))

console.log(`Keys in en.json: ${enKeys.length}`)
console.log(`Keys in de.json: ${deKeys.length}`)

let ok = true
if (missingInDe.length > 0) {
  console.log('FAIL: Missing in de.json:', missingInDe)
  ok = false
}

if (extraInDe.length > 0) {
  console.log('FAIL: Extra in de.json:', extraInDe)
  ok = false
}

if (ok) {
  console.log(`PASS: de.json and en.json have 100% exact key parity (${enKeys.length} keys match perfectly).`)
}

process.exit(ok ? 0 : 1)
