import { requirePermission } from '../../../utils/auth'

// Customer mail settings (Roadmap Phase 7). Secrets are never returned raw.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const settings = await prisma.siteSettings.findFirst()
  return {
    mail: {
      provider: (settings as any)?.mailProvider || 'log',
      from: (settings as any)?.mailFrom || '',
      fromName: (settings as any)?.mailFromName || '',
      httpEndpoint: (settings as any)?.mailHttpEndpoint || '',
      hasHttpKey: Boolean((settings as any)?.mailHttpKey),
    },
  }
})
