<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { centsToEur } from '~~/shared/booking'

const props = defineProps<{
  /** Service section key, e.g. DAMEN (drives the fallback icon) */
  section: string
  /** Service name (long German names wrap with hyphenation) */
  name: string
  /** Cover image path or null (like category covers) */
  cover?: string | null
  /** Listed "ab" price in EUR cents */
  priceCents: number
  /** Duration in minutes (shown only when not a placeholder) */
  durationMin: number
  /** True while the duration is still a placeholder */
  needsDurationReview: boolean
  /** Card destination, e.g. /booking/<slug> */
  to: string | Record<string, unknown>
}>()

const { t } = useI18n()

/** "ab 28 €": whole euros without decimals, German grouping otherwise. */
function formatAb(priceAbCents: number): string {
  const eur = Number(priceAbCents || 0) / 100
  if (Number.isInteger(eur)) return `${eur.toLocaleString('de-DE')} €`
  return centsToEur(Number(priceAbCents || 0))
}
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex h-full flex-col overflow-hidden rounded-sm border border-border bg-surface transition-[border-color] duration-150 motion-safe:transition-[border-color] hover:border-text"
  >
    <!-- Image tile (4:5, full card width) or neutral tile with section icon -->
    <div class="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-border/40">
      <img
        v-if="props.cover"
        :src="props.cover"
        :alt="props.name"
        loading="lazy"
        decoding="async"
        width="800"
        height="1000"
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
        draggable="false"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-muted">
        <ServiceSectionIcon :section="props.section" class="h-11 w-10" />
      </div>
      <span class="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg/80 text-text backdrop-blur-sm">
        <ArrowUpRight
          class="h-4 w-4 transition-transform duration-150 motion-safe:transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
          :stroke-width="1.5"
          aria-hidden="true"
        />
      </span>
    </div>

    <!-- Text below the image, never overlapping -->
    <div class="flex min-w-0 flex-1 flex-col p-3.5">
      <h3 class="font-sans text-[15px] font-semibold leading-[1.3] text-text line-clamp-3 hyphens-auto [overflow-wrap:anywhere] text-balance md:text-base">
        {{ props.name }}
      </h3>
      <p v-if="!props.needsDurationReview" class="mt-1 text-xs text-muted tabular-nums">
        {{ props.durationMin }} {{ t('services.minutes') }}
      </p>

      <div class="min-h-3 flex-1" aria-hidden="true" />

      <!-- Bottom (pinned, hairline above): from-price -->
      <div class="border-t border-border pt-2.5">
        <p class="flex items-baseline gap-1.5 whitespace-nowrap font-sans text-base font-semibold tabular-nums text-text">
          <span class="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{{ t('services.priceAb') }}</span>
          <span>{{ formatAb(props.priceCents) }}</span>
        </p>
      </div>
    </div>
  </NuxtLink>
</template>
