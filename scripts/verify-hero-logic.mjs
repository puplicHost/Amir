// Pure-logic checks for the hero slideshow state machine.
// Run: node scripts/verify-hero-logic.mjs
import { nextSlideIndex, prevSlideIndex, shouldAutoplay } from '../shared/hero-slideshow.ts'

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

check('next wraps 2->0 of 3', nextSlideIndex(2, 3) === 0)
check('next advances 0->1 of 3', nextSlideIndex(0, 3) === 1)
check('prev wraps 0->2 of 3', prevSlideIndex(0, 3) === 2)
check('prev steps 2->1 of 3', prevSlideIndex(2, 3) === 1)
check('single slide stays 0', nextSlideIndex(0, 1) === 0 && prevSlideIndex(0, 1) === 0)
check('empty set stays 0', nextSlideIndex(0, 0) === 0 && prevSlideIndex(5, 0) === 0)

const base = { slideCount: 3, pausedByUser: false, prefersReducedMotion: false, tabHidden: false, offscreen: false }
check('autoplays when clear', shouldAutoplay(base) === true)
check('no autoplay with 1 slide', shouldAutoplay({ ...base, slideCount: 1 }) === false)
check('no autoplay when paused', shouldAutoplay({ ...base, pausedByUser: true }) === false)
check('no autoplay on reduced motion', shouldAutoplay({ ...base, prefersReducedMotion: true }) === false)
check('no autoplay when tab hidden', shouldAutoplay({ ...base, tabHidden: true }) === false)
check('no autoplay when off-screen', shouldAutoplay({ ...base, offscreen: true }) === false)

console.log(`\nHero logic: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
