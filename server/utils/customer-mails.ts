// Customer mail templates, German + English (Roadmap Phase 7).
// No sensitive data in any template: no payment details, only the booking
// reference. Self-service links carry the unguessable manageToken.

export type CustomerLocale = 'de' | 'en'

export function toCustomerLocale(v: unknown): CustomerLocale {
  return v === 'en' ? 'en' : 'de'
}

export interface BookingMailContext {
  customerName: string
  serviceName: string
  startsAt: Date
  staffName?: string | null
  bookingNumber: string
  manageUrl?: string | null
  studioName?: string | null
  studioAddress?: string | null
  /** Salon timezone from settings; falls back to Europe/Berlin. */
  timeZone?: string | null
  extra?: string | null
}

export interface BuiltMail {
  subject: string
  text: string
  html: string
}

function fmtDate(d: Date, locale: CustomerLocale, timeZone?: string | null): string {
  return d.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', {
    timeZone: timeZone || 'Europe/Berlin',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function wrapHtml(locale: CustomerLocale, title: string, lines: string[]): string {
  const body = lines.map(l => `<p style="margin:0 0 8px">${l}</p>`).join('')
  return `<!doctype html><html lang="${locale}"><body style="font-family:sans-serif;max-width:560px">${body}</body></html>`
}

function lines(locale: CustomerLocale, ctx: BookingMailContext, intro: string, outro: string): { text: string, html: string } {
  const L: string[] = [
    locale === 'de' ? `Hallo ${ctx.customerName}!` : `Hello ${ctx.customerName}!`,
    '',
    intro,
    '',
    `${locale === 'de' ? 'Leistung' : 'Service'}: ${ctx.serviceName}`,
    `${locale === 'de' ? 'Termin' : 'Appointment'}: ${fmtDate(ctx.startsAt, locale, ctx.timeZone)}`,
    ...(ctx.staffName ? [`${locale === 'de' ? 'Stylist' : 'Stylist'}: ${ctx.staffName}`] : []),
    `${locale === 'de' ? 'Buchungsnummer' : 'Booking reference'}: ${ctx.bookingNumber}`,
    ...(ctx.studioAddress ? [`${locale === 'de' ? 'Adresse' : 'Address'}: ${ctx.studioAddress}`] : []),
    ...(ctx.manageUrl ? ['', `${locale === 'de' ? 'Buchung verwalten' : 'Manage booking'}: ${ctx.manageUrl}`] : []),
    ...(ctx.extra ? ['', ctx.extra] : []),
    '',
    outro,
    '',
    ctx.studioName || 'AMIR',
  ]
  return { text: L.join('\n'), html: wrapHtml(locale, ctx.serviceName, L.filter(Boolean)) }
}

export function bookingConfirmedMail(locale: CustomerLocale, ctx: BookingMailContext): BuiltMail {
  const subject = locale === 'de'
    ? `Termin bestätigt: ${ctx.serviceName} am ${fmtDate(ctx.startsAt, locale, ctx.timeZone)}`
    : `Appointment confirmed: ${ctx.serviceName} on ${fmtDate(ctx.startsAt, locale, ctx.timeZone)}`
  const intro = locale === 'de'
    ? 'Vielen Dank für Ihre Anzahlung. Ihr Termin ist verbindlich reserviert.'
    : 'Thank you for your deposit. Your appointment is confirmed.'
  const outro = locale === 'de'
    ? 'Bitte kommen Sie pünktlich. Bei Fragen antworten Sie einfach auf diese E-Mail.'
    : 'Please arrive on time. If you have questions, simply reply to this email.'
  const { text, html } = lines(locale, ctx, intro, outro)
  return { subject, text, html }
}

export function bookingChangedMail(locale: CustomerLocale, ctx: BookingMailContext): BuiltMail {
  const subject = locale === 'de'
    ? `Terminänderung: ${ctx.serviceName} (${ctx.bookingNumber})`
    : `Appointment update: ${ctx.serviceName} (${ctx.bookingNumber})`
  const intro = locale === 'de'
    ? 'Ihr Termin wurde aktualisiert. Hier sind die neuen Details:'
    : 'Your appointment has been updated. Here are the new details:'
  const outro = locale === 'de'
    ? 'Falls die neue Zeit nicht passt, kontaktieren Sie uns bitte.'
    : 'If the new time does not suit you, please contact us.'
  const { text, html } = lines(locale, ctx, intro, outro)
  return { subject, text, html }
}

export function bookingCancelledMail(locale: CustomerLocale, ctx: BookingMailContext): BuiltMail {
  const subject = locale === 'de'
    ? `Termin storniert (${ctx.bookingNumber})`
    : `Appointment cancelled (${ctx.bookingNumber})`
  const intro = locale === 'de'
    ? 'Ihr Termin wurde storniert.'
    : 'Your appointment has been cancelled.'
  const { text, html } = lines(locale, ctx, intro, locale === 'de' ? 'Wir freuen uns auf Ihre nächste Buchung.' : 'We look forward to your next booking.')
  return { subject, text, html }
}

export function refundConfirmedMail(locale: CustomerLocale, ctx: BookingMailContext, amountEur: string): BuiltMail {
  const subject = locale === 'de'
    ? `Erstattung bestätigt (${ctx.bookingNumber})`
    : `Refund confirmed (${ctx.bookingNumber})`
  const intro = locale === 'de'
    ? `Die Anzahlung von ${amountEur} wurde auf Ihr ursprüngliches Zahlungsmittel erstattet. Die Gutschrift kann einige Werktage dauern.`
    : `The deposit of ${amountEur} has been refunded to your original payment method. It may take a few business days to arrive.`
  const { text, html } = lines(locale, ctx, intro, locale === 'de' ? 'Vielen Dank für Ihr Verständnis.' : 'Thank you for your understanding.')
  return { subject, text, html }
}

export function reminderMail(locale: CustomerLocale, ctx: BookingMailContext): BuiltMail {
  const subject = locale === 'de'
    ? `Erinnerung: Ihr Termin morgen — ${ctx.serviceName}`
    : `Reminder: your upcoming appointment — ${ctx.serviceName}`
  const intro = locale === 'de'
    ? 'Zur Erinnerung: Ihr Termin findet bald statt.'
    : 'As a reminder: your appointment is coming up soon.'
  const outro = locale === 'de'
    ? 'Bitte kommen Sie pünktlich.'
    : 'Please arrive on time.'
  const { text, html } = lines(locale, ctx, intro, outro)
  return { subject, text, html }
}

/** Minimal VEVENT calendar file (no dependency). Times in UTC. */
export function buildBookingIcs(input: {
  uid: string
  startsAt: Date
  durationMin: number
  summary: string
  description?: string
  address?: string | null
}): string {
  const stamp = (d: Date): string => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const esc = (s: string): string => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
  const end = new Date(input.startsAt.getTime() + input.durationMin * 60000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AMIR//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${esc(input.uid)}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(input.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(input.summary)}`,
    ...(input.description ? [`DESCRIPTION:${esc(input.description)}`] : []),
    ...(input.address ? [`LOCATION:${esc(input.address)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
