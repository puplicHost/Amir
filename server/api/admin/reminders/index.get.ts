import { requirePermission } from '../../../utils/auth'
import { waLink } from '../../../../shared/booking'

// Due reminders feed (Roadmap Phase 9): upcoming paid+assigned bookings with
// customer contact, email-reminder state and WhatsApp opt-in. The admin sends
// WhatsApp reminders manually via wa.me links.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['bookings.view_all', 'bookings.view_own'])
  const canViewAll = user.isSuper || user.permissions.includes('bookings.view_all')
  const q = getQuery(event)
  const hours = Math.min(24, Math.max(1, Number(q.hours) || 3))
  const now = new Date()
  const until = new Date(now.getTime() + hours * 3600000)

  const rows = await prisma.booking.findMany({
    where: {
      paymentStatus: 'PAID',
      status: 'ASSIGNED',
      startsAt: { gt: now, lte: until },
      ...(canViewAll ? {} : { assignedStaffId: user.userId }),
    },
    orderBy: { startsAt: 'asc' },
    take: 200,
    include: {
      service: { select: { name: true } },
      assignedStaff: { select: { id: true, name: true } },
      outbox: {
        where: { type: 'reminder' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, sentAt: true },
      },
    },
  })

  return {
    hours,
    isStaffView: !canViewAll,
    reminders: rows.map(b => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail,
      waLink: waLink(b.customerPhone),
      whatsappOptIn: (b as any).whatsappReminder ?? false,
      startsAt: b.startsAt,
      serviceName: b.service.name,
      staffName: b.assignedStaff?.name ?? null,
      emailReminder: b.outbox[0]?.status ?? null,
      emailSentAt: b.outbox[0]?.sentAt ?? null,
    })),
  }
})
