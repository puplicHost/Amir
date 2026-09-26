import { defineCachedEventHandler } from 'nitropack/runtime'
import { prisma } from '../../utils/prisma'

// Public Meta Pixel bootstrap: only the Pixel ID + enabled flag.
// Never exposes the CAPI token.
export default defineCachedEventHandler(async () => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })
  const enabled = Boolean(settings?.metaEnabled && settings?.metaPixelId)
  return {
    enabled,
    pixelId: enabled ? settings!.metaPixelId : null,
  }
}, { maxAge: 60 })
