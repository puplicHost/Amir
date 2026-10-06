<script setup lang="ts">
import { UploadCloud } from 'lucide-vue-next'
import { GOVERNORATES } from '~~/shared/constants/governorates'

const props = withDefaults(defineProps<{
  field: any
  modelValue: string | File[]
  bilingual?: boolean
}>(), {
  bilingual: false,
})

const emit = defineEmits(['update:modelValue'])

const { locale } = useI18n()
const inputCls = 'h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-xs sm:text-sm text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors'

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    emit('update:modelValue', Array.from(target.files))
  }
}

const displayLabel = computed(() => {
  if (props.bilingual) {
    return props.field.labelAr || props.field.labelEn
  }
  return locale.value === 'ar' ? props.field.labelAr : props.field.labelEn
})

const displayPlaceholder = computed(() => {
  if (props.bilingual) {
    return props.field.labelEn || props.field.labelAr || 'Enter value...'
  }
  return locale.value === 'ar' ? (props.field.labelAr || 'أدخل القيمة...') : (props.field.labelEn || 'Enter value...')
})
</script>

<template>
  <div class="mb-2">
    <label class="block">
      <span class="mb-1.5 block text-xs font-semibold text-muted">
        {{ displayLabel }}
        <span v-if="field.isRequired" class="text-rose-500 font-bold">*</span>
      </span>
      
      <!-- Text Input -->
      <input 
        v-if="field.fieldType === 'text'" 
        :value="modelValue as string"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        type="text" 
        :placeholder="displayPlaceholder"
        :required="field.isRequired" 
        :class="inputCls" 
        :style="{ borderColor: 'var(--color-border)' }" 
      />

      <!-- Phone Input -->
      <input 
        v-else-if="field.fieldType === 'phone'" 
        :value="modelValue as string"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        type="tel" 
        dir="ltr"
        :placeholder="bilingual ? 'e.g. 01012345678' : '01xxxxxxxxx'"
        :required="field.isRequired" 
        :class="inputCls" 
        :style="{ borderColor: 'var(--color-border)' }" 
      />

      <!-- Textarea Input -->
      <textarea 
        v-else-if="field.fieldType === 'textarea'" 
        :value="modelValue as string"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        rows="3" 
        :placeholder="displayPlaceholder"
        :required="field.isRequired" 
        class="w-full rounded-xl border border-border bg-surface p-3 text-xs sm:text-sm text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors" 
        :style="{ borderColor: 'var(--color-border)' }"
      ></textarea>

      <!-- Dropdown Select -->
      <select 
        v-else-if="field.fieldType === 'select'" 
        :value="modelValue as string"
        @input="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        :required="field.isRequired" 
        :class="inputCls" 
        :style="{ borderColor: 'var(--color-border)' }" 
      >
        <option value="">{{ bilingual ? 'Select an option...' : (locale === 'ar' ? 'اختر...' : 'Select...') }}</option>
        
        <template v-if="field.labelEn === 'Governorate'">
          <option v-for="gov in GOVERNORATES" :key="gov.value" :value="gov.value">
            {{ bilingual ? `${gov.labelAr} (${gov.labelEn})` : (locale === 'ar' ? gov.labelAr : gov.labelEn) }}
          </option>
        </template>
        <template v-else-if="field.options && field.options.length">
          <option v-for="(opt, idx) in field.options" :key="idx" :value="opt.valueEn">
            {{ bilingual ? `${opt.valueAr} (${opt.valueEn})` : (locale === 'ar' ? opt.valueAr : opt.valueEn) }}
          </option>
        </template>
      </select>

      <!-- File Upload Dropzone -->
      <div v-else-if="field.fieldType === 'file'" class="rounded-xl border border-dashed border-border bg-bg p-4 transition-colors">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UploadCloud class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-semibold text-muted">
                {{ bilingual ? 'رفع المرفقات أو المخططات' : (locale === 'ar' ? 'رفع المرفقات، المخططات، أو الصور' : 'Upload attachments, schematics, or photos') }}
              </p>
              <p class="text-[11px] text-slate-400">PDF, JPG, PNG (Max 5MB)</p>
            </div>
          </div>

          <input 
            type="file" 
            multiple
            accept="image/*,.pdf"
            @change="onFileChange"
            :required="field.isRequired && (!modelValue || !(modelValue as File[]).length)" 
            class="block w-full sm:w-auto text-xs text-muted file:me-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
          />
        </div>
      </div>

    </label>
  </div>
</template>
