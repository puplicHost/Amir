import { requireSuperAdmin } from '../../../utils/auth'
import { getMarketingOverview } from '../../../utils/marketing/config'

// Sanitized marketing configuration, status, totals and recent diagnostics.
// Super-Admin only: this endpoint exposes configuration metadata (never secrets).
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  return getMarketingOverview()
})
