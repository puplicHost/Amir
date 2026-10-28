// Phase 1 — owner-confirmed salon service durations.
//
// Safety:
//  - dry-run by default; pass --apply to write
//  - refuses production or non-local databases
//  - matches each expected service by normalized name + section, never row order
//  - refuses to write when any mapping is ambiguous or missing
//  - backs up the original duration values to backups/ (gitignored)
//  - updates ONLY durationMin and needsDurationReview
//
// Usage:
//   node --env-file=.env scripts/update-service-durations.mjs
//   node --env-file=.env scripts/update-service-durations.mjs --apply
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

import { SERVICE_DURATION_SPEC as EXPECTED, normalizeServiceName as normalize } from './service-duration-spec.mjs'

const apply = process.argv.includes('--apply')
const prisma = new PrismaClient()


function databaseName() {
  const raw = process.env.DATABASE_URL || ''
  try {
    return new URL(raw).pathname.replace(/^\//, '') || '(none)'
  }
  catch {
    return '(unparseable)'
  }
}

function assertSafeEnvironment() {
  const raw = process.env.DATABASE_URL || ''
  let host = ''
  try {
    host = new URL(raw).hostname
  }
  catch {
    throw new Error('DATABASE_URL is missing or invalid')
  }
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run while NODE_ENV=production')
  }
  if (!local) {
    throw new Error(`Refusing non-local database host "${host}" (dev/test only)`)
  }
  console.log(`database: ${databaseName()} @ ${host} (non-production guard passed)`)
}

async function main() {
  assertSafeEnvironment()

  const services = await prisma.service.findMany({
    orderBy: [{ section: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      section: true,
      name: true,
      durationMin: true,
      needsDurationReview: true,
      priceAbCents: true,
      description: true,
      sortOrder: true,
      isActive: true,
    },
  })

  const byName = new Map()
  for (const service of services) {
    const key = `${service.section}|${normalize(service.name)}`
    const list = byName.get(key) || []
    list.push(service)
    byName.set(key, list)
  }

  const matched = []
  const ambiguous = []
  const missing = []
  for (const expected of EXPECTED) {
    const key = `${expected.section}|${normalize(expected.name)}`
    const candidates = byName.get(key) || []
    if (candidates.length === 1) matched.push({ expected, service: candidates[0] })
    else if (candidates.length > 1) ambiguous.push({ expected, candidates })
    else missing.push(expected)
  }

  const matchedIds = new Set(matched.map(m => m.service.id))
  const unexpected = services.filter(s => !matchedIds.has(s.id))

  console.log('\nservice mapping (id | section | name | current -> proposed | confidence)')
  for (const { expected, service } of matched) {
    const changed = service.durationMin !== expected.durationMin || service.needsDurationReview
    console.log([
      service.id,
      service.section,
      service.name,
      `${service.durationMin} -> ${expected.durationMin} min`,
      service.needsDurationReview ? 'review-flag cleared' : 'review-flag already clear',
      changed ? 'UPDATE' : 'unchanged',
    ].join(' | '))
  }
  for (const { expected, candidates } of ambiguous) {
    console.log(`AMBIGUOUS | ${expected.section} | ${expected.name} | ${candidates.map(c => `${c.id}:${c.name}:${c.durationMin}`).join(', ')}`)
  }
  for (const expected of missing) {
    console.log(`MISSING | ${expected.section} | ${expected.name}`)
  }
  for (const service of unexpected) {
    console.log(`UNMAPPED | ${service.id} | ${service.section} | ${service.name} | ${service.durationMin} min`)
  }

  console.log(`\nmatched=${matched.length} ambiguous=${ambiguous.length} missing=${missing.length} unmapped=${unexpected.length}`)
  if (ambiguous.length || missing.length || unexpected.length || services.length !== EXPECTED.length) {
    throw new Error('Mapping is not 1:1; refusing to write. Resolve ambiguities with the owner first.')
  }

  if (!apply) {
    console.log('\nDRY RUN: no records changed. Re-run with --apply to persist.')
    return
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = resolve(process.cwd(), 'backups')
  mkdirSync(backupDir, { recursive: true })
  const backupPath = resolve(backupDir, `service-durations-${stamp}.json`)
  writeFileSync(backupPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    database: databaseName(),
    services: matched.map(({ expected, service }) => ({
      id: service.id,
      section: service.section,
      name: service.name,
      previousDurationMin: service.durationMin,
      previousNeedsDurationReview: service.needsDurationReview,
      newDurationMin: expected.durationMin,
      priceAbCents: service.priceAbCents,
    })),
  }, null, 2))
  console.log(`backup written: ${backupPath}`)

  await prisma.$transaction(async (tx) => {
    for (const { expected, service } of matched) {
      if (service.durationMin === expected.durationMin && service.needsDurationReview === false) continue
      await tx.service.update({
        where: { id: service.id },
        data: {
          durationMin: expected.durationMin,
          needsDurationReview: false,
        },
      })
    }
  })

  const after = await prisma.service.findMany({
    where: { id: { in: matched.map(m => m.service.id) } },
    select: {
      id: true,
      section: true,
      name: true,
      durationMin: true,
      needsDurationReview: true,
      priceAbCents: true,
      description: true,
      sortOrder: true,
      isActive: true,
    },
  })
  const afterById = new Map(after.map(s => [s.id, s]))
  let failures = 0
  for (const { expected, service } of matched) {
    const current = afterById.get(service.id)
    const ok = current
      && current.durationMin === expected.durationMin
      && current.needsDurationReview === false
      && current.priceAbCents === service.priceAbCents
      && current.description === service.description
      && current.sortOrder === service.sortOrder
      && current.isActive === service.isActive
      && current.name === service.name
      && current.section === service.section
    if (!ok) {
      failures++
      console.log(`FAIL verification for ${service.id} ${service.name}`)
    }
  }
  console.log(`\napplied=${matched.length} verificationFailures=${failures}`)
  if (failures) throw new Error('Post-update verification failed')
}

main()
  .catch((error) => {
    console.error(`\nERROR: ${error?.message || error}`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
