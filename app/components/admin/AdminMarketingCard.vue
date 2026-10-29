<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ExternalLink, Loader2, RefreshCw, Save, ShieldCheck, TestTube2 } from 'lucide-vue-next'
import {
  MARKETING_EVENT_DEFINITIONS,
  MARKETING_PROVIDERS,
  providerSupportedEvents,
} from '~~/shared/marketing'

interface Integration {
  id: string
  name: string
  descriptionEn: string
  descriptionDe: string
  docsUrl: string
  enabled: boolean
  status: string
  config: Record<string, string>
  events: Record<string, boolean>
  hasSecrets: Record<string, boolean>
  missingRequired: string[]
  delivery: { browser: boolean, server: boolean }
  testConnection: boolean
  testNoteEn?: string
  testNoteDe?: string
  lastVerifiedAt: string | null
  lastError: string | null
  lastErrorAt: string | null
}

const props = defineProps<{ integration: Integration }>()
const emit = defineEmits<{ (e: 'saved'): void }>()

const { locale } = useI18n()
const toast = useAdminToast()
const isDe = computed(() => locale.value === 'de')
const tr = (en: string, de: string) => isDe.value ? de : en

const provider = computed(() => MARKETING_PROVIDERS.find(p => p.id === props.integration.id))
const supportedEvents = computed(() => provider.value ? providerSupportedEvents(provider.value) : [])

const form = reactive({
  enabled: props.integration.enabled,
  config: {} as Record<string, string>,
  secrets: {} as Record<string, string>,
  events: {} as Record<string, boolean>,
  clearSecrets: {} as Record<string, boolean>,
})
let snapshot = ''
const saving = ref(false)
const testing = ref(false)
const feedback = ref('')
const feedbackKind = ref<'success' | 'error' | 'info'>('info')

function hydrate() {
  form.enabled = props.integration.enabled
  form.config = {}
  form.secrets = {}
  form.events = { ...props.integration.events }
  form.clearSecrets = {}
  for (const f of provider.value?.fields || []) {
    if (f.secret) form.secrets[f.key] = ''
    else form.config[f.key] = props.integration.config[f.key] || ''
  }
  snapshot = JSON.stringify({ enabled: form.enabled, config: form.config, secrets: form.secrets, events: form.events, clearSecrets: form.clearSecrets })
  feedback.value = ''
}

hydrate()
watch(() => props.integration, hydrate, { deep: true })

const dirty = computed(() =>
  JSON.stringify({ enabled: form.enabled, config: form.config, secrets: form.secrets, events: form.events, clearSecrets: form.clearSecrets }) !== snapshot,
)

