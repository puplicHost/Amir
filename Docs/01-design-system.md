# 01 — Design System
## Amir

---

## 1. Brand Identity

### Brand Name
**Amir**
Tagline: *Do It Right, Do It Smart*

### Brand Personality
Industrial yet accessible. Technically confident. Built for engineers, factories, students, and business owners. Not a generic consumer electronics store — a specialized technical platform that earns trust through clarity and competence.

Visual tone: **precise, clean, structured**. No decorative clutter. No lifestyle imagery. Function-forward.

---

## 2. Color System

### Primary Colors (from brand assets)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary-dark` | `#285E8E` | Dark blue — shadows, depth, dark mode primary surfaces |
| `--color-primary` | `#2B71AE` | Core brand blue — main CTAs, links, active states, nav |
| `--color-accent` | `#F5CC07` | Brand yellow — highlights, badges, hover accents, icons |

### Semantic Colors (derived)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#22C55E` | Order confirmed, service submitted |
| `--color-warning` | `#F5CC07` (brand accent) | Warnings, attention states |
| `--color-error` | `#EF4444` | Validation errors, delete confirmations |
| `--color-info` | `#2B71AE` (brand primary) | Informational states |

### Light Mode Neutrals

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#FFFFFF` | Page background |
| `--color-surface` | `#F8F9FA` | Card backgrounds, form areas |
| `--color-border` | `#E2E8F0` | Dividers, input borders |
| `--color-text-primary` | `#0F172A` | Main body text |
| `--color-text-secondary` | `#475569` | Labels, subtitles |
| `--color-text-muted` | `#94A3B8` | Placeholders, disabled |

### Dark Mode Neutrals

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0B1520` | Page background (deep navy, harmonizes with brand blue) |
| `--color-surface` | `#162032` | Card backgrounds |
| `--color-border` | `#1E3048` | Dividers, input borders |
| `--color-text-primary` | `#F1F5F9` | Main body text |
| `--color-text-secondary` | `#94A3B8` | Labels, subtitles |
| `--color-text-muted` | `#475569` | Placeholders, disabled |

---

## 3. Typography

### Font Family

**Primary:** `Archive` (brand-specified)
- Apply to: headings, brand text, product names, category titles
- Google Fonts or self-hosted

**Secondary/Body:** `Inter` (recommended — geometric, neutral, high legibility)
- Apply to: body text, form labels, table data, descriptions
- Arabic fallback: `Cairo` or `Noto Sans Arabic` (excellent legibility for technical Arabic content)

### Arabic Typography
- Font: `Cairo` (Google Fonts) — clean, technical, legible for RTL content
- Direction: `dir="rtl"` on Arabic pages
- Body size same scale as LTR

### Type Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-xs` | 12px | 400 | Badges, meta |
| `--text-sm` | 14px | 400 | Labels, table cells, captions |
| `--text-base` | 16px | 400 | Body text, form fields |
| `--text-lg` | 18px | 500 | Card titles, subtitles |
| `--text-xl` | 20px | 600 | Section headings |
| `--text-2xl` | 24px | 700 | Page headings |
| `--text-3xl` | 30px | 700 | Category page heroes |
| `--text-4xl` | 36px | 800 | Homepage hero |

Line height: 1.5 for body, 1.2 for headings.

---

## 4. Spacing System

Tailwind default scale. Key values:

| Token | px | Usage |
|-------|----|-------|
| `space-1` | 4px | Micro gaps |
| `space-2` | 8px | Icon + label gap |
| `space-3` | 12px | Compact padding |
| `space-4` | 16px | Standard padding |
| `space-6` | 24px | Card padding |
| `space-8` | 32px | Section inner padding |
| `space-12` | 48px | Section gap |
| `space-16` | 64px | Page section separation |
| `space-24` | 96px | Hero section padding |

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Input fields, badges |
| `rounded` | 6px | Buttons, small cards |
| `rounded-md` | 8px | Product cards, table rows |
| `rounded-lg` | 12px | Large cards, modals |
| `rounded-full` | 9999px | Avatar, pill badges |

No excessive rounding. Cards are `rounded-md`. Buttons are `rounded`.

---

## 6. Shadows

| Token | Usage |
|-------|-------|
| `shadow-sm` | Default card resting state |
| `shadow-md` | Hovered card, dropdown |
| `shadow-lg` | Modal, sidebar drawer |
| `shadow-none` | Admin tables (table borders instead) |

Shadows use a blue-tinted color in dark mode to harmonize with the surface palette.

---

## 7. Component Specifications

### Buttons

**Primary:** Blue background `#2B71AE`, white text, `rounded`, `px-4 py-2`
- Hover: `#285E8E` (darker blue)
- Active: scale 0.98

**Secondary:** Transparent, `#2B71AE` border and text
- Hover: light blue fill `#EBF4FF`

**Accent/CTA:** `#F5CC07` background, `#0F172A` text (dark text for contrast on yellow)
- Used for: primary homepage CTAs, featured actions

**Destructive:** `#EF4444` background, white text

**Ghost:** No background, no border, text-only. Used in Admin tables for row actions.

**Icon Button:** Square, `rounded-md`, 36–40px. Used in toolbars.

Disabled state: 50% opacity, `cursor-not-allowed`.

### Inputs

Height: 40px. Border: `--color-border`. Border radius: `rounded-sm`.
Focus: `ring-2 ring-primary` (brand blue outline).
Error: red border + red helper text below.
Label: above the input, `text-sm font-medium`.

