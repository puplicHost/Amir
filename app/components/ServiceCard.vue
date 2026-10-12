<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { centsToEur } from '~~/shared/booking'

const props = defineProps<{
  /** Service section key, e.g. DAMEN (drives the icon) */
  section: string
  /** Service name (long German names wrap with hyphenation) */
  name: string
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
    class="group flex h-full min-h-[140px] flex-col rounded-sm border border-border bg-surface p-3.5 transition-[border-color] duration-150 motion-safe:transition-[border-color] hover:border-text md:p-[18px]"
  >
    <!-- Top: section icon (no tile) + arrow cue -->
    <div class="mb-2.5 flex items-start justify-between gap-2">
      <ServiceSectionIcon :section="props.section" class="h-7 w-7 text-text" />
      <ArrowUpRight
        class="h-4 w-4 shrink-0 text-muted transition-transform duration-150 motion-safe:transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
        :stroke-width="1.5"
        aria-hidden="true"
      />
    </div>

    <!-- Middle: service name, 3-line reserve so cards line up -->
    <h3 class="min-h-[3.9em] font-sans text-[15px] font-semibold leading-[1.3] text-text line-clamp-4 hyphens-auto [overflow-wrap:anywhere] text-balance md:text-base">
      {{ props.name }}
    </h3>
    <p v-if="!props.needsDurationReview" class="mt-1 text-xs text-muted tabular-nums">
      {{ props.durationMin }} {{ t('services.minutes') }}
    </p>

    <!-- Bottom (pinned, hairline above): from-price -->
    <div class="mt-auto border-t border-border pt-2.5">
      <p class="flex items-baseline gap-1.5 whitespace-nowrap font-sans text-base font-semibold tabular-nums text-text">
        <span class="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{{ t('services.priceAb') }}</span>
        <span>{{ formatAb(props.priceCents) }}</span>
      </p>
    </div>
  </NuxtLink>
</template>
