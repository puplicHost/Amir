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
  /** Optional cover image (e.g. /service/women.png); icon layout when omitted */
  image?: string | null
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
    class="group flex h-full min-h-[120px] flex-col overflow-hidden rounded-sm border border-border bg-surface transition-[border-color] duration-150 motion-safe:transition-[border-color] hover:border-text"
    :class="props.image ? 'p-0' : 'p-3.5'"
  >
    <!-- Cover image (when provided) -->
    <div v-if="props.image" class="relative h-40 w-full overflow-hidden sm:h-44">
      <img
        :src="props.image"
        :alt="props.title"
        loading="lazy"
        class="h-full w-full object-cover object-center"
        draggable="false"
      />
      <span class="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg/80 text-text backdrop-blur-sm">
        <ArrowUpRight class="h-4 w-4" :stroke-width="1.5" aria-hidden="true" />
      </span>
    </div>

    <!-- Top: section icon (no tile) + arrow cue (no-image fallback) -->
    <div v-else class="mb-2.5 flex items-start justify-between gap-2">
      <ServiceSectionIcon :section="props.section" class="h-11 w-7 text-text" />
      <ArrowUpRight
        class="h-4 w-4 shrink-0 text-muted transition-transform duration-150 motion-safe:transition-transform group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
        :stroke-width="1.5"
        aria-hidden="true"
      />
    </div>

    <!-- Middle: single-word section title -->
    <h3
      class="font-heading text-[26px] font-medium leading-[1.1] text-text text-balance"
      :class="props.image ? 'px-3.5 pt-3' : ''"
    >
      {{ props.title }}
    </h3>

    <!-- Bottom (pinned, hairline above): from-price + count -->
    <div class="border-t border-border pt-2.5" :class="props.image ? 'mx-3.5 mb-3.5 mt-3' : 'mt-auto'">
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
