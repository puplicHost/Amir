/**
 * Applies admin-configured brand colors as CSS variables.
 * Maps SiteSettings (primaryColor → --primary, accentColor → --accent)
 * so the admin panel can still override the palette at runtime.
 * Mode-aware: dark mode gets cream primary (readable on navy) while
 * light mode uses the DB value. Without this, the static inline value
 * would override the .dark stylesheet and break dark-mode contrast.
 * Defaults match the design tokens in assets/css/main.css.
 */
function hexToChannels(hex: string): string {
  const h = hex.replace('#', '')
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
  return `${n(0)} ${n(2)} ${n(4)}`
}

const CREAM_CHANNELS = '245 240 232'
const NAVY_CHANNELS = '28 41 64'
const WHITE_CHANNELS = '255 255 255'

export default defineNuxtPlugin(async () => {
  const HEX_RE = /^#[0-9a-fA-F]{6}$/
  try {
    const general = await $fetch<{
      primaryDarkColor?: string
      primaryColor?: string
      accentColor?: string
    }>('/api/settings/general')
    const primaryDark = HEX_RE.test(String(general?.primaryDarkColor || '')) ? general!.primaryDarkColor! : '#1C2940'
    const primary = HEX_RE.test(String(general?.primaryColor || '')) ? general!.primaryColor! : '#1C2940'
    const accent = HEX_RE.test(String(general?.accentColor || '')) ? general!.accentColor! : '#F5CC07'
    if (import.meta.client) {
      const root = document.documentElement
      const applyForMode = (dark: boolean) => {
        // New two-layer names (RGB channels for Tailwind opacity support)
        root.style.setProperty('--primary', dark ? CREAM_CHANNELS : hexToChannels(primary))
        root.style.setProperty('--on-primary', dark ? NAVY_CHANNELS : WHITE_CHANNELS)
        root.style.setProperty('--accent', hexToChannels(accent))
        root.style.setProperty('--on-accent', NAVY_CHANNELS)
        // Legacy names (kept for untouched files)
        root.style.setProperty('--color-navy', '#1C2940')
        root.style.setProperty('--color-yellow', '#F5CC07')
        root.style.setProperty('--color-silver', '#C4C4C4')
        root.style.setProperty('--color-cream', '#F5F0E8')
        root.style.setProperty('--color-white', '#FFFFFF')
        root.style.setProperty('--color-dark-text', '#1A1A1A')
        root.style.setProperty('--color-primary-dark', primaryDark)
        root.style.setProperty('--color-primary', primary)
        root.style.setProperty('--color-accent', accent)
        root.style.setProperty('--color-info', primary)
        root.style.setProperty('--color-warning', accent)
      }
      const colorMode = useColorMode()
      applyForMode(colorMode.value === 'dark')
      watch(() => colorMode.value, v => applyForMode(v === 'dark'))
    }
    return { provide: { brandColors: { primaryDark, primary, accent } } }
  }
  catch {
    // Offline / first boot — CSS defaults apply.
  }
})
