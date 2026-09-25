<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileText,
  Layers,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const serviceId = route.params.id as string

useHead(() => ({ title: `Form Builder | Admin | ${t('brand.name')}` }))

const { data: fields, refresh } = await useAsyncData(`service-form-${serviceId}`, () =>
  $fetch<any[]>(`/api/admin/services/${serviceId}/form`),
)

const isCreating = ref(false)
const newField = reactive({
  labelAr: '',
  labelEn: '',
  fieldType: 'text',
  isRequired: false,
  options: [] as { valueAr: string, valueEn: string }[],
})
const newOption = reactive({ valueAr: '', valueEn: '' })
const saving = ref(false)
const reordering = ref(false)

function addOption() {
  if (!newOption.valueAr.trim() || !newOption.valueEn.trim()) return
  newField.options.push({ valueAr: newOption.valueAr.trim(), valueEn: newOption.valueEn.trim() })
  newOption.valueAr = ''
  newOption.valueEn = ''
}

function removeOption(idx: number) {
  newField.options.splice(idx, 1)
}

async function addField() {
  if (!newField.labelAr.trim() || !newField.labelEn.trim()) {
    alert(locale.value === 'ar' ? 'يرجى إدخال اسم الحقل باللغتين العربية والإنجليزية.' : 'Field labels in both English and Arabic are required.')
    return
  }
  saving.value = true
  try {
    await $fetch(`/api/admin/services/${serviceId}/form/fields`, {
      method: 'POST',
      body: {
        labelAr: newField.labelAr.trim(),
        labelEn: newField.labelEn.trim(),
        fieldType: newField.fieldType,
        isRequired: newField.isRequired,
        sortOrder: fields.value ? fields.value.length + 1 : 1,
        options: newField.fieldType === 'select' && newField.options.length ? newField.options : null,
      },
    })
    isCreating.value = false
    newField.labelAr = ''
    newField.labelEn = ''
    newField.fieldType = 'text'
    newField.isRequired = false
    newField.options = []
    await refresh()
  }
  catch (e) {
    alert('Error adding field')
  }
  finally {
    saving.value = false
  }
}

