// AUDIT P2-15: single accessor for the SiteSettings singleton.
//
// The schema marks `singleton` as a unique nullable flag, so exactly one row
// can be authoritative. Reads fall back to the oldest legacy row if a database
// was restored before the marker existed; writes always target that row (never
// a hard-coded `id = 1`), so a sequence reset or imported dump cannot make the
// admin write to one row while public reads a different one.

type SettingsData = Record<string, unknown>

function withoutUndefined(data: SettingsData): SettingsData {
  const out: SettingsData = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/** Authoritative settings row (singleton when the migration is applied). */
export async function getSiteSettings() {
  const marked = await prisma.siteSettings.findFirst({ where: { singleton: true } })
  if (marked) return marked
  return prisma.siteSettings.findFirst({ orderBy: { id: 'asc' } })
}

/**
 * Update the singleton, creating it when absent. `update` is applied on an
 * existing row; `create` supplies defaults for a brand-new database.
 */
export async function upsertSiteSettings(update: SettingsData, create: SettingsData = {}) {
  const existing = await getSiteSettings()
  if (existing) {
    // Heal an unmarked legacy row so the invariant is restored. If another row
    // already owns the marker, keep reading/writing the marked row instead.
    if (existing.singleton !== true) {
      try {
        const healed = await prisma.siteSettings.update({
          where: { id: existing.id },
          data: { singleton: true },
        })
        return prisma.siteSettings.update({
          where: { id: healed.id },
          data: withoutUndefined(update),
        })
      }
      catch {
        const marked = await prisma.siteSettings.findFirst({ where: { singleton: true } })
        if (marked) {
          return prisma.siteSettings.update({
            where: { id: marked.id },
            data: withoutUndefined(update),
          })
        }
      }
    }
    return prisma.siteSettings.update({
      where: { id: existing.id },
      data: withoutUndefined(update),
    })
  }

  return prisma.siteSettings.create({
    data: {
      siteNameAr: 'AMIR',
      siteNameEn: 'Amir',
      ...withoutUndefined(create),
      ...withoutUndefined(update),
      singleton: true,
    },
  })
}
