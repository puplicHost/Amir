import { defineCachedEventHandler } from 'nitropack/runtime'
import { getSiteSettings } from '../../utils/site-settings'

// Public Meta Pixel bootstrap: only the Pixel ID + enabled flag.
// Never exposes the CAPI token.
export default defineCachedEventHandler(async () => {
  const settings = await getSiteSettings()
  const enabled = Boolean(settings?.metaEnabled && settings?.metaPixelId)
  return {
    enabled,
    pixelId: enabled ? settings!.metaPixelId : null,
  }
}, { maxAge: 60 })
