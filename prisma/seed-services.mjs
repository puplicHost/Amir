// Phase 2a: seed the 27 salon services from the brief (EUR "ab" prices).
// Idempotent: upserts by slug, never deletes.
// Re-runs update only catalogue fields (section/name/description/price/sortOrder)
// and NEVER touch admin-maintained fields (durationMin, needsDurationReview, isActive).
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PLACEHOLDER_DURATION_MIN = 30

const SERVICES = [
  // ── DAMEN ──
  { slug: 'damen-waschen-foehnen-kurz', section: 'DAMEN', name: 'Waschen, Föhnen, kurz', priceAbCents: 2800 },
  { slug: 'damen-waschen-schneiden-foehnen-kurz', section: 'DAMEN', name: 'Waschen, Schneiden, Föhnen, kurz', priceAbCents: 4600 },
  { slug: 'damen-waschen-schneiden-schulterlang', section: 'DAMEN', name: 'Waschen, Schneiden, schulterlang', priceAbCents: 5000 },
  { slug: 'damen-waschen-schneiden-foehnen-lang', section: 'DAMEN', name: 'Waschen, Schneiden, Föhnen lang', priceAbCents: 5500 },
  { slug: 'damen-waschen-schneiden-kurz', section: 'DAMEN', name: 'Waschen, Schneiden, kurz', priceAbCents: 3900 },
  { slug: 'damen-waschen-schneiden-lang', section: 'DAMEN', name: 'Waschen, Schneiden, lang', priceAbCents: 4900 },
  { slug: 'damen-dauerwelle', section: 'DAMEN', name: 'Dauerwelle', priceAbCents: 8900 },
  { slug: 'damen-farbe-ansatz', section: 'DAMEN', name: 'Farbe Ansatz', priceAbCents: 3900 },
  { slug: 'damen-farbe-komplett', section: 'DAMEN', name: 'Farbe komplett', priceAbCents: 4900 },
  { slug: 'damen-folienstraehnen-schulterlang', section: 'DAMEN', name: 'Foliensträhnen schulterlang', priceAbCents: 7900 },
  { slug: 'damen-balayage-olaplex', section: 'DAMEN', name: 'Balayage inkl. Olaplex-Behandlung, Abmattierung', priceAbCents: 20000 },
  { slug: 'damen-ombre-olaplex', section: 'DAMEN', name: 'Ombré inkl. Olaplex-Behandlung, Abmattierung', priceAbCents: 25000 },
  // ── HERREN ──
  { slug: 'herren-haarschnitt-maschine-schere', section: 'HERREN', name: 'Haarschnitt (Maschine & Schere)', priceAbCents: 2600 },
  { slug: 'herren-haarwaschen-oder-foehnen', section: 'HERREN', name: 'Haarwaschen oder Föhnen', priceAbCents: 600 },
  { slug: 'herren-haarschnitt-kamm-schere', section: 'HERREN', name: 'Haarschnitt (Kamm & Schere)', priceAbCents: 2900 },
  { slug: 'herren-waschen-schneiden-styling', section: 'HERREN', name: 'Waschen, Schneiden, Styling', priceAbCents: 3700 },
  { slug: 'herren-bart-formen-schneiden', section: 'HERREN', name: 'Bart formen, schneiden inkl. Condition, Öl', priceAbCents: 2500 },
  // ── KINDER ──
  { slug: 'kinder-maedchen-bis-10-jahre', section: 'KINDER', name: 'Mädchen bis 10 Jahre', priceAbCents: 2500 },
  { slug: 'kinder-maedchen-bis-16-jahre', section: 'KINDER', name: 'Mädchen bis 16 Jahre', priceAbCents: 2900 },
  { slug: 'kinder-jungen-bis-10-jahre', section: 'KINDER', name: 'Jungen bis 10 Jahre', priceAbCents: 2400 },
  { slug: 'kinder-jungen-bis-16-jahre', section: 'KINDER', name: 'Jungen bis 16 Jahre', priceAbCents: 2500 },
  // ── KOSMETIK ──
  { slug: 'kosmetik-augenbrauen-zupfen-faerben', section: 'KOSMETIK', name: 'Augenbrauen zupfen mit Faden oder färben', priceAbCents: 1500 },
  { slug: 'kosmetik-wimpern-faerben', section: 'KOSMETIK', name: 'Wimpern färben', priceAbCents: 1500 },
  { slug: 'kosmetik-abend-make-up', section: 'KOSMETIK', name: 'Abend Make-Up', priceAbCents: 5900 },
  { slug: 'kosmetik-braut-make-up', section: 'KOSMETIK', name: 'Braut Make-Up', priceAbCents: 6500 },
  { slug: 'kosmetik-hochstecken', section: 'KOSMETIK', name: 'Hochstecken', priceAbCents: 10000 },
  { slug: 'kosmetik-gesichtsreinigungspaket', section: 'KOSMETIK', name: 'Gesichtsreinigungspaket', priceAbCents: 7000 },
]

async function main() {
  let created = 0
  let updated = 0
  for (const [i, s] of SERVICES.entries()) {
    const existing = await prisma.service.findUnique({ where: { slug: s.slug } })
    if (existing) {
      await prisma.service.update({
        where: { slug: s.slug },
        data: {
          section: s.section,
          name: s.name,
          description: null,
          priceAbCents: s.priceAbCents,
          sortOrder: i,
        },
      })
      updated++
    }
    else {
      await prisma.service.create({
        data: {
          slug: s.slug,
          section: s.section,
          name: s.name,
          description: null,
          priceAbCents: s.priceAbCents,
          durationMin: PLACEHOLDER_DURATION_MIN,
          needsDurationReview: true,
          isActive: true,
          sortOrder: i,
        },
      })
      created++
    }
  }
  console.log(`seed-services: created=${created} updated=${updated} total=${SERVICES.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
