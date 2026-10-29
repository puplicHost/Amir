import { requireSuperAdmin } from '../../../utils/auth'
import { getMarketingProvider } from '../../../../shared/marketing'
import { saveIntegration, type SaveIntegrationInput } from '../../../utils/marketing/config'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const platform = getRouterParam(event, 'platform') || ''
  if (!getMarketingProvider(platform)) {
    throw createError({ statusCode: 404, statusMessage: 'Unknown marketing platform' })
  }
  const body = (await readBody(event)) || {}
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
  }
  const input: SaveIntegrationInput = {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    config: body.config && typeof body.config === 'object' && !Array.isArray(body.config) ? body.config : undefined,
    secrets: body.secrets && typeof body.secrets === 'object' && !Array.isArray(body.secrets) ? body.secrets : undefined,
    events: body.events && typeof body.events === 'object' && !Array.isArray(body.events) ? body.events : undefined,
    clearSecrets: Array.isArray(body.clearSecrets)
      ? body.clearSecrets.filter((x: unknown): x is string => typeof x === 'string')
      : undefined,
  }
  const integration = await saveIntegration(platform as any, input)
  return { integration }
})