async function removeField(id: string, label: string) {
  if (!confirm(locale.value === 'ar' ? `هل أنت متأكد من حذف الحقل "${label}"؟` : `Remove field "${label}"?`)) return
  try {
    await $fetch(`/api/admin/services/${serviceId}/form/fields/${id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (e) {
    alert('Error removing field')
  }
}

async function moveField(index: number, dir: -1 | 1) {
  if (!fields.value) return
  const newFields = [...fields.value]
  const targetIndex = index + dir
  if (targetIndex < 0 || targetIndex >= newFields.length) return

  const temp = newFields[index]
  newFields[index] = newFields[targetIndex]
  newFields[targetIndex] = temp
  fields.value = newFields

  reordering.value = true
  try {
    await $fetch(`/api/admin/services/${serviceId}/form/order`, {
      method: 'PUT',
      body: { fieldIds: newFields.map(f => f.id) },
    })
  }
  catch (e) {
    alert('Failed to save field order')
    await refresh()
  }
  finally {
    reordering.value = false
  }
}

const inputCls = 'h-10 w-full rounded-md border bg-white px-3 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]'
</script>

<template>
  <div>
    <!-- Header with Back to Services -->
    <AdminPageHeader
      :title="locale === 'ar' ? 'منشئ نماذج الخدمة' : 'Service Form Builder'"
      :description="locale === 'ar' ? 'تخصيص الحقول المدخلة، الترتيب، ونوع البيانات المطلوبة من العميل.' : 'Configure custom input fields, data types, and display ordering for this engineering service.'"
      back-to="/admin/services"
      :back-label="locale === 'ar' ? 'العودة إلى الخدمات' : 'Back to Services'"
    >
      <template #actions>
        <button
          v-if="!isCreating"
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#285E8E]"
          @click="isCreating = true"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة حقل جديد' : 'Add Field' }}</span>
        </button>
      </template>
    </AdminPageHeader>

    <!-- Create New Field Card Form -->
    <div
      v-if="isCreating"
      class="mb-6 rounded-md border bg-white p-5 shadow-sm dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
        <h3 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'إضافة حقل جديد للنموذج' : 'Add New Form Field' }}
        </h3>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          @click="isCreating = false"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Label (EN) *</span>
            <input v-model="newField.labelEn" type="text" placeholder="e.g. Machine Name" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Label (AR) *</span>
            <input v-model="newField.labelAr" type="text" placeholder="مثال: اسم الماكينة" dir="rtl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Field Type</span>
            <select v-model="newField.fieldType" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }">
              <option value="text">Text (نص قصير)</option>
              <option value="textarea">Textarea (نص طويل / وصف)</option>
              <option value="phone">Phone (رقم هاتف مصري)</option>
              <option value="select">Select (قائمة اختيارات)</option>
              <option value="file">File Upload (رفع ملف أو صورة)</option>
            </select>
          </label>

          <div class="flex items-end pb-2">
            <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input v-model="newField.isRequired" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
              <span>{{ locale === 'ar' ? 'حقل إجباري (مطلوب لتقديم الطلب)' : 'Required field' }}</span>
            </label>
          </div>
        </div>

        <!-- Options for Select type -->
        <div v-if="newField.fieldType === 'select'" class="rounded-md border p-3.5 bg-slate-50 dark:bg-slate-800/40" :style="{ borderColor: 'var(--color-border)' }">
          <span class="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">Dropdown Options (خيارات القائمة)</span>
          <div class="flex gap-2 mb-2">
            <input v-model="newOption.valueEn" placeholder="Option (EN)" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            <input v-model="newOption.valueAr" placeholder="الخيار (AR)" dir="rtl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            <button type="button" class="shrink-0 rounded bg-[#2B71AE] px-3 text-xs font-bold text-white hover:bg-[#285E8E]" @click="addOption">
              + Add
            </button>
          </div>
          <div v-if="newField.options.length" class="flex flex-wrap gap-1.5 pt-1">
            <span
              v-for="(opt, idx) in newField.options"
              :key="idx"
              class="inline-flex items-center gap-1.5 rounded bg-white px-2 py-1 text-xs border dark:bg-slate-800"
              :style="{ borderColor: 'var(--color-border)' }"
            >
              <span>{{ opt.valueEn }} / {{ opt.valueAr }}</span>
              <button type="button" class="text-rose-500 hover:text-rose-700" @click="removeOption(idx)">✕</button>
            </span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button
            type="button"
            class="h-8 rounded border px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            @click="isCreating = false"
          >
            {{ locale === 'ar' ? 'إلغاء' : 'Cancel' }}
          </button>
          <button
            type="button"
            :disabled="saving"
            class="h-8 rounded bg-[#2B71AE] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#285E8E] disabled:opacity-50"
            @click="addField"
          >
            {{ saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ الحقل' : 'Save Field') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reorder Notice Indicator -->
    <div class="mb-3 flex items-center justify-between text-xs text-slate-500">
      <span>{{ locale === 'ar' ? `إجمالي الحقول: ${fields?.length || 0}` : `Total Fields: ${fields?.length || 0}` }}</span>
      <span v-if="reordering" class="font-medium text-[#2B71AE]">Saving field order…</span>
      <span v-else class="text-[11px] text-slate-400">{{ locale === 'ar' ? 'استخدم الأسهم لإعادة ترتيب ظهور الحقول' : 'Use arrows to reorder fields' }}</span>
    </div>

    <!-- Form Fields List -->
    <div v-if="fields?.length" class="space-y-2.5">
      <div
        v-for="(field, idx) in fields"
        :key="field.id"
        class="flex flex-col gap-3 rounded-md border bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:bg-[#162032]"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <!-- Field Info -->
        <div class="flex items-center gap-3">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {{ idx + 1 }}
          </span>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-slate-900 dark:text-slate-100">{{ field.labelEn }}</span>
              <span class="text-xs text-slate-400">/</span>
              <span class="text-xs text-slate-600 dark:text-slate-400">{{ field.labelAr }}</span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
              <span class="rounded bg-blue-50 px-2 py-0.2 font-mono font-medium text-[#2B71AE] dark:bg-blue-950/40 dark:text-blue-300">
                type: {{ field.fieldType }}
              </span>
              <span
                v-if="field.isRequired"
                class="rounded bg-rose-50 px-2 py-0.2 font-medium text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
              >
                Required
              </span>
              <span v-if="field.options" class="text-slate-400">
                • {{ Array.isArray(field.options) ? field.options.length : 0 }} options configured
              </span>
            </div>
          </div>
        </div>

        <!-- Field Actions: Reorder & Delete -->
        <div class="flex items-center gap-1.5 self-end sm:self-center">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
            :disabled="idx === 0 || reordering"
            :title="locale === 'ar' ? 'تحريك لأعلى' : 'Move up'"
            @click="moveField(idx, -1)"
          >
            <ArrowUp class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
            :disabled="idx === (fields?.length || 1) - 1 || reordering"
            :title="locale === 'ar' ? 'تحريك لأسفل' : 'Move down'"
            @click="moveField(idx, 1)"
          >
            <ArrowDown class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="ms-2 flex h-8 items-center gap-1 rounded border border-rose-200 px-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/40"
            @click="removeField(field.id, field.labelEn)"
          >
            <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'حذف' : 'Remove' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="rounded-md border bg-white p-8 dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <AdminEmptyState
        :title="locale === 'ar' ? 'لا توجد حقول في نموذج هذه الخدمة' : 'No form fields configured'"
        :description="locale === 'ar' ? 'أضف الحقول التي يحتاجها فريق الهندسة عند تقديم العميل لطلب الخدمة.' : 'Add the form fields required for clients submitting this engineering service.'"
        :icon="Layers"
      >
        <template #action>
          <button
            type="button"
            class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#285E8E]"
            @click="isCreating = true"
          >
            <Plus class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'إضافة حقل' : 'Add Field' }}</span>
          </button>
        </template>
      </AdminEmptyState>
    </div>
  </div>
</template>
