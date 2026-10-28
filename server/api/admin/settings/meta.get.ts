import { requirePermission } from '../../../utils/auth'
import { getSiteSettings } from '../../../utils/site-settings'

// Returns Meta config with the access token masked (never raw).
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.meta')
  const settings = await getSiteSettings()
  const config = useRuntimeConfig(event).public as Record<string, string>

  return {
    meta: {
      pixelId: settings?.metaPixelId || '',
      testEventCode: settings?.metaTestEventCode || '',
      enabled: settings?.metaEnabled ?? false,
      hasAccessToken: !!settings?.metaCapiToken,
      siteUrl: config.siteUrl || process.env.NUXT_PUBLIC_SITE_URL || '',
    },
  }
})
