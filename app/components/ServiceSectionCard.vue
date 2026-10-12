<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { centsToEur } from '~~/shared/booking'

const props = defineProps<{
  /** Service section key, e.g. DAMEN */
  section: string
  /** Display title, e.g. Damen */
  title: string
  /** Minimum "ab" price in EUR cents */
  priceCents: number
  /** Number of active services in the section */
  count: number
  /** Card destination, e.g. /services#DAMEN */
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
    class="group flex h-full min-h-[120px] flex-col rounded-sm border border-border bg-surface p-3.5 transition-[border-color] duration-150 motion-safe:transition-[border-color] hover:border-text"
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

    <!-- Middle: single-word section title -->
    <h3 class="font-heading text-[26px] font-medium leading-[1.1] text-text text-balance">
      {{ props.title }}
    </h3>

    <!-- Bottom (pinned, hairline above): from-price + count -->
    <div class="mt-auto border-t border-border pt-2.5">
      <p class="flex items-baseline gap-1.5 whitespace-nowrap font-sans text-[15px] font-semibold tabular-nums text-text">
        <span class="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{{ t('services.priceAb') }}</span>
        <span>{{ formatAb(props.priceCents) }}</span>
      </p>
      <p class="mt-0.5 text-xs text-muted">
        {{ t('services.sectionCount', { n: props.count }) }}
      </p>
    </div>
  </NuxtLink>
</template>
