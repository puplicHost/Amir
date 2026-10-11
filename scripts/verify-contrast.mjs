// scripts/verify-contrast.mjs
// Verifies WCAG AA compliance (4.5:1 for body text, 3:1 for large text/components)
// for all design token pairs in light and dark mode.
function lum(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

function ratio(hex1, hex2) {
  const c1 = [parseInt(hex1.slice(1, 3), 16), parseInt(hex1.slice(3, 5), 16), parseInt(hex1.slice(5, 7), 16)]
  const c2 = [parseInt(hex2.slice(1, 3), 16), parseInt(hex2.slice(3, 5), 16), parseInt(hex2.slice(5, 7), 16)]
  const l1 = lum(...c1)
  const l2 = lum(...c2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

const pairs = [
  // Light Mode
  { name: 'Light body text (#050808 on #FFFFFF)', fg: '#050808', bg: '#FFFFFF', min: 4.5 },
  { name: 'Light surface text (#050808 on #FAFAFA)', fg: '#050808', bg: '#FAFAFA', min: 4.5 },
  { name: 'Light muted text (#525252 on #FFFFFF)', fg: '#525252', bg: '#FFFFFF', min: 4.5 },
  { name: 'Light muted text on surface (#525252 on #FAFAFA)', fg: '#525252', bg: '#FAFAFA', min: 4.5 },
  { name: 'Light button text (#FFFFFF on #050808)', fg: '#FFFFFF', bg: '#050808', min: 4.5 },
  { name: 'Light border UI component (#808080 on #FFFFFF)', fg: '#808080', bg: '#FFFFFF', min: 3.0 },
  // Dark Mode
  { name: 'Dark body text (#FFFFFF on #050808)', fg: '#FFFFFF', bg: '#050808', min: 4.5 },
  { name: 'Dark surface text (#FFFFFF on #121616)', fg: '#FFFFFF', bg: '#121616', min: 4.5 },
  { name: 'Dark muted text (#A6A6A6 on #050808)', fg: '#A6A6A6', bg: '#050808', min: 4.5 },
  { name: 'Dark muted text on surface (#A6A6A6 on #121616)', fg: '#A6A6A6', bg: '#121616', min: 4.5 },
  { name: 'Dark button text (#050808 on #FFFFFF)', fg: '#050808', bg: '#FFFFFF', min: 4.5 },
  { name: 'Dark border UI component (#808080 on #050808)', fg: '#808080', bg: '#050808', min: 3.0 },
  { name: 'Dark border UI component on surface (#808080 on #121616)', fg: '#808080', bg: '#121616', min: 3.0 },
  // Status Badges (Neutral Restrained)
  { name: 'Badge Success Light (#166534 on #F0FDF4)', fg: '#166534', bg: '#F0FDF4', min: 4.5 },
  { name: 'Badge Success Dark (#86EFAC on #052E16)', fg: '#86EFAC', bg: '#052E16', min: 4.5 },
  { name: 'Badge Warning Light (#92400E on #FFFBEB)', fg: '#92400E', bg: '#FFFBEB', min: 4.5 },
  { name: 'Badge Warning Dark (#FCD34D on #451A03)', fg: '#FCD34D', bg: '#451A03', min: 4.5 },
  { name: 'Badge Danger Light (#991B1B on #FEF2F2)', fg: '#991B1B', bg: '#FEF2F2', min: 4.5 },
  { name: 'Badge Danger Dark (#FCA5A5 on #450A0A)', fg: '#FCA5A5', bg: '#450A0A', min: 4.5 },
  { name: 'Badge Neutral Light (#404040 on #F5F5F5)', fg: '#404040', bg: '#F5F5F5', min: 4.5 },
  { name: 'Badge Neutral Dark (#D4D4D4 on #1F2424)', fg: '#D4D4D4', bg: '#1F2424', min: 4.5 },
]

let failed = 0
for (const p of pairs) {
  const r = ratio(p.fg, p.bg)
  const ok = r >= p.min
  console.log(`${ok ? 'PASS' : 'FAIL'} [${r.toFixed(2)}:1 >= ${p.min}:1] ${p.name}`)
  if (!ok) failed++
}

console.log(`\nWCAG AA contrast: ${pairs.length - failed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
