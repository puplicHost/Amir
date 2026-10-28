import { requirePermission } from '../../../utils/auth'
import { parseBody, mailSettingsSchema } from '../../../utils/validate'
import { encryptData } from '../../../utils/encryption'
import { upsertSiteSettings } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const body = await parseBody(event, mailSettingsSchema)
  const data: Record<string, unknown> = {}

  if (body.mailProvider !== undefined) data.mailProvider = body.mailProvider
  if (body.mailFrom !== undefined) {
    data.mailFrom = body.mailFrom?.trim() ? body.mailFrom.trim() : null
  }
  if (body.mailFromName !== undefined) {
    data.mailFromName = body.mailFromName?.trim() ? body.mailFromName.trim() : null
  }
  if (body.mailHttpEndpoint !== undefined) {
    data.mailHttpEndpoint = body.mailHttpEndpoint?.trim() ? body.mailHttpEndpoint.trim() : null
  }
  // Only replace the stored key when a non-empty value is supplied — a blank
  // field means "keep the existing key", never "erase it" (the admin form
  // always submits an empty string for an untouched password field).
  if (typeof body.mailHttpKey === 'string' && body.mailHttpKey.trim()) {
    data.mailHttpKey = encryptData(body.mailHttpKey.trim())
  }

  await upsertSiteSettings(data, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
  return { success: true }
})
