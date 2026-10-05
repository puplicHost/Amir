/**
 * Applies admin-configured brand colors as CSS variables.
 * Defaults match the design tokens in assets/css/main.css.
 */
export default defineNuxtPlugin(async () => {
  const HEX_RE = /^#[0-9a-fA-F]{6}$/
  try {
    const general = await $fetch<{
      primaryDarkColor?: string
      primaryColor?: string
      accentColor?: string
    }>('/api/settings/general')
    const primaryDark = HEX_RE.test(String(general?.primaryDarkColor || '')) ? general!.primaryDarkColor! : '#285E8E'
    const primary = HEX_RE.test(String(general?.primaryColor || '')) ? general!.primaryColor! : '#2B71AE'
    const accent = HEX_RE.test(String(general?.accentColor || '')) ? general!.accentColor! : '#F5CC07'
    if (import.meta.client) {
      const root = document.documentElement
      root.style.setProperty('--color-primary-dark', primaryDark)
      root.style.setProperty('--color-primary', primary)
      root.style.setProperty('--color-accent', accent)
      root.style.setProperty('--color-info', primary)
      root.style.setProperty('--color-warning', accent)
    }
    return { provide: { brandColors: { primaryDark, primary, accent } } }
  }
  catch {
    // Offline / first boot — CSS defaults apply.
  }
})
