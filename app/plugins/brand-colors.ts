/**
 * Applies admin-configured brand colors as CSS variables.
 * Mode-aware: light mode uses black primary/accent (#050808); dark mode uses white (#FFFFFF).
 * Defaults match the luxury salon design tokens in assets/css/main.css.
 */
function hexToChannels(hex: string): string {
  const h = hex.replace('#', '')
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
  return `${n(0)} ${n(2)} ${n(4)}`
}

const BLACK_CHANNELS = '5 8 8'
const WHITE_CHANNELS = '255 255 255'

export default defineNuxtPlugin(async () => {
  const HEX_RE = /^#[0-9a-fA-F]{6}$/
  try {
    const general = await $fetch<{
      primaryDarkColor?: string
      primaryColor?: string
      accentColor?: string
    }>('/api/settings/general')

    const primaryDark = HEX_RE.test(String(general?.primaryDarkColor || '')) ? general!.primaryDarkColor! : '#050808'
    const primary = HEX_RE.test(String(general?.primaryColor || '')) ? general!.primaryColor! : '#050808'
    const accent = HEX_RE.test(String(general?.accentColor || '')) ? general!.accentColor! : '#050808'

    if (import.meta.client) {
      const root = document.documentElement
      const applyForMode = (dark: boolean) => {
        root.style.setProperty('--primary', dark ? WHITE_CHANNELS : (primary === '#1C2940' ? BLACK_CHANNELS : hexToChannels(primary)))
        root.style.setProperty('--on-primary', dark ? BLACK_CHANNELS : WHITE_CHANNELS)
        root.style.setProperty('--accent', dark ? WHITE_CHANNELS : (accent === '#F5CC07' ? BLACK_CHANNELS : hexToChannels(accent)))
        root.style.setProperty('--on-accent', dark ? BLACK_CHANNELS : WHITE_CHANNELS)

        root.style.setProperty('--color-primary-dark', primaryDark === '#141E30' ? '#050808' : primaryDark)
        root.style.setProperty('--color-primary', dark ? '#FFFFFF' : (primary === '#1C2940' ? '#050808' : primary))
        root.style.setProperty('--color-accent', dark ? '#FFFFFF' : (accent === '#F5CC07' ? '#050808' : accent))
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
