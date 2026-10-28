import { z } from 'zod'
import type { H3Event } from 'h3'
import {
  ADMIN_ROLES,
  BOOKING_STATUSES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  SERVICE_SECTIONS,
} from '../../shared/booking'

// German/international phone: optional +, digits/spaces/dashes, 6–20 chars.
export const salonPhone = z.string().trim().regex(/^\+?[0-9][0-9\s\-/]{5,19}$/, 'Invalid phone number')

// ── Booking domain enums (no free-form status strings from any endpoint) ──
export const serviceSectionEnum = z.enum(SERVICE_SECTIONS)
export const paymentProviderEnum = z.enum(PAYMENT_PROVIDERS)
export const paymentStatusEnum = z.enum(PAYMENT_STATUSES)
export const bookingStatusEnum = z.enum(BOOKING_STATUSES)
export const adminRoleEnum = z.enum(ADMIN_ROLES)

// ── Contact inbox ──
export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: salonPhone,
  message: z.string().trim().min(1).max(1000),
})

// ── Services (salon shape, Phase 2b: German-only content) ──
export const serviceCreateSchema = z.object({
  slug: z.string().trim().max(120).nullish(),
  section: serviceSectionEnum,
  name: z.string().trim().min(2).max(160),
  description: z.string().max(10000).nullish(),
  priceAbCents: z.coerce.number().int().min(0).max(100_000_000),
  durationMin: z.coerce.number().int().min(5).max(1440).nullish(),
  needsDurationReview: z.boolean().nullish(),
  sortOrder: z.coerce.number().int().min(0).max(100000).nullish(),
  isActive: z.boolean().nullish(),
  featuredOnHomepage: z.boolean().nullish(),
  showOnHome: z.boolean().nullish(),
})

export const serviceUpdateSchema = serviceCreateSchema.partial()

// ── Homepage hero slideshow (Phase: multi-image hero) ──
export const heroSlideOrderSchema = z.object({
  order: z.array(z.string().trim().min(1).max(100)).min(1).max(8),
})

export const heroSlideUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  altText: z.string().trim().max(200).nullable().optional(),
}).refine(o => o.isActive !== undefined || o.altText !== undefined, {
  message: 'Nothing to update',
})

export const heroIntervalSchema = z.object({
  intervalSec: z.coerce.number().int().min(3).max(15),
})

// ── Working hours (Phase 2b) ──
export const workingHoursDaySchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  openMin: z.coerce.number().int().min(0).max(1439),
  closeMin: z.coerce.number().int().min(1).max(1440),
  isClosed: z.boolean().nullish(),
}).refine(d => d.isClosed || d.closeMin > d.openMin, {
  message: 'closeMin must be after openMin unless closed',
})

export const workingHoursUpdateSchema = z.object({
  days: z.array(workingHoursDaySchema).min(1).max(7),
})

// ── Salon booking (Phase 2c, guest; staff choice since Roadmap Phase 4) ──
export const bookingCreateSchema = z.object({
  serviceSlug: z.string().trim().min(1).max(160),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: salonPhone,
  customerEmail: z.string().trim().email().max(160).nullish().or(z.literal('')),
  startsAt: z.string().trim().datetime({ offset: true }),
  locale: z.enum(['de', 'en']).nullish(),
  whatsappReminder: z.boolean().optional(),
  staffId: z.string().trim().min(1).max(100).nullish().or(z.literal('')),
  note: z.string().trim().max(1000).nullish(),
  idempotencyKey: z.string().trim().uuid().nullish(),
  marketingConsent: z.boolean().optional(),
  fbp: z.string().trim().max(100).regex(/^[a-zA-Z0-9._-]+$/).nullable().optional(),
  fbc: z.string().trim().max(100).regex(/^[a-zA-Z0-9._-]+$/).nullable().optional(),
})

export const bookingPaySchema = z.object({
  provider: paymentProviderEnum,
})

// ── Admin booking management schemas (Phase 2d) ──
export const bookingAssignSchema = z.object({
  staffId: z.string().trim().min(1).max(100),
})

export const staffCancelSchema = z.object({
  bookingIds: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
  reason: z.string().trim().max(500).optional(),
})

export const refundHandledSchema = z.object({
  note: z.string().trim().max(500).optional(),
})

// ── Manual booking + reschedule (Roadmap Phase 5) ──
export const manualSourceEnum = z.enum(['WALK_IN', 'WHATSAPP', 'PHONE'])
export const manualPaymentModeEnum = z.enum(['paid_in_salon', 'pending', 'pay_link'])

export const manualBookingSchema = z.object({
  serviceId: z.string().trim().min(1).max(100),
  staffId: z.string().trim().min(1).max(100).nullish().or(z.literal('')),
  startsAt: z.string().trim().datetime({ offset: true }),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: salonPhone,
  customerEmail: z.string().trim().email().max(160).nullish().or(z.literal('')),
  note: z.string().trim().max(1000).nullish(),
  source: manualSourceEnum,
  paymentMode: manualPaymentModeEnum,
  paymentMethod: z.enum(['cash', 'card']).nullish(),
})

