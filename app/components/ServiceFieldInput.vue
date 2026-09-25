<script setup lang="ts">
import { UploadCloud } from 'lucide-vue-next'
import { GOVERNORATES } from '~~/shared/constants/governorates'

const props = defineProps<{
  field: any
  modelValue: string | File[]
}>()

const emit = defineEmits(['update:modelValue'])

const { locale } = useI18n()
const inputCls = 'h-11 w-full rounded-xl border bg-slate-50 px-3.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2B71AE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100 dark:focus:bg-[#0B1520] transition-colors'

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    emit('update:modelValue', Array.from(target.files))
  }
}
</script>

<template>
  <div class="mb-2">
    <label class="block">
      <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {{ locale === 'ar' ? field.labelAr : field.labelEn }}
        <span v-if="field.isRequired" class="text-rose-500 font-bold">*</span>
      </span>
      
      <!-- Text Input -->
      <input 
        v-if="field.fieldType === 'text'" 
        :value="modelValue as string"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        type="text" 
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
        placeholder="01xxxxxxxxx"
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
        :required="field.isRequired" 
        class="w-full rounded-xl border bg-slate-50 p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2B71AE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100 transition-colors" 
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
        <option value="">{{ locale === 'ar' ? 'اختر...' : 'Select...' }}</option>
        
        <template v-if="field.labelEn === 'Governorate'">
          <option v-for="gov in GOVERNORATES" :key="gov.value" :value="gov.value">
            {{ locale === 'ar' ? gov.labelAr : gov.labelEn }}
          </option>
        </template>
        <template v-else-if="field.options && field.options.length">
          <option v-for="(opt, idx) in field.options" :key="idx" :value="opt.valueEn">
            {{ locale === 'ar' ? opt.valueAr : opt.valueEn }}
          </option>
        </template>
      </select>

      <!-- File Upload Dropzone -->
      <div v-else-if="field.fieldType === 'file'" class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white p-4 dark:bg-[#0B1520] transition-colors">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/20 dark:text-blue-300">
              <UploadCloud class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {{ locale === 'ar' ? 'رفع المرفقات، المخططات، أو الصور' : 'Upload attachments, schematics, or photos' }}
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
            class="block w-full sm:w-auto text-xs text-slate-500 file:me-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#2B71AE]/10 file:text-[#2B71AE] hover:file:bg-[#2B71AE]/20 cursor-pointer"
          />
        </div>
      </div>

    </label>
  </div>
</template>
