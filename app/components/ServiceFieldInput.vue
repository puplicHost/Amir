<script setup lang="ts">
import { GOVERNORATES } from '~~/shared/constants/governorates'

const props = defineProps<{
  field: any
  modelValue: string | File[]
}>()

const emit = defineEmits(['update:modelValue'])

const { locale } = useI18n()
const inputCls = 'h-11 w-full rounded border bg-transparent px-3 placeholder:text-slate-400 dark:placeholder:text-slate-500'

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    emit('update:modelValue', Array.from(target.files))
  }
}
</script>

<template>
  <div class="mb-4">
    <label class="block">
      <span class="mb-1 block text-sm font-medium">
        {{ locale === 'ar' ? field.labelAr : field.labelEn }}
        <span v-if="field.isRequired" class="text-red-500">*</span>
      </span>
      
      <input 
        v-if="field.fieldType === 'text'" 
        :value="modelValue as string"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        type="text" 
        :required="field.isRequired" 
        :class="inputCls" 
        :style="{ borderColor: 'var(--color-border)' }" 
      />

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

      <textarea 
        v-else-if="field.fieldType === 'textarea'" 
        :value="modelValue as string"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        rows="3" 
        :required="field.isRequired" 
        class="w-full rounded border bg-transparent p-3" 
        :style="{ borderColor: 'var(--color-border)' }"
      ></textarea>

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

      <div v-else-if="field.fieldType === 'file'">
        <input 
          type="file" 
          multiple
          accept="image/*,.pdf"
          @change="onFileChange"
          :required="field.isRequired" 
          class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#2B71AE]/10 file:text-[#2B71AE] hover:file:bg-[#2B71AE]/20 cursor-pointer"
        />
        <div class="mt-1 text-xs text-slate-400">Max size 5MB per file. Images and PDFs only.</div>
      </div>

    </label>
  </div>
</template>
