// Canonical owner-confirmed duration specification (Phase 1).
// Shared by the one-off updater and regression tests. Matched by section +
// normalized name, never by row order.
export const SERVICE_DURATION_SPEC = [
  { section: 'DAMEN', name: 'Waschen, föhnen, kurz', durationMin: 30 },
  { section: 'DAMEN', name: 'Waschen, schneiden, föhnen, kurz', durationMin: 30 },
  { section: 'DAMEN', name: 'Waschen, schneiden, schulterlang', durationMin: 60 },
  { section: 'DAMEN', name: 'Waschen, schneiden, föhnen lang', durationMin: 66 },
  { section: 'DAMEN', name: 'Waschen, schneiden, kurz', durationMin: 30 },
  { section: 'DAMEN', name: 'Waschen, schneiden, lang', durationMin: 30 },
  { section: 'DAMEN', name: 'Dauerwelle', durationMin: 60 },
  { section: 'DAMEN', name: 'Farbe Ansatz', durationMin: 20 },
  { section: 'DAMEN', name: 'Farbe komplett', durationMin: 30 },
  { section: 'DAMEN', name: 'Foliensträhnen schulterlang', durationMin: 60 },
  { section: 'DAMEN', name: 'Balayage inkl. Olaplex - Behandlung, Abmattierung', durationMin: 90 },
  { section: 'DAMEN', name: 'Ombré inkl. Olaplex - Behandlung, Abmattierung', durationMin: 90 },
  { section: 'HERREN', name: 'Haarschnitt (Maschine & Schere)', durationMin: 15 },
  { section: 'HERREN', name: 'Haarwaschen oder föhnen', durationMin: 10 },
  { section: 'HERREN', name: 'Haarschnitt (Kamm & Schere)', durationMin: 20 },
  { section: 'HERREN', name: 'Waschen, schneiden, styling', durationMin: 30 },
  { section: 'HERREN', name: 'Bart formen, schneiden inkl. Condition, Öl', durationMin: 20 },
  { section: 'KINDER', name: 'Mädchen bis 10 Jahre', durationMin: 20 },
  { section: 'KINDER', name: 'Mädchen bis 16 Jahre', durationMin: 20 },
  { section: 'KINDER', name: 'Jungen bis 10 Jahre', durationMin: 20 },
  { section: 'KINDER', name: 'Jungen bis 16 Jahre', durationMin: 20 },
  { section: 'KOSMETIK', name: 'Augenbrauen zupfen mit Faden oder färben', durationMin: 15 },
  { section: 'KOSMETIK', name: 'Wimpern färben', durationMin: 15 },
  { section: 'KOSMETIK', name: 'Abend Make-Up', durationMin: 30 },
  { section: 'KOSMETIK', name: 'Braut Make-Up', durationMin: 60 },
  { section: 'KOSMETIK', name: 'Hochstecken', durationMin: 60 },
  { section: 'KOSMETIK', name: 'Gesichtsreinigungspaket', durationMin: 60 },
]

/** Case/space/hyphen tolerant comparison key for the German names. */
export function normalizeServiceName(value) {
  return String(value || '')
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, ' - ')
}
