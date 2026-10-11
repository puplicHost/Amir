import { parseBody, contactMessageSchema } from '../../utils/validate'
import { sendPushToAdmins } from '../../utils/fcm'

// Public contact-form intake. Rate limited by server/middleware/rate-limit.ts (5 req/min).
export default defineEventHandler(async (event) => {
  const body = await parseBody(event, contactMessageSchema)

  const message = await prisma.contactMessage.create({
    data: {
      name: body.name,
      phone: body.phone,
      message: body.message,
    },
  })

  // Notify admins — never fail the request if push is unavailable.
  try {
    await sendPushToAdmins({
      permission: 'inbox.manage',
      title: 'Neue Kundenanfrage',
      body: body.message.slice(0, 60),
      url: '/admin/inbox',
      type: 'new_contact_message',
    })
  }
  catch (e) {
    console.warn('[contact] FCM fan-out failed:', (e as Error)?.message || e)
  }

  return { id: message.id, createdAt: message.createdAt }
})
