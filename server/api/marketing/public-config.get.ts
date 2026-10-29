import { defineCachedEventHandler } from 'nitropack/runtime'
import { getPublicMarketingConfig } from '../../utils/marketing/config'

// Browser-safe IDs and enabled browser events only. Never contains secrets.
export default defineCachedEventHandler(async () => {
  const config = await getPublicMarketingConfig()
  return { platforms: config.platforms }
}, { maxAge: 60 })