export const bookingRescheduleSchema = z.object({
  startsAt: z.string().trim().datetime({ offset: true }),
  staffId: z.string().trim().min(1).max(100).nullish().or(z.literal('')),
})

// ── Staff booking admin (Roadmap Phase 4) ──
export const staffProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  imagePath: z.string().trim().max(500).nullable().optional(),
  isBookable: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
})

export const staffServicesSchema = z.object({
  // Empty array = staff performs all services (default).
  serviceIds: z.array(z.string().trim().min(1).max(100)).max(200),
})

export const staffScheduleUpdateSchema = z.object({
  days: z.array(workingHoursDaySchema).min(1).max(7),
})

export const staffTimeOffCreateSchema = z.object({
  startsAt: z.string().trim().datetime({ offset: true }),
  endsAt: z.string().trim().datetime({ offset: true }),
  reason: z.string().trim().max(500).nullish(),
}).refine(d => Date.parse(d.endsAt) > Date.parse(d.startsAt), {
  message: 'endsAt must be after startsAt',
})

export const salonClosureCreateSchema = z.object({
  day: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'day must be YYYY-MM-DD'),
  reason: z.string().trim().max(500).nullish(),
})

// ── Salon expenses (Roadmap Phase 10) ──
export const expenseCategorySchema = z.object({
  nameDe: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
})

export const expenseSchema = z.object({
  day: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'day must be YYYY-MM-DD'),
  categoryId: z.string().trim().min(1).max(100),
  amountEur: z.coerce.number().min(0.01).max(10000000),
  description: z.string().trim().max(1000).nullish(),
  vendor: z.string().trim().max(160).nullish(),
  payMethod: z.enum(['cash', 'card', 'transfer', 'other']).optional(),
  taxPercent: z.coerce.number().int().min(0).max(100).nullish(),
})

// ── Customer mail settings (Roadmap Phase 7) ──
export const mailSettingsSchema = z.object({
  mailProvider: z.enum(['log', 'http']).optional(),
  mailFrom: z.string().trim().email().max(160).nullable().optional().or(z.literal('')),
  mailFromName: z.string().trim().max(160).nullable().optional().or(z.literal('')),
  mailHttpEndpoint: z.string().trim().url().max(500).nullable().optional().or(z.literal('')),
  mailHttpKey: z.string().trim().max(1000).nullable().optional().or(z.literal('')),
})

export const testEmailSchema = z.object({
  to: z.string().trim().email().max(160),
})

// ── Staff absence (Roadmap Phase 6) ──
export const staffUnavailableSchema = z.object({
  from: z.string().trim().datetime({ offset: true }),
  to: z.string().trim().datetime({ offset: true }),
  reason: z.string().trim().max(500).nullish(),
}).refine(d => Date.parse(d.to) > Date.parse(d.from), {
  message: 'to must be after from',
})

// ── Salon booking/payment settings (Phase 2b) ──
export const paymentSettingsSchema = z.object({
  stripeEnabled: z.boolean().optional(),
  stripePublishableKey: z.string().trim().max(200).nullable().optional(),
  stripeSecretKey: z.string().trim().max(500).nullable().optional(),
  stripeWebhookSecret: z.string().trim().max(500).nullable().optional(),
  paypalEnabled: z.boolean().optional(),
  paypalClientId: z.string().trim().max(200).nullable().optional(),
  paypalSecret: z.string().trim().max(500).nullable().optional(),
  paypalWebhookId: z.string().trim().max(200).nullable().optional(),
  paypalMode: z.enum(['sandbox', 'live']).optional(),
})

export const bookingSettingsSchema = z.object({
  whatsappNumber: z.string().trim().max(40).nullable().optional(),
  businessName: z.string().trim().max(160).nullable().optional(),
  businessAddress: z.string().trim().max(500).nullable().optional(),
  slotStepMin: z.coerce.number().int().min(5).max(120).optional(),
  holdTtlMin: z.coerce.number().int().min(5).max(120).optional(),
  depositPercent: z.coerce.number().int().min(1).max(100).optional(),
  timezone: z.string().trim().max(60).optional(),
  bookingMinLeadMin: z.coerce.number().int().min(0).max(1440).optional(),
  manualHoldTtlMin: z.coerce.number().int().min(30).max(10080).optional(),
  cancellationWindowHours: z.coerce.number().int().min(0).max(720).optional(),
  reminderLeadMin: z.coerce.number().int().min(15).max(1440).optional(),
  reminderEmailEnabled: z.boolean().optional(),
  reassignmentWaDe: z.string().trim().max(1000).nullable().optional(),
  reassignmentWaEn: z.string().trim().max(1000).nullable().optional(),
})

// ── Helper ──
export async function parseBody<T extends z.ZodTypeAny>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const raw = await readBody(event)
  const parsed = schema.safeParse(raw ?? {})
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first?.path?.length ? ` (${first.path.join('.')})` : ''
    throw createError({ statusCode: 400, statusMessage: `Invalid request body: ${first?.message || 'validation failed'}${where}` })
  }
  return parsed.data
}
