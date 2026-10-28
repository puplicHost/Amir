<script setup lang="ts">
import { Megaphone } from 'lucide-vue-next'

const { t, locale } = useI18n()
const canBusiness = useAdminCan('settings.business')
const canBanners = useAdminCan('banners.manage')

const {
  form: ticker, loading: tickerLoading, statusMessage: tickerStatus, isError: tickerError,
  dirty: tickerDirty, save: saveTicker, reset: resetTicker,
} = await useSettingsForm({
  key: 'settings-ticker',
  endpoint: '/api/admin/settings',
  defaults: {
    tickerTextAr: '',
    tickerTextEn: '',
    tickerActive: false,
    tickerSpeed: 30,
  },
  mapData: response => ({
    tickerTextAr: response.tickerTextAr ?? '',
    tickerTextEn: response.tickerTextEn ?? '',
    tickerActive: Boolean(response.tickerActive),
    tickerSpeed: response.tickerSpeed ?? 30,
  }),
  saveEndpoint: '/api/admin/settings/ticker',
  successAr: 'تم حفظ الشريط الإعلاني.',
  successEn: 'Announcement ticker saved.',
  failAr: 'فشل حفظ الشريط الإعلاني.',
  failEn: 'Failed to save the announcement ticker.',
})
</script>

<template>
  <div class="space-y-6">
    <section v-if="canBanners" aria-labelledby="settings-announcements-heading">
      <div class="mb-3 flex items-center gap-2">
        <Megaphone class="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 id="settings-announcements-heading" class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100">
          {{ locale === 'ar' ? 'شريط الإعلانات العلوي' : 'Top Announcement Bar' }}
        </h2>
      </div>
      <AdminSettingsAnnouncements />
    </section>

    <form v-if="canBusiness" class="max-w-2xl space-y-4" @submit.prevent="saveTicker">
      <div class="flex items-center gap-2">
        <Megaphone class="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100">
          {{ t('admin.tickerTitle') }}
        </h2>
      </div>

      <div class="space-y-4 rounded-md border bg-white p-5 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('admin.tickerTextEn') }}</span>
            <input v-model="ticker.tickerTextEn" type="text" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('admin.tickerTextAr') }}</span>
            <input v-model="ticker.tickerTextAr" type="text" dir="rtl" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>
        <div class="flex flex-wrap items-center gap-6">
          <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <input v-model="ticker.tickerActive" type="checkbox" class="h-4 w-4 rounded accent-primary" />
            <span>{{ t('admin.tickerActive') }}</span>
          </label>
          <label class="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <span>{{ t('admin.tickerSpeed') }}</span>
            <input v-model.number="ticker.tickerSpeed" type="number" min="5" max="120" class="h-11 w-20 rounded border bg-transparent px-2 text-center text-xs" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>

        <p v-if="tickerStatus" role="status" class="text-xs font-medium" :class="tickerError ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'">
          {{ tickerStatus }}
        </p>

        <div class="flex items-center gap-2">
          <button type="submit" :disabled="tickerLoading || !tickerDirty" class="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50">
            <span>{{ tickerLoading ? t('common.saving') : t('common.save') }}</span>
          </button>
          <button type="button" :disabled="tickerLoading || !tickerDirty" class="h-11 rounded-md border px-4 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800" @click="resetTicker">
            {{ t('common.reset') }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
