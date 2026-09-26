// One-time carryover: migrate the legacy static banner (SiteSettings
// bannerText*/bannerButton* fields) into the new Banner system, then clear
// the legacy fields so the old homepage callout falls back to i18n defaults.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const settings = await prisma.siteSettings.findFirst()
  if (!settings) {
    console.log('No settings row — nothing to carry over.')
    return
  }
  const hasBanner = Boolean(
    (settings.bannerTextEn && settings.bannerTextEn.trim())
    || (settings.bannerTextAr && settings.bannerTextAr.trim()),
  )
  if (!hasBanner) {
    console.log('No legacy banner text — nothing to carry over.')
    return
  }
  const existing = await prisma.banner.count()
  const banner = await prisma.banner.create({
    data: {
      titleAr: settings.bannerTextAr || settings.bannerTextEn,
      titleEn: settings.bannerTextEn || settings.bannerTextAr,
      descriptionAr: null,
      descriptionEn: null,
      backgroundImagePath: null,
      buttonTextAr: settings.bannerButtonTextAr || null,
      buttonTextEn: settings.bannerButtonTextEn || null,
      buttonLinkType: settings.bannerButtonUrl ? 'page' : null,
      buttonLinkValue: settings.bannerButtonUrl || null,
      placement: 'above_footer',
      widthPercent: 100,
      isActive: true,
      sortOrder: existing + 1,
    },
  })
  console.log(`Carried over legacy banner as ${banner.id} (above_footer).`)
  await prisma.siteSettings.update({
    where: { id: settings.id },
    data: {
      bannerTextAr: null,
      bannerTextEn: null,
      bannerButtonTextAr: null,
      bannerButtonTextEn: null,
      bannerButtonUrl: null,
    },
  })
  console.log('Legacy banner fields cleared.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
