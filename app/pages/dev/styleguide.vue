<script setup lang="ts">
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Menu,
  ArrowRight,
  Check,
  ChevronRight,
  Users,
  Sparkles,
} from 'lucide-vue-next'
import IconDamen from '~/components/icons/IconDamen.vue'
import IconHerren from '~/components/icons/IconHerren.vue'
import IconKinder from '~/components/icons/IconKinder.vue'
import IconKosmetik from '~/components/icons/IconKosmetik.vue'
import IconInstagram from '~/components/icons/IconInstagram.vue'
import IconFacebook from '~/components/icons/IconFacebook.vue'
import IconTikTok from '~/components/icons/IconTikTok.vue'
import IconWhatsApp from '~/components/icons/IconWhatsApp.vue'

useHead({
  title: 'Styleguide · AMIR Design System',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

const colorMode = useColorMode()
function toggleMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="min-h-screen bg-bg text-text py-12 px-4 sm:px-8">
    <Container size="lg">
      <!-- Header bar -->
      <div class="flex items-center justify-between pb-8 border-b border-border">
        <div>
          <div class="text-[11px] font-medium tracking-[0.16em] uppercase text-muted">
            Internal Dev Environment
          </div>
          <h1 class="font-display text-3xl sm:text-4xl font-medium tracking-tight mt-1">
            AMIR Design System Styleguide
          </h1>
        </div>
        <button
          type="button"
          class="h-10 px-4 text-xs tracking-wider uppercase font-medium rounded-[2px] border border-border hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          @click="toggleMode"
        >
          Mode: {{ colorMode.value }}
        </button>
      </div>

      <!-- Section: Brand Tokens -->
      <section class="py-12 border-b border-border">
        <h2 class="font-display text-2xl font-medium mb-6">1. Brand Palette Tokens</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-6 rounded-[2px] bg-[#050808] text-white border border-[#303636]">
            <div class="text-xs uppercase tracking-wider text-[#808080]">Brand Black</div>
            <div class="font-mono text-sm mt-1">#050808</div>
            <div class="text-xs text-[#808080] mt-2">Base dark background & dark bands</div>
          </div>
          <div class="p-6 rounded-[2px] bg-white text-[#050808] border border-border">
            <div class="text-xs uppercase tracking-wider text-muted">Brand White</div>
            <div class="font-mono text-sm mt-1">#FFFFFF</div>
            <div class="text-xs text-muted mt-2">Base light background & dark mode text</div>
          </div>
          <div class="p-6 rounded-[2px] bg-[#808080] text-white">
            <div class="text-xs uppercase tracking-wider text-white/80">Brand Gray</div>
            <div class="font-mono text-sm mt-1">#808080</div>
            <div class="text-xs text-white/90 mt-2">Headline accent word on dark bands & UI borders</div>
          </div>
        </div>

        <h3 class="font-display text-xl font-medium mt-8 mb-4">Status Tokens (Admin Badges)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-3 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs">
            Success: #166534 / #86EFAC
          </div>
          <div class="p-3 rounded-[2px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs">
            Warning: #92400E / #FCD34D
          </div>
          <div class="p-3 rounded-[2px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300 text-xs">
            Danger: #991B1B / #FCA5A5
          </div>
          <div class="p-3 rounded-[2px] bg-neutral-100 dark:bg-neutral-800 border border-border dark:border-[#303636] text-neutral-800 dark:text-neutral-200 text-xs">
            Neutral: #404040 / #D4D4D4
          </div>
        </div>
      </section>

      <!-- Section: Typography -->
      <section class="py-12 border-b border-border">
        <h2 class="font-display text-2xl font-medium mb-6">2. Typography Scale</h2>
        <div class="space-y-6">
          <div>
            <div class="text-[11px] font-medium tracking-[0.16em] uppercase text-muted mb-1">
              Fluid Display H1 · Cormorant Garamond 500-600
            </div>
            <h1 class="headline-h1">
              Ihr Termin. <span class="italic font-normal text-[#808080]">Ihr Stil.</span>
            </h1>
          </div>
          <div>
            <div class="text-[11px] font-medium tracking-[0.16em] uppercase text-muted mb-1">
              Display H2 with Accent Word
            </div>
            <SectionHeading
              eyebrow="UNSERE LEISTUNGEN"
              title="Unsere"
              accent-word="Leistungen"
              text="Von Schnitt und Farbe bis Make-up. Alle Preise auf einen Blick."
            />
          </div>
          <div>
            <div class="text-[11px] font-medium tracking-[0.16em] uppercase text-muted mb-1">
              Small Tracked Uppercase Label · Inter (11px, 0.16em tracking)
            </div>
            <p class="subline-label">FRISUR & KOSMETIK STUDIO · MEITINGEN</p>
          </div>
          <div>
            <div class="text-[11px] font-medium tracking-[0.16em] uppercase text-muted mb-1">
              Body Copy · Inter 400-500
            </div>
            <p class="text-base text-muted dark:text-[#A6A6A6] max-w-xl leading-relaxed">
              Friseur und Kosmetik für Damen, Herren und Kinder. Buchen Sie Ihren Termin bequem online.
            </p>
          </div>
        </div>
      </section>

      <!-- Section: Buttons -->
      <section class="py-12 border-b border-border">
        <h2 class="font-display text-2xl font-medium mb-6">3. Button Variants (Max 2px Corners)</h2>
        <div class="flex flex-wrap items-center gap-4 p-6 bg-surface dark:bg-[#121616] rounded-[2px] border border-border">
          <Button variant="solid" size="md">Solid Button</Button>
          <Button variant="outline" size="md">Outline Button</Button>
          <Button variant="ghost" size="md">Ghost Button</Button>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-4 p-6 bg-[#050808] text-white rounded-[2px] border border-[#303636]">
          <span class="text-xs uppercase tracking-wider text-[#808080] mr-2">Dark Band:</span>
          <Button variant="on-dark" size="md">On-Dark Solid</Button>
          <Button variant="outline" size="md" class="text-white border-white hover:bg-white/10">On-Dark Outline</Button>
          <Button variant="ghost" size="md" class="text-white hover:bg-white/10">On-Dark Ghost</Button>
        </div>
        <div class="mt-4 flex items-center gap-3">
          <Button variant="solid" size="sm">Small (36px)</Button>
          <Button variant="solid" size="md">Medium (44px)</Button>
          <Button variant="solid" size="lg">Large (52px)</Button>
        </div>
      </section>

      <!-- Section: Icons -->
      <section class="py-12 border-b border-border">
        <h2 class="font-display text-2xl font-medium mb-6">4. Icon Set (1.5 Stroke, 24px Grid)</h2>
        
        <h3 class="text-xs uppercase tracking-wider text-muted mb-3">Service Section Line Icons (Custom)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="p-6 rounded-[2px] border border-border flex flex-col items-center gap-3 text-center">
            <IconDamen class="h-8 w-8 text-text" />
            <span class="text-xs font-medium uppercase tracking-wider">Damen</span>
          </div>
          <div class="p-6 rounded-[2px] border border-border flex flex-col items-center gap-3 text-center">
            <IconHerren class="h-8 w-8 text-text" />
            <span class="text-xs font-medium uppercase tracking-wider">Herren</span>
          </div>
          <div class="p-6 rounded-[2px] border border-border flex flex-col items-center gap-3 text-center">
            <IconKinder class="h-8 w-8 text-text" />
            <span class="text-xs font-medium uppercase tracking-wider">Kinder</span>
          </div>
          <div class="p-6 rounded-[2px] border border-border flex flex-col items-center gap-3 text-center">
            <IconKosmetik class="h-8 w-8 text-text" />
            <span class="text-xs font-medium uppercase tracking-wider">Kosmetik</span>
          </div>
        </div>

        <h3 class="text-xs uppercase tracking-wider text-muted mt-8 mb-3">Social Line Icons (Custom)</h3>
        <div class="flex items-center gap-4">
          <div class="p-3 border border-border rounded-[2px]"><IconInstagram class="h-6 w-6" /></div>
          <div class="p-3 border border-border rounded-[2px]"><IconFacebook class="h-6 w-6" /></div>
          <div class="p-3 border border-border rounded-[2px]"><IconTikTok class="h-6 w-6" /></div>
          <div class="p-3 border border-border rounded-[2px]"><IconWhatsApp class="h-6 w-6" /></div>
        </div>

        <h3 class="text-xs uppercase tracking-wider text-muted mt-8 mb-3">Utility Icons (lucide-vue-next, 1.5 Stroke)</h3>
        <div class="flex flex-wrap items-center gap-4 text-muted">
          <Calendar class="h-6 w-6" :stroke-width="1.5" />
          <Clock class="h-6 w-6" :stroke-width="1.5" />
          <MapPin class="h-6 w-6" :stroke-width="1.5" />
          <Phone class="h-6 w-6" :stroke-width="1.5" />
          <Mail class="h-6 w-6" :stroke-width="1.5" />
          <Menu class="h-6 w-6" :stroke-width="1.5" />
          <ArrowRight class="h-6 w-6" :stroke-width="1.5" />
          <Check class="h-6 w-6" :stroke-width="1.5" />
          <ChevronRight class="h-6 w-6" :stroke-width="1.5" />
          <Users class="h-6 w-6" :stroke-width="1.5" />
          <Sparkles class="h-6 w-6" :stroke-width="1.5" />
        </div>
      </section>

      <!-- Section: Cards and PriceRow -->
      <section class="py-12">
        <h2 class="font-display text-2xl font-medium mb-6">5. Cards & PriceRow Components</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card variant="default" :hover="true">
            <div class="subline-label">Default Card</div>
            <h3 class="font-display text-xl font-medium mt-2">Damen Schnitt</h3>
            <p class="text-xs text-muted mt-1">Waschen, Schneiden, Föhnen inklusive Beratung.</p>
          </Card>
          <Card variant="surface" :hover="true">
            <div class="subline-label">Surface Card</div>
            <h3 class="font-display text-xl font-medium mt-2">Herren Styling</h3>
            <p class="text-xs text-muted mt-1">Klassischer Fassonschnitt oder moderner Fade.</p>
          </Card>
          <Card variant="dark" :hover="true">
            <div class="text-[11px] font-medium tracking-[0.16em] uppercase text-[#808080]">Dark Card</div>
            <h3 class="font-display text-xl font-medium mt-2 text-white">Kosmetik Studio</h3>
            <p class="text-xs text-[#A6A6A6] mt-1">Wohltuende Gesichtsbehandlung & Pflege.</p>
          </Card>
        </div>

        <div class="max-w-2xl bg-white dark:bg-[#121616] p-6 border border-border rounded-[2px]">
          <h3 class="font-display text-xl font-medium mb-4">PriceRow Example</h3>
          <PriceRow
            name="Waschen & Schneiden"
            price="42,00"
            description="Inklusive individueller Typberatung und Pflege."
            action-text="Buchen"
            action-to="/services"
          />
          <PriceRow
            name="Balayage Komplett"
            price="120,00"
            description="Freihand-Farbtechnik mit samtigem Verlauf."
            action-text="Buchen"
            action-to="/services"
          />
        </div>
      </section>
    </Container>
  </div>
</template>
