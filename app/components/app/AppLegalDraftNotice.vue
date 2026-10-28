<script setup lang="ts">
const props = defineProps<{
  reviewed?: boolean
  missing?: string[]
}>()

const { locale } = useI18n()
const isDe = computed(() => locale.value === 'de')
</script>

<template>
  <div
    v-if="!props.reviewed"
    role="note"
    class="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100"
  >
    <p class="font-bold">
      {{ isDe ? 'Entwurf – rechtliche Prüfung und Freigabe stehen aus.' : 'Draft – legal review and approval are pending.' }}
    </p>
    <p class="mt-1">
      {{ isDe
        ? 'Diese Seite ist eine strukturierte Vorlage und kein rechtsgültiges Dokument. Sie darf erst veröffentlicht werden, wenn alle Platzhalter ersetzt und die Inhalte von qualifizierter Rechtsberatung freigegeben wurden.'
        : 'This page is a structured template, not a legally valid document. Publish only after every placeholder is replaced and qualified counsel has approved the content.' }}
    </p>
    <p v-if="props.missing && props.missing.length" class="mt-2">
      <span class="font-semibold">{{ isDe ? 'Fehlende Pflichtangaben:' : 'Missing required details:' }}</span>
      {{ props.missing.join(', ') }}
    </p>
  </div>
</template>