const statusMeta = computed(() => {
  const map: Record<string, { en: string, de: string, cls: string }> = {
    NOT_CONFIGURED: { en: 'Not configured', de: 'Nicht konfiguriert', cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300' },
    INCOMPLETE: { en: 'Incomplete', de: 'Unvollständig', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    UNVERIFIED: { en: 'Configured, unverified', de: 'Konfiguriert, ungeprüft', cls: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
    VERIFIED: { en: 'Verified', de: 'Verifiziert', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    DISABLED: { en: 'Disabled', de: 'Deaktiviert', cls: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' },
    ERROR: { en: 'Needs attention', de: 'Prüfung erforderlich', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  }
  return map[props.integration.status] || map.NOT_CONFIGURED
})

const missingLabels = computed(() => {
  const missing = props.integration.missingRequired || []
  return (provider.value?.fields || [])
    .filter(f => missing.includes(f.key))
    .map(f => isDe.value ? f.labelDe : f.labelEn)
})

const eventLabel = (key: string) => {
  const d = MARKETING_EVENT_DEFINITIONS.find(e => e.key === key)
  return d ? (isDe.value ? d.labelDe : d.labelEn) : key
}
const eventDescription = (key: string) => {
  const d = MARKETING_EVENT_DEFINITIONS.find(e => e.key === key)
  return d ? (isDe.value ? d.descriptionDe : d.descriptionEn) : ''
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(isDe.value ? 'de-DE' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

async function save() {
  if (saving.value || !dirty.value) return
  saving.value = true
  feedback.value = ''
  try {
    const secrets = Object.fromEntries(Object.entries(form.secrets).filter(([, v]) => v.trim()))
    const clearSecrets = Object.entries(form.clearSecrets).filter(([, v]) => v).map(([k]) => k)
    await $fetch(`/api/admin/marketing/${props.integration.id}`, {
      method: 'PUT',
      body: {
        enabled: form.enabled,
        config: form.config,
        secrets,
        events: form.events,
        clearSecrets,
      },
    })
    toast.success(tr('Integration saved', 'Integration gespeichert'), tr('Configuration saved. Run a verification to validate it.', 'Konfiguration gespeichert. Bitte Verifikation ausführen.'))
    feedback.value = tr('Saved. This is not a connection test.', 'Gespeichert. Dies ist kein Verbindungstest.')
    feedbackKind.value = 'info'
    emit('saved')
  }
  catch (e: any) {
    feedback.value = e?.data?.message || e?.data?.statusMessage || tr('Could not save the integration.', 'Integration konnte nicht gespeichert werden.')
    feedbackKind.value = 'error'
  }
  finally {
    saving.value = false
  }
}

async function test() {
  if (testing.value) return
  testing.value = true
  feedback.value = ''
  try {
    const res = await $fetch<{ verified: boolean, tested: boolean, message: string }>(`/api/admin/marketing/${props.integration.id}/test`, { method: 'POST' })
    feedback.value = res.message
    feedbackKind.value = res.verified ? 'success' : 'info'
    if (res.verified) toast.success(tr('Verification passed', 'Verifikation erfolgreich'), res.message)
    else toast.info(tr('Verification not completed', 'Verifikation nicht abgeschlossen'), res.message)
    emit('saved')
  }
  catch (e: any) {
    feedback.value = e?.data?.message || e?.data?.statusMessage || tr('Verification failed.', 'Verifikation fehlgeschlagen.')
    feedbackKind.value = 'error'
  }
  finally {
    testing.value = false
  }
}

function reset() {
  hydrate()
}
</script>

<template>
  <section class="flex h-full flex-col rounded-xl border border-border bg-surface p-4 sm:p-5">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-heading text-base font-bold text-text">{{ integration.name }}</h3>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" :class="statusMeta.cls">
            {{ isDe ? statusMeta.de : statusMeta.en }}
          </span>
        </div>
        <p class="mt-1 text-xs text-muted">{{ isDe ? integration.descriptionDe : integration.descriptionEn }}</p>
      </div>
      <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-text">
        <input v-model="form.enabled" type="checkbox" class="h-4 w-4 rounded accent-primary" />
        {{ tr('Enabled', 'Aktiviert') }}
      </label>
    </header>

    <p v-if="missingLabels.length" class="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
      {{ tr('Missing required fields:', 'Fehlende Pflichtfelder:') }} {{ missingLabels.join(', ') }}
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted">
      <span v-if="integration.delivery.browser" class="rounded-full border border-border px-2 py-0.5">{{ tr('Browser', 'Browser') }}</span>
      <span v-if="integration.delivery.server" class="rounded-full border border-border px-2 py-0.5">{{ tr('Server', 'Server') }}</span>
      <a :href="integration.docsUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
        {{ tr('Setup guide', 'Einrichtungshilfe') }}
        <ExternalLink class="h-3 w-3" aria-hidden="true" />
      </a>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <label v-for="f in provider?.fields || []" :key="f.key" class="block" :class="f.secret ? '' : 'sm:col-span-1'">
        <span class="mb-1 block text-[11px] font-semibold text-text">
          {{ isDe ? f.labelDe : f.labelEn }}<span v-if="f.required" class="text-rose-500"> *</span>
        </span>
        <input
          v-if="f.secret"
          v-model="form.secrets[f.key]"
          type="password"
          :placeholder="integration.hasSecrets[f.key] ? '••••••••••••••••' : (f.placeholder || '••••••••')"
          autocomplete="new-password"
          dir="ltr"
          :class="settingsInputCls"
          :style="{ borderColor: 'var(--color-border)' }"
        />
        <input
          v-else
          v-model="form.config[f.key]"
          type="text"
          :placeholder="f.placeholder || ''"
          autocomplete="off"
          dir="ltr"
          :class="settingsInputCls"
          :style="{ borderColor: 'var(--color-border)' }"
        />
        <span class="mt-1 block text-[10px] text-muted">{{ isDe ? f.helpDe : f.helpEn }}</span>
        <span v-if="f.secret && integration.hasSecrets[f.key]" class="mt-1 flex items-center gap-2 text-[10px] text-muted">
          <span>{{ tr('Stored encrypted. Leave blank to keep it.', 'Verschlüsselt gespeichert. Leer lassen, um beizubehalten.') }}</span>
          <label class="inline-flex items-center gap-1">
            <input v-model="form.clearSecrets[f.key]" type="checkbox" class="h-3 w-3 rounded accent-rose-500" />
            {{ tr('Clear', 'Löschen') }}
          </label>
        </span>
      </label>
    </div>

    <div class="mt-4 rounded-lg border border-border bg-bg/40 p-3">
      <p class="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">{{ tr('Events', 'Events') }}</p>
      <div class="grid gap-2 sm:grid-cols-2">
        <label v-for="event in supportedEvents" :key="event" class="flex items-start gap-2 text-xs text-text">
          <input v-model="form.events[event]" type="checkbox" class="mt-0.5 h-4 w-4 rounded accent-primary" />
          <span>
            <span class="font-semibold">{{ eventLabel(event) }}</span>
            <span class="block text-[10px] text-muted">{{ eventDescription(event) }}</span>
          </span>
        </label>
      </div>
      <p class="mt-2 text-[10px] text-muted">
        {{ tr('DepositPaid is sent only after server-verified payment. BookingCancelled is excluded from conversions by default.', 'DepositPaid wird erst nach serverseitig bestätigter Zahlung gesendet. BookingCancelled ist standardmäßig von Conversions ausgeschlossen.') }}
      </p>
    </div>

    <div v-if="integration.lastVerifiedAt || integration.lastError" class="mt-3 space-y-1 text-[10px] text-muted">
      <p v-if="integration.lastVerifiedAt">{{ tr('Last verified', 'Zuletzt verifiziert') }}: {{ formatDate(integration.lastVerifiedAt) }}</p>
      <p v-if="integration.lastError" class="text-rose-600 dark:text-rose-400">
        {{ tr('Last error', 'Letzter Fehler') }}: {{ integration.lastError }}
      </p>
    </div>

    <div
      v-if="feedback"
      role="status"
      class="mt-3 rounded-md border p-2.5 text-[11px] font-medium"
      :class="feedbackKind === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
        : feedbackKind === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300'
          : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300'"
    >
      {{ feedback }}
    </div>

    <div class="mt-auto flex flex-wrap items-center gap-2 pt-4">
      <button
        type="button"
        :disabled="saving || !dirty"
        class="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-bold text-on-primary disabled:opacity-50"
        @click="save"
      >
        <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <Save v-else class="h-3.5 w-3.5" aria-hidden="true" />
        {{ tr('Save', 'Speichern') }}
      </button>
      <button
        type="button"
        :disabled="saving || !dirty"
        class="inline-flex h-10 items-center gap-1.5 rounded-md border border-border px-3.5 text-xs font-semibold text-text disabled:opacity-50"
        @click="reset"
      >
        <RefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
        {{ tr('Discard', 'Verwerfen') }}
      </button>
      <button
        type="button"
        :disabled="testing || saving || dirty"
        class="ms-auto inline-flex h-10 items-center gap-1.5 rounded-md border border-border px-3.5 text-xs font-semibold text-text disabled:opacity-50"
        @click="test"
      >
        <Loader2 v-if="testing" class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <TestTube2 v-else class="h-3.5 w-3.5" aria-hidden="true" />
        {{ integration.testConnection ? tr('Test connection', 'Verbindung testen') : tr('Validate setup', 'Einrichtung prüfen') }}
      </button>
    </div>
    <p v-if="dirty" class="mt-2 text-[10px] text-amber-700 dark:text-amber-300">
      {{ tr('Save changes before running verification.', 'Änderungen vor der Prüfung speichern.') }}
    </p>
    <p v-if="!integration.testConnection && integration.testNoteEn" class="mt-2 text-[10px] text-muted">
      {{ isDe ? integration.testNoteDe : integration.testNoteEn }}
    </p>
    <p v-else-if="integration.testConnection" class="mt-2 inline-flex items-center gap-1 text-[10px] text-muted">
      <ShieldCheck class="h-3 w-3" aria-hidden="true" />
      {{ tr('Verification uses the provider API and never sends a conversion.', 'Die Verifikation nutzt die Anbieter-API und sendet keine Conversion.') }}
    </p>
  </section>
</template>
