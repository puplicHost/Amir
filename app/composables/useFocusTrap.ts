import type { Ref } from 'vue'

// AUDIT P2-12: shared focus trap for overlays.
// - moves focus into the dialog when it opens
// - keeps Tab / Shift+Tab inside
// - handles Escape
// - restores focus to the trigger when it closes
// No dependency; works with any container ref.
export interface FocusTrapOptions {
  onEscape?: () => void
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap(
  container: Ref<HTMLElement | null>,
  active: Ref<boolean>,
  options: FocusTrapOptions = {},
) {
  let previouslyFocused: HTMLElement | null = null

  function focusables(): HTMLElement[] {
    const root = container.value
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
  }

  function onKeydown(e: KeyboardEvent) {
    if (!active.value) return
    if (e.key === 'Escape') {
      options.onEscape?.()
      return
    }
    if (e.key !== 'Tab') return
    const els = focusables()
    if (!els.length) {
      e.preventDefault()
      return
    }
    const first = els[0]!
    const last = els[els.length - 1]!
    const current = document.activeElement as HTMLElement | null
    if (e.shiftKey && (current === first || !container.value?.contains(current))) {
      e.preventDefault()
      last.focus()
    }
    else if (!e.shiftKey && (current === last || !container.value?.contains(current))) {
      e.preventDefault()
      first.focus()
    }
  }

  watch(active, async (open) => {
    if (typeof document === 'undefined') return
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null
      await nextTick()
      const first = focusables()[0]
      first?.focus()
      document.addEventListener('keydown', onKeydown, true)
    }
    else {
      document.removeEventListener('keydown', onKeydown, true)
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
      previouslyFocused = null
    }
  }, { immediate: true })

  onBeforeUnmount(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', onKeydown, true)
    }
  })
}
