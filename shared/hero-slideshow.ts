// Pure slideshow logic for the homepage hero carousel (Phase: multi-image hero).
// Kept DOM-free so it is unit-testable in plain node (scripts/verify-hero-logic.mjs).

/** Next slide index with wrap-around. Returns 0 when total is 0. */
export function nextSlideIndex(current: number, total: number): number {
  if (total <= 0) return 0
  return (current + 1) % total
}

/** Previous slide index with wrap-around. Returns 0 when total is 0. */
export function prevSlideIndex(current: number, total: number): number {
  if (total <= 0) return 0
  return (current - 1 + total) % total
}

export interface SlideshowPlayState {
  /** Number of slides (autoplay needs at least 2). */
  slideCount: number
  /** User pressed Pause. */
  pausedByUser: boolean
  /** prefers-reduced-motion: reduce is active. */
  prefersReducedMotion: boolean
  /** Browser tab is hidden. */
  tabHidden: boolean
  /** Slideshow is scrolled off-screen. */
  offscreen: boolean
}

/**
 * Whether the autoplay timer may advance the slide right now.
 * Hover/focus/swipe holds are tracked by the component and folded into
 * `pausedByUser`-style flags by the caller (hover/focus pause like a user
 * pause; a swipe sets a one-interval cooldown before resuming).
 */
export function shouldAutoplay(s: SlideshowPlayState): boolean {
  return (
    s.slideCount >= 2 &&
    !s.pausedByUser &&
    !s.prefersReducedMotion &&
    !s.tabHidden &&
    !s.offscreen
  )
}
