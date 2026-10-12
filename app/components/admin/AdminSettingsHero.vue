<script setup lang="ts">
import { ArrowDown, ArrowUp, Image as ImageIcon, Loader2, Trash2, UploadCloud } from 'lucide-vue-next'

interface HeroSlide {
  id: string
  imagePath: string
  altText: string | null
  sortOrder: number
  isActive: boolean
}

const { t, locale } = useI18n()
const toast = useAdminToast()
const { confirm: confirmDialog } = useAdminConfirm()
const canManage = useAdminCan('settings.business')

const { data, refresh, pending } = await useAsyncData('admin-hero-slides', () =>
  $fetch<{ slides: HeroSlide[], intervalSec: number }>('/api/admin/settings/hero'),
)

const slides = computed(() =>
  [...(data.value?.slides || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
)
const intervalSec = ref<number>(6)
watch(() => data.value?.intervalSec, (v) => {
  if (typeof v === 'number') intervalSec.value = v
}, { immediate: true })

const dragOver = ref(false)
const uploads = ref<{ name: string, state: 'queued' | 'uploading' | 'done' | 'error', error?: string }[]>([])
const savingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const savingInterval = ref(false)

const remaining = computed(() => Math.max(0, 8 - slides.value.length))

async function uploadFiles(files: File[]) {
  if (!canManage.value || !files.length) return
  const batch = files.slice(0, remaining.value)
  for (const file of batch) {
    const entry = { name: file.name, state: 'queued' as const }
    uploads.value.push(entry)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      entry.state = 'error'
      entry.error = t('admin.hero.uploadFailed')
      continue
    }
    entry.state = 'uploading'
    try {
      const fd = new FormData()
      fd.append('file', file)
      await $fetch('/api/admin/settings/hero', { method: 'POST', body: fd })
      entry.state = 'done'
    }
    catch (e: any) {
      entry.state = 'error'
      entry.error = e?.data?.message || e?.data?.statusMessage || t('admin.hero.uploadFailed')
    }
  }
  uploads.value = uploads.value.filter(u => u.state === 'error')
  await refresh()
  toast.success(t('admin.hero.saved'), '')
}

function onPick(e: Event) {
  const files = [...((e.target as HTMLInputElement).files || [])]
  ;(e.target as HTMLInputElement).value = ''
  void uploadFiles(files)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  void uploadFiles([...(e.dataTransfer?.files || [])])
}

async function saveSlide(s: HeroSlide, patch: { isActive?: boolean, altText?: string | null }) {
  if (!canManage.value || savingId.value === s.id) return
  savingId.value = s.id
  try {
    await $fetch(`/api/admin/settings/hero/${s.id}`, { method: 'PUT', body: patch })
    await refresh()
  }
  catch (e: any) {
    toast.error(t('admin.hero.saveFailed'), e?.data?.message || e?.data?.statusMessage || '')
  }
  finally {
    savingId.value = null
  }
}

async function move(s: HeroSlide, dir: -1 | 1) {
  if (!canManage.value) return
  const ordered = slides.value.map(x => x.id)
  const i = ordered.indexOf(s.id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= ordered.length) return
  const [moved] = ordered.splice(i, 1)
  ordered.splice(j, 0, moved!)
  try {
    await $fetch('/api/admin/settings/hero/order', { method: 'PUT', body: { order: ordered } })
    await refresh()
  }
  catch (e: any) {
    toast.error(t('admin.hero.saveFailed'), e?.data?.message || e?.data?.statusMessage || '')
  }
}

async function removeSlide(s: HeroSlide) {
  if (!canManage.value || deletingId.value === s.id) return
  const ok = await confirmDialog({
    title: t('admin.hero.deleteConfirmTitle'),
    message: t('admin.hero.deleteConfirmMessage'),
  })
  if (!ok) return
  deletingId.value = s.id
  try {
    await $fetch(`/api/admin/settings/hero/${s.id}`, { method: 'DELETE' })
    await refresh()
    toast.success(t('admin.hero.saved'), '')
  }
  catch (e: any) {
    toast.error(t('admin.hero.saveFailed'), e?.data?.message || e?.data?.statusMessage || '')
  }
  finally {
    deletingId.value = null
  }
}

async function saveInterval() {
  if (!canManage.value || savingInterval.value) return
  const v = Math.min(15, Math.max(3, Math.round(Number(intervalSec.value) || 6)))
  intervalSec.value = v
  savingInterval.value = true
  try {
    await $fetch('/api/admin/settings/hero/interval', { method: 'PUT', body: { intervalSec: v } })
    await refresh()
    toast.success(t('admin.hero.saved'), '')
  }
  catch (e: any) {
    toast.error(t('admin.hero.saveFailed'), e?.data?.message || e?.data?.statusMessage || '')
  }
  finally {
    savingInterval.value = false
  }
}
</script>

<template>
  <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
    <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
      {{ t('admin.hero.title') }}
    </h2>
    <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
      {{ t('admin.hero.desc') }}
    </p>

    <!-- Multi-file picker + drag-and-drop -->
    <label
      class="group flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 transition-colors hover:border-[#2B71AE] hover:bg-slate-50 dark:hover:bg-slate-800/50"
      :class="{ 'pointer-events-none opacity-50': !canManage || !remaining }"
      :style="{ borderColor: dragOver ? '#2B71AE' : 'var(--color-border)' }"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop="onDrop"
    >
      <span class="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400 dark:bg-[#0B1520]">
        <UploadCloud class="h-5 w-5" aria-hidden="true" />
      </span>
      <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">
        {{ t('admin.hero.picker') }} ({{ t('admin.hero.dropHint') }})
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        class="hidden"
        :disabled="!canManage || !remaining"
        @change="onPick"
      />
    </label>
    <p v-if="!remaining" class="mt-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
      {{ t('admin.hero.maxReached') }}
    </p>

    <!-- Per-file upload status -->
    <ul v-if="uploads.length" class="mt-2 space-y-1 text-xs" aria-live="polite">
      <li v-for="u in uploads" :key="u.name" class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <Loader2 v-if="u.state === 'uploading' || u.state === 'queued'" class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span class="truncate font-medium">{{ u.name }}</span>
        <span class="shrink-0 text-slate-400">
          {{ u.state === 'done' ? t('admin.hero.saved') : u.state === 'error' ? (u.error || t('admin.hero.uploadFailed')) : t('admin.hero.uploading') }}
        </span>
      </li>
    </ul>

    <!-- Slides list -->
    <div v-if="pending" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div v-for="i in 3" :key="i" class="animate-pulse rounded-sm border border-border bg-surface p-2">
        <div class="aspect-[4/5] w-full rounded-sm bg-border/40" />
        <div class="mt-2 h-8 rounded bg-border/40" />
      </div>
    </div>

    <div v-else-if="slides.length" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div
        v-for="(s, i) in slides"
        :key="s.id"
        class="rounded-sm border border-border bg-surface p-2.5"
      >
        <div class="flex gap-3">
          <div class="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-sm bg-border/40">
            <img :src="s.imagePath" :alt="s.altText || ''" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <span
              v-if="!s.isActive"
              class="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-white"
            >Off</span>
          </div>
          <div class="min-w-0 flex-1 space-y-2">
            <label class="block">
              <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                {{ t('admin.hero.altLabel') }}
              </span>
              <input
                :value="s.altText || ''"
                type="text"
                maxlength="200"
                :placeholder="t('admin.hero.altPlaceholder')"
                :disabled="!canManage || savingId === s.id"
                class="h-9 w-full rounded-md border bg-transparent px-2.5 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 disabled:opacity-50"
                :style="{ borderColor: 'var(--color-border)' }"
                @change="saveSlide(s, { altText: ($event.target as HTMLInputElement).value })"
              />
            </label>
            <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                :checked="s.isActive"
                :disabled="!canManage || savingId === s.id"
                class="h-4 w-4 rounded accent-[#2B71AE] disabled:opacity-50"
                @change="saveSlide(s, { isActive: ($event.target as HTMLInputElement).checked })"
              />
              <span>{{ t('admin.hero.active') }}</span>
            </label>
            <div class="flex items-center gap-1">
              <button
                type="button"
                :disabled="!canManage || i === 0"
                :title="t('admin.hero.moveUp')"
                :aria-label="`${t('admin.hero.moveUp')} (${s.altText || s.imagePath})`"
                class="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
                @click="move(s, -1)"
              >
                <ArrowUp class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                :disabled="!canManage || i === slides.length - 1"
                :title="t('admin.hero.moveDown')"
                :aria-label="`${t('admin.hero.moveDown')} (${s.altText || s.imagePath})`"
                class="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
                @click="move(s, 1)"
              >
                <ArrowDown class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                :disabled="!canManage || deletingId === s.id"
                :title="t('admin.hero.delete')"
                :aria-label="`${t('admin.hero.delete')} (${s.altText || s.imagePath})`"
                class="inline-flex h-8 w-8 items-center justify-center rounded text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                @click="removeSlide(s)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="mt-4 rounded-md border border-dashed p-6 text-center" :style="{ borderColor: 'var(--color-border)' }">
      <ImageIcon class="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('admin.hero.empty') }}</p>
    </div>

    <!-- Interval -->
    <div class="mt-4 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
      <label class="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
        <span>{{ t('admin.hero.intervalLabel') }}</span>
        <input
          v-model.number="intervalSec"
          type="number"
          min="3"
          max="15"
          step="1"
          :disabled="!canManage || savingInterval"
          class="h-9 w-20 rounded-md border bg-transparent px-2 text-center text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 disabled:opacity-50"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="saveInterval"
        />
      </label>
      <p class="mt-1.5 text-[11px] text-slate-400">{{ t('admin.hero.intervalHint') }}</p>
    </div>
  </div>
</template>