File inputs: custom styled dropzone with dashed border.

Arabic: text aligns right, placeholder aligns right, `dir="rtl"`.

### Cards

**Product Card:**
- White/surface background
- `rounded-md shadow-sm`
- Image top, fills width, 1:1 or 4:3 ratio
- Product name: `text-base font-semibold`
- Price: `text-primary font-bold`
- Category badge: small pill, `text-xs`
- Add to Cart button: full width, primary style
- Hover: `shadow-md` + subtle lift (translateY -2px)

**Service Card:**
- Icon or image at top
- Service name: `text-lg font-semibold`
- Short description: `text-sm text-secondary`
- CTA link/button

**Category Card:**
- Full bleed image/video background
- Gradient overlay (bottom-up, brand dark blue to transparent)
- Category name on top of overlay
- Link to category page

### Navigation

**Desktop:**
- Horizontal navbar: logo left, nav links center/right
- Products dropdown: opens on hover/click, lists "All Products" + category links dynamically
- Language toggle: AR / EN
- Dark/Light toggle: icon button
- Cart icon with item count badge (yellow `#F5CC07`)

**Mobile:**
- Hamburger menu → slide-in drawer from right (LTR) or left (RTL)
- Full-width links in drawer
- Language + theme toggles at bottom of drawer
- Cart accessible from top bar

### Tables (Admin)

- Full-width, horizontal scroll on mobile
- Column headers: `text-sm font-semibold text-secondary`, uppercase tracking
- Row: `text-sm`, alternating background subtle or border-only
- Actions column: right-aligned, icon buttons + text buttons
- Empty state: centered message + action button
- Pagination: `<` `>` arrows + page number display

### Modals

- Backdrop: semi-transparent dark overlay
- Container: `rounded-lg shadow-lg`, white/surface background
- Max width: 480px (forms), 640px (confirmations with detail)
- Header: title + close button
- Footer: action buttons right-aligned (LTR), left-aligned (RTL)
- Scroll: modal body scrolls if content exceeds viewport height

### Badges

- Status badges: `text-xs font-medium px-2 py-0.5 rounded-full`
- Order status colors: Pending (yellow), Processing (blue), Shipped (purple), Delivered (green), Cancelled (red)
- Product badge: "New", "Featured" — brand yellow

### Form Steps (Add Product)

- Step indicator: horizontal step bar with numbered circles
- Active step: filled brand blue circle
- Completed step: check icon, muted color
- Inactive: empty circle, border

### Empty States

Centered vertically in the container. Icon (outline style) + heading + description + action button. Do not use giant illustrations.

### Loading States

- Skeleton screens for product cards and tables (not spinners)
- Full-page loading: centered spinner with brand blue color
- Button loading: spinner replaces label text

---

## 8. Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| `xs` | < 375px | Stack everything, minimum padding |
| `sm` | 375–639px | Mobile — single column |
| `md` | 640–1023px | Tablet — 2-column grids |
| `lg` | 1024–1279px | Desktop — full layout |
| `xl` | 1280px+ | Wide desktop |

### Mobile-Specific Rules

- Bottom navigation bar for key sections (optional if justified by UX)
- Tap targets minimum 44×44px
- Inputs scale to full width
- Product grid: 2 columns on mobile, 3 on tablet, 4 on desktop
- Service cards: 2 columns on mobile, 3 on desktop
- Category cards: 1 column on mobile (full bleed), 3 on desktop
- Admin tables: horizontal scroll container, do not shrink text

---

## 9. RTL / LTR

- All layout, spacing, flex direction, icon placement, and text alignment flip for RTL
- Use Tailwind's `rtl:` variants
- Navigation drawer: opens from left in RTL, right in LTR
- Form labels and inputs: align right in RTL
- Icons with directional meaning (arrows, chevrons) mirror in RTL
- Language stored in i18n config; Nuxt i18n handles route prefixes (`/ar/...` or `en` default)

---

## 10. Dark Mode

- Implemented via Tailwind's `class` dark mode strategy
- Toggle stored in `localStorage`, respects `prefers-color-scheme` as default
- All color tokens have explicit dark values
- Images do not invert — use `opacity-90` on dark mode if needed for harsh whites
- Admin Panel: dark mode applies fully

---

## 11. Accessibility

- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text
- `#F5CC07` on `#2B71AE`: verify and adjust text size if needed (yellow on blue has contrast challenges — use for graphical accents, not small body text)
- All interactive elements have visible focus rings (`ring-2 ring-primary ring-offset-2`)
- Form inputs have associated `<label>` elements
- Images have meaningful `alt` text; decorative images have empty `alt=""`
- ARIA roles on modals, dropdowns, dialogs
- Keyboard navigation: tab order logical, dropdowns closeable via Escape
- Skip-to-content link at page top

---

## 12. Icon Style

- Use a consistent icon library: **Lucide** (already ships with shadcn-vue)
- Style: outline/stroke, 20–24px default
- Do not mix styles (no filled + outline mix)
- Yellow accent on icons used sparingly for emphasis

---

## 13. What This Design System Is NOT

- No glassmorphism
- No gradient hero backgrounds (except category cards which use a purposeful image + overlay)
- No random decorative blobs or shapes
- No purple/teal SaaS palette — only brand blue and yellow
- No excessive card shadows
- No generic dashboard widget patterns in the public site
- No oversized meaningless headings
