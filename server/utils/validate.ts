import { z } from 'zod'
import type { H3Event } from 'h3'

export const egyptPhone = z.string().trim().regex(/^01[0125][0-9]{8}$/, 'Invalid Egyptian phone number')

const idString = z.string().trim().min(1).max(100)

// ── Orders ──
export const orderItemSchema = z.object({
  productId: idString,
  quantity: z.coerce.number().int().min(1).max(100),
})

export const orderCreateSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: egyptPhone,
    governorate: z.string().trim().min(2).max(80),
    address: z.string().trim().max(500).nullish(),
    email: z.string().trim().email().max(160).nullish().or(z.literal('')),
  }),
  items: z.array(orderItemSchema).min(1).max(50),
  paymentMethod: z.enum(['COD', 'ONLINE']).default('COD'),
})

export const orderStatusSchema = z.object({
  status: z.enum(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']),
})

// ── Quotes ──
export const quoteItemSchema = z.object({
  productId: idString.nullish(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  isCustom: z.boolean().nullish(),
  name: z.string().trim().max(160).nullish(),
  nameEn: z.string().trim().max(160).nullish(),
  nameAr: z.string().trim().max(160).nullish(),
  price: z.coerce.number().min(0).max(100_000_000).nullish(),
  notes: z.string().trim().max(1000).nullish(),
  imagePath: z.string().trim().max(500).nullish(),
  coverImage: z.string().trim().max(500).nullish(),
})

export const quoteCreateSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  contactTitle: z.string().trim().max(120).nullish(),
  phone: egyptPhone,
  email: z.string().trim().email().max(160).nullish().or(z.literal('')),
  notes: z.string().trim().max(2000).nullish(),
  governorate: z.string().trim().max(80).nullish(),
  locale: z.enum(['ar', 'en']).nullish(),
  discountType: z.enum(['none', 'percentage', 'fixed']).nullish(),
  discountValue: z.coerce.number().min(0).max(100_000_000).nullish(),
  items: z.array(quoteItemSchema).min(1).max(50),
})

export const quoteUpdateSchema = z.object({
  companyName: z.string().trim().min(2).max(160).optional(),
  contactName: z.string().trim().min(2).max(120).optional(),
  contactTitle: z.string().trim().max(120).nullable().optional(),
  phone: egyptPhone.optional(),
  email: z.string().trim().email().max(160).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  governorate: z.string().trim().max(80).nullable().optional(),
  adminNotes: z.string().trim().max(2000).nullable().optional(),
  expiresAt: z.string().trim().max(40).nullable().optional(),
  status: z.enum(['New', 'Reviewed', 'Closed', 'Pending', 'Accepted', 'Rejected', 'Expired']).optional(),
  useDefaultTerms: z.boolean().optional(),
  customTermsAr: z.string().max(20000).nullable().optional(),
  customTermsEn: z.string().max(20000).nullable().optional(),
  discountType: z.enum(['none', 'percentage', 'fixed']).optional(),
  discountValue: z.coerce.number().min(0).max(100_000_000).optional(),
  items: z.array(quoteItemSchema).min(1).max(50).optional(),
})

export const quoteStatusSchema = z.object({
  status: z.enum(['New', 'Reviewed', 'Closed', 'Pending', 'Accepted', 'Rejected', 'Expired']),
})

// ── Services ──
export const serviceCreateSchema = z.object({
  slug: z.string().trim().max(120).nullish(),
  nameAr: z.string().trim().min(2).max(160),
  nameEn: z.string().trim().min(2).max(160),
  descriptionAr: z.string().max(10000).nullish(),
  descriptionEn: z.string().max(10000).nullish(),
  iconPath: z.string().trim().max(500).nullish(),
  sortOrder: z.coerce.number().int().min(0).max(100000).nullish(),
  isActive: z.boolean().nullish(),
  isFeatured: z.boolean().nullish(),
})

export const serviceUpdateSchema = serviceCreateSchema.partial()

export const serviceFieldCreateSchema = z.object({
  labelAr: z.string().trim().min(1).max(160),
  labelEn: z.string().trim().min(1).max(160),
  fieldType: z.enum(['text', 'textarea', 'number', 'phone', 'email', 'select', 'file', 'date']),
  isRequired: z.boolean().nullish(),
  sortOrder: z.coerce.number().int().min(0).max(100000).nullish(),
  options: z.array(z.string().trim().max(160)).max(50).nullish(),
})

export const serviceFieldUpdateSchema = serviceFieldCreateSchema.partial()

export const serviceOrderSchema = z.object({
  fieldIds: z.array(idString).min(1).max(100),
})

export const serviceRequestStatusSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'contacted', 'closed']),
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

/** Quote mutations are restricted to quotes.manage (plus super-admins). */
export async function requireQuotesManage(event: H3Event) {
  const user = await requireAuth(event)
  if (!user.isSuper && !user.permissions.includes('quotes.manage')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

/** Quote reads allow view or manage (plus super-admins). */
export async function requireQuotesView(event: H3Event) {
  const user = await requireAuth(event)
  if (!user.isSuper && !user.permissions.includes('quotes.view') && !user.permissions.includes('quotes.manage')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}
