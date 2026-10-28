import { requirePermission } from '../../../utils/auth'
import { parseBody, testEmailSchema } from '../../../utils/validate'
import { sendMail } from '../../../utils/mailer'

// Send a test mail through the configured provider (Roadmap Phase 7).
// Direct send (no outbox). Rate-limited via middleware.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.business')
  const body = await parseBody(event, testEmailSchema)
  try {
    await sendMail({
      to: body.to,
      subject: 'AMIR test mail',
      text: 'This is a test mail from your AMIR studio. If you received it, customer mails are configured correctly.',
      html: '<p>This is a test mail from your AMIR studio. If you received it, customer mails are configured correctly.</p>',
    })
  }
  catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: `Test mail failed: ${String((e as Error)?.message || e).slice(0, 200)}` })
  }
  return { success: true }
})
