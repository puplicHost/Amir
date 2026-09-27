/**
 * Scroll-triggered entrance animations for `.reveal` elements.
 * - Observes via IntersectionObserver, animates once, then cleans up to a
 *   plain `.revealed` state so hover transitions keep working untouched.
 * - GPU-friendly: opacity/transform only. Honors prefers-reduced-motion
 *   via CSS (content stays fully visible).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const SELECTOR = '.reveal:not(.reveal-visible):not(.revealed)'

  function revealNow(el: Element) {
    el.classList.add('reveal-visible')
    const done = () => {
      el.classList.remove('reveal-visible')
      el.classList.add('revealed')
    }
    el.addEventListener('animationend', done, { once: true })
    // Fallback in case the animation never runs (hidden ancestor, etc.)
    setTimeout(() => {
      if (el.classList.contains('reveal-visible')) done()
    }, 1600)
  }

  function scan(root: ParentNode = document) {
    if (typeof IntersectionObserver === 'undefined') {
      root.querySelectorAll?.(SELECTOR).forEach((el) => {
        el.classList.add('revealed')
      })
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            io.unobserve(entry.target)
            revealNow(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    root.querySelectorAll?.(SELECTOR).forEach((el) => { io.observe(el) })
  }

  // Observe late-rendered nodes (async data, banners) without per-page wiring.
  let moTimer: ReturnType<typeof setTimeout> | null = null
  function armObserver() {
    if (typeof MutationObserver === 'undefined') return
    const mo = new MutationObserver(() => {
      if (moTimer) clearTimeout(moTimer)
      moTimer = setTimeout(() => scan(document), 120)
    })
    mo.observe(document.documentElement, { childList: true, subtree: true })
  }

  nuxtApp.hook('app:mounted', () => {
    scan(document)
    armObserver()
  })
  nuxtApp.hook('page:finish', () => {
    setTimeout(() => scan(document), 60)
  })
})
