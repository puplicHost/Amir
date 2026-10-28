/**
 * Scope: the studio's OWN contact number only (see AppSocialLinks). That
 * number may be stored in Egyptian national format (01XXXXXXXXX), so it is
 * rewritten to 20XXXXXXXXXX (no trunk zero) for the wa.me href. Display text
 * elsewhere keeps the original readable national format.
 *
 * Customer numbers (bookings/reminders) are German and MUST use
 * `normalizePhoneForWa`/`waLink` from `shared/booking` instead — do not reuse
 * this helper for them.
 */
export function toWhatsAppIntl(raw: string | null | undefined): string {
  const digits = String(raw || '').replace(/[^0-9]/g, '')
  if (/^01[0125][0-9]{8}$/.test(digits)) {
    return `20${digits.slice(1)}`
  }
  return digits
}

export function whatsappLink(raw: string | null | undefined): string {
  return `https://wa.me/${toWhatsAppIntl(raw)}`
}
