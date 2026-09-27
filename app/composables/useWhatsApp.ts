/**
 * Normalize an Egyptian national-format number (01XXXXXXXXX) to the
 * international format wa.me requires (20XXXXXXXXXX, no trunk zero).
 * Display text elsewhere keeps the original readable national format —
 * only the wa.me href uses this.
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
