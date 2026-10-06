<script setup lang="ts">
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Eye,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize2,
  Move,
  Pencil,
  Trash2,
  Underline,
  UploadCloud,
  X,
} from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  placeholder?: string
  dir?: 'rtl' | 'ltr'
}>(), {
  modelValue: '',
  placeholder: 'اكتب وصفاً تفصيلياً للمنتج... يمكنك إضافة صور توضيحية وتغيير موضعها وحجمها',
  dir: 'rtl',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const { locale } = useI18n()
const editorContainerRef = ref<HTMLDivElement | null>(null)
const editorRef = ref<HTMLDivElement | null>(null)
const isPreview = ref(false)

// Saved Selection Range to preserve cursor position when opening modal
let savedRange: Range | null = null

function saveSelection() {
  if (typeof window === 'undefined') return
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0 && editorRef.value) {
    const range = sel.getRangeAt(0)
    if (editorRef.value.contains(range.commonAncestorContainer)) {
      savedRange = range.cloneRange()
    }
  }
}

function restoreSelection(): boolean {
  if (typeof window === 'undefined' || !savedRange || !editorRef.value) return false
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
    sel.addRange(savedRange)
    return true
  }
  return false
}

// Selected Image & Google Docs-style toolbar state
const selectedImage = ref<HTMLImageElement | null>(null)
const selectedFigure = ref<HTMLElement | null>(null)
const imageBox = ref<{ top: number, left: number, width: number, height: number } | null>(null)
const currentWrapMode = ref<'wrap-right' | 'center' | 'wrap-left' | 'full'>('center')
const currentWidthPercent = ref<number>(60)
const isResizing = ref(false)
const activeCorner = ref<'nw' | 'ne' | 'se' | 'sw' | null>(null)

// Sync modelValue -> innerHTML
watch(() => props.modelValue, (newVal) => {
  if (editorRef.value && editorRef.value.innerHTML !== (newVal || '')) {
    editorRef.value.innerHTML = newVal || ''
    nextTick(updateBoundingBox)
  }
})

onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || ''
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateBoundingBox)
    window.addEventListener('scroll', updateBoundingBox, true)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateBoundingBox)
    window.removeEventListener('scroll', updateBoundingBox, true)
  }
})

function onInput() {
  if (editorRef.value) {
    emit('update:modelValue', editorRef.value.innerHTML)
  }
  saveSelection()
}

function exec(command: string, value: string | undefined = undefined) {
  if (isPreview.value) return
  saveSelection()
  if (typeof document !== 'undefined') {
    document.execCommand(command, false, value)
    if (editorRef.value) {
      editorRef.value.focus()
      onInput()
    }
  }
}

function promptLink() {
  saveSelection()
  const url = window.prompt(locale.value === 'ar' ? 'أدخل رابط URL:' : 'Enter URL:', 'https://')
  if (url) {
    restoreSelection()
    exec('createLink', url)
  }
}

// ── Google Docs Image Positioning & Resizing ──

function getTargetElement(): HTMLElement | null {
  return selectedFigure.value || selectedImage.value
}

function updateBoundingBox() {
  if (!selectedImage.value || !editorContainerRef.value) {
    imageBox.value = null
    return
  }
  const containerRect = editorContainerRef.value.getBoundingClientRect()
  const target = getTargetElement()
  if (!target) {
    imageBox.value = null
    return
  }
  const imgRect = target.getBoundingClientRect()
  imageBox.value = {
    top: imgRect.top - containerRect.top + editorContainerRef.value.scrollTop,
    left: imgRect.left - containerRect.left + editorContainerRef.value.scrollLeft,
    width: imgRect.width,
    height: imgRect.height,
  }
}

function detectCurrentSettings() {
  const target = getTargetElement()
  if (!target) return
  const style = target.style

  // Detect wrap mode
  if (style.float === 'right') {
    currentWrapMode.value = 'wrap-right'
  }
  else if (style.float === 'left') {
    currentWrapMode.value = 'wrap-left'
  }
  else if (style.width === '100%') {
    currentWrapMode.value = 'full'
  }
  else {
    currentWrapMode.value = 'center'
  }

  // Detect width percentage
  if (style.width && style.width.endsWith('%')) {
    currentWidthPercent.value = parseInt(style.width, 10)
  }
  else {
    currentWidthPercent.value = 60
  }
}

function selectImageTarget(target: HTMLElement) {
  if (target.tagName === 'IMG') {
    selectedImage.value = target as HTMLImageElement
    selectedFigure.value = target.closest('figure')
  }
  else if (target.tagName === 'FIGURE') {
    selectedFigure.value = target
    selectedImage.value = target.querySelector('img')
  }
  detectCurrentSettings()
  nextTick(updateBoundingBox)
}

function onEditorClick(e: MouseEvent) {
  if (isPreview.value) return
  saveSelection()
  const target = e.target as HTMLElement
  if (target && (target.tagName === 'IMG' || target.closest('figure'))) {
    selectImageTarget(target)
  }
  else if (!target.closest('.google-docs-toolbar') && !target.closest('.resize-handle')) {
    selectedImage.value = null
    selectedFigure.value = null
    imageBox.value = null
  }
}

// Google Docs Wrapping & Positioning Modes
function setWrapMode(mode: 'wrap-right' | 'center' | 'wrap-left' | 'full') {
  const target = getTargetElement()
  if (!target) return
  currentWrapMode.value = mode

  if (mode === 'wrap-right') {
    target.style.float = 'right'
    target.style.display = 'inline-block'
    target.style.margin = '8px 0 16px 20px'
    target.style.clear = 'none'
    if (!target.style.width || target.style.width === '100%') {
      target.style.width = '48%'
      currentWidthPercent.value = 48
    }
  }
  else if (mode === 'wrap-left') {
    target.style.float = 'left'
    target.style.display = 'inline-block'
    target.style.margin = '8px 20px 16px 0'
    target.style.clear = 'none'
    if (!target.style.width || target.style.width === '100%') {
      target.style.width = '48%'
      currentWidthPercent.value = 48
    }
  }
  else if (mode === 'center') {
    target.style.float = 'none'
    target.style.display = 'table'
    target.style.margin = '16px auto'
    target.style.clear = 'both'
    if (!target.style.width || target.style.width === '100%') {
      target.style.width = '60%'
      currentWidthPercent.value = 60
    }
  }
  else if (mode === 'full') {
    target.style.float = 'none'
    target.style.display = 'block'
    target.style.width = '100%'
    target.style.margin = '16px 0'
    target.style.clear = 'both'
    currentWidthPercent.value = 100
  }

  onInput()
  nextTick(updateBoundingBox)
}

function setWidth(percent: number) {
  const target = getTargetElement()
  if (!target) return
  target.style.width = `${percent}%`
  currentWidthPercent.value = percent
  onInput()
  nextTick(updateBoundingBox)
}

// Move image up / down relative to surrounding text (Google Docs feature)
function moveImageUp() {
  const target = getTargetElement()
  if (!target || !editorRef.value) return
  const prev = target.previousElementSibling
  if (prev) {
    target.parentNode?.insertBefore(target, prev)
    onInput()
    nextTick(updateBoundingBox)
  }
}

function moveImageDown() {
  const target = getTargetElement()
  if (!target || !editorRef.value) return
  const nextEl = target.nextElementSibling
  if (nextEl) {
    target.parentNode?.insertBefore(nextEl, target)
    onInput()
    nextTick(updateBoundingBox)
  }
}

function deleteSelectedImage() {
  const target = getTargetElement()
  if (target && target.parentNode) {
    target.parentNode.removeChild(target)
    selectedImage.value = null
    selectedFigure.value = null
    imageBox.value = null
    onInput()
  }
}

// Google Docs Drag-to-Resize Corner Handles
function startResize(corner: 'nw' | 'ne' | 'se' | 'sw', e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  isResizing.value = true
  activeCorner.value = corner
  const target = getTargetElement()
  if (!target || !editorContainerRef.value) return

  const startX = e.clientX
  const startWidth = target.getBoundingClientRect().width
  const containerWidth = editorContainerRef.value.getBoundingClientRect().width

  function onMouseMove(moveEvent: MouseEvent) {
    if (!isResizing.value) return
    const deltaX = (moveEvent.clientX - startX) * (corner.includes('e') ? 1 : -1)
    const newWidthPx = Math.max(90, Math.min(containerWidth, startWidth + deltaX))
    const newWidthPercent = Math.round((newWidthPx / containerWidth) * 100)
    if (target) {
      target.style.width = `${newWidthPercent}%`
      currentWidthPercent.value = newWidthPercent
      updateBoundingBox()
    }
  }

  function onMouseUp() {
    isResizing.value = false
    activeCorner.value = null
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    onInput()
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// ── Image Upload Modal State ──
const imageModalOpen = ref(false)
const uploadingImage = ref(false)
const imageFile = ref<File | null>(null)
const imagePreviewUrl = ref<string | null>(null)
const imageCaption = ref('')
const initialAlign = ref<'right' | 'left' | 'center' | 'full'>('center')
const uploadError = ref('')

function openImageModal() {
  // CRITICAL: Save user's cursor position in the text before opening the modal!
  saveSelection()
  imageFile.value = null
  imagePreviewUrl.value = null
  imageCaption.value = ''
  initialAlign.value = 'center'
  uploadError.value = ''
  imageModalOpen.value = true
}

function onFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    uploadError.value = locale.value === 'ar' ? 'حجم الصورة يتجاوز الحد الأقصى 2MB' : 'Image exceeds 2MB limit'
    return
  }
  uploadError.value = ''
  imageFile.value = file
  imagePreviewUrl.value = URL.createObjectURL(file)
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    uploadError.value = locale.value === 'ar' ? 'حجم الصورة يتجاوز الحد الأقصى 2MB' : 'Image exceeds 2MB limit'
    return
  }
  uploadError.value = ''
  imageFile.value = file
  imagePreviewUrl.value = URL.createObjectURL(file)
}

async function insertImage() {
  if (!imageFile.value) return
  uploadingImage.value = true
  uploadError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', imageFile.value)
    const res = await $fetch<{ success: boolean, url: string }>('/api/admin/products/upload-inline-image', {
      method: 'POST',
      body: fd,
    })

    let styleStr = 'display: table; margin: 16px auto; max-width: 100%; width: 60%; clear: both;'
    if (initialAlign.value === 'right') styleStr = 'float: right; display: inline-block; margin: 8px 0 16px 20px; width: 48%;'
    if (initialAlign.value === 'left') styleStr = 'float: left; display: inline-block; margin: 8px 20px 16px 0; width: 48%;'
    if (initialAlign.value === 'full') styleStr = 'display: block; margin: 16px 0; width: 100%; clear: both;'

    const captionHtml = imageCaption.value.trim()
      ? `<figcaption style="text-align: center; font-size: 12px; color: #94a3b8; font-style: italic; margin-top: 6px;">${imageCaption.value.trim()}</figcaption>`
      : ''

    const figureId = `inline-img-${Date.now()}`
    const figureHtml = `<figure id="${figureId}" contenteditable="false" draggable="true" class="product-inline-image" style="${styleStr}"><img src="${res.url}" alt="${imageCaption.value || 'Product illustration'}" loading="lazy" style="width: 100%; height: auto; border-radius: 8px; display: block;" />${captionHtml}</figure><p><br></p>`

    if (editorRef.value) {
      editorRef.value.focus()
      // Restore the exact cursor selection where user was typing!
      const restored = restoreSelection()
      if (!restored) {
        // If no cursor was active, insert at the END of the text, NOT at the top!
        const range = document.createRange()
        range.selectNodeContents(editorRef.value)
        range.collapse(false)
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }

      document.execCommand('insertHTML', false, figureHtml)
      onInput()

      // Immediately select the newly inserted image to show Google Docs handles!
      nextTick(() => {
        const newEl = document.getElementById(figureId)
        if (newEl) {
          selectImageTarget(newEl)
        }
      })
    }

    imageModalOpen.value = false
  }
  catch (e: any) {
    uploadError.value = e?.data?.message || (locale.value === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image')
  }
  finally {
    uploadingImage.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#162032] overflow-hidden">
    <!-- Toolbar (RTL) -->
    <div 
      class="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200/90 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-[#0B1520]"
      :dir="dir"
    >
      <div class="flex flex-wrap items-center gap-0.5">
        <!-- B -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'عريض' : 'Bold'"
          @click="exec('bold')"
        >
          <Bold class="h-4 w-4" />
        </button>

        <!-- I -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'مائل' : 'Italic'"
          @click="exec('italic')"
        >
          <Italic class="h-4 w-4" />
        </button>

        <!-- U -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'تسطير' : 'Underline'"
          @click="exec('underline')"
        >
          <Underline class="h-4 w-4" />
        </button>

        <span class="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <!-- H2 -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'عنوان رئيسي H2' : 'Heading 2'"
          @click="exec('formatBlock', '<h2>')"
        >
          <Heading2 class="h-4 w-4" />
        </button>

        <!-- H3 -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'عنوان فرعي H3' : 'Heading 3'"
          @click="exec('formatBlock', '<h3>')"
        >
          <Heading3 class="h-4 w-4" />
        </button>

        <span class="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <!-- Unordered List -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'قائمة نقطية' : 'Bullet List'"
          @click="exec('insertUnorderedList')"
        >
          <List class="h-4 w-4" />
        </button>

        <!-- Ordered List -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'قائمة مرقمة' : 'Numbered List'"
          @click="exec('insertOrderedList')"
        >
          <ListOrdered class="h-4 w-4" />
        </button>

        <span class="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <!-- Image Upload Button -->
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded bg-[#2B71AE]/10 px-2 text-xs font-bold text-[#2B71AE] hover:bg-[#2B71AE]/20 dark:bg-[#F5CC07]/15 dark:text-[#F5CC07] active:scale-95 transition-all"
          :title="locale === 'ar' ? 'إدراج صورة' : 'Insert Image'"
          @click="openImageModal"
        >
          <ImageIcon class="h-3.5 w-3.5" />
          <span>{{ locale === 'ar' ? 'صورة' : 'Image' }}</span>
        </button>

        <!-- Link -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'رابط' : 'Link'"
          @click="promptLink"
        >
          <LinkIcon class="h-3.5 w-3.5" />
        </button>

        <span class="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <!-- Alignment -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'محاذاة يمين' : 'Align Right'"
          @click="exec('justifyRight')"
        >
          <AlignRight class="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'محاذاة وسط' : 'Align Center'"
          @click="exec('justifyCenter')"
        >
          <AlignCenter class="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'محاذاة يسار' : 'Align Left'"
          @click="exec('justifyLeft')"
        >
          <AlignLeft class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- Preview Mode Toggle -->
      <button
        type="button"
        class="inline-flex h-7 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
        @click="isPreview = !isPreview; selectedImage = null; imageBox = null"
      >
        <component :is="isPreview ? Pencil : Eye" class="h-3 w-3" />
        <span>{{ isPreview ? (locale === 'ar' ? 'تحرير' : 'Edit') : (locale === 'ar' ? '👁 معاينة' : '👁 Preview') }}</span>
      </button>
    </div>

    <!-- Relative Container for Editable Content + Google Docs Overlay Toolbar -->
    <div ref="editorContainerRef" class="relative overflow-visible">
      <!-- Editable Content Area (contenteditable) -->
      <div
        v-show="!isPreview"
        ref="editorRef"
        contenteditable="true"
        class="min-h-[320px] w-full p-4 text-sm text-slate-900 focus:outline-none dark:text-slate-100 prose prose-slate max-w-none dark:prose-invert [&_figure]:my-4 [&_figure]:cursor-pointer select-text"
        :dir="dir"
        :data-placeholder="placeholder"
        @input="onInput"
        @click="onEditorClick"
        @keyup="saveSelection"
        @mouseup="saveSelection"
      />

      <!-- Rendered Customer Preview Area -->
      <div
        v-show="isPreview"
        class="min-h-[320px] w-full bg-slate-50/50 p-4 text-sm text-slate-900 dark:bg-[#0B1520]/50 dark:text-slate-100 prose prose-slate max-w-none dark:prose-invert flow-root"
        :dir="dir"
        v-html="modelValue || `<p class='text-slate-400 italic'>${locale === 'ar' ? 'لا يوجد محتوى للمعاينة' : 'No content to preview'}</p>`"
      />

      <!-- ── Google Docs Style Active Image Bounding Box & Resizers ── -->
      <div
        v-if="selectedImage && imageBox && !isPreview"
        class="pointer-events-none absolute z-20 border-2 border-[#2B71AE] transition-all"
        :style="{
          top: `${imageBox.top}px`,
          left: `${imageBox.left}px`,
          width: `${imageBox.width}px`,
          height: `${imageBox.height}px`,
        }"
      >
        <!-- Corner Resize Handles (Interactive) -->
        <div
          class="resize-handle pointer-events-auto absolute -top-1.5 -left-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-xs border-2 border-white bg-[#2B71AE] shadow-xs active:scale-125"
          @mousedown="startResize('nw', $event)"
        />
        <div
          class="resize-handle pointer-events-auto absolute -top-1.5 -right-1.5 h-3.5 w-3.5 cursor-nesw-resize rounded-xs border-2 border-white bg-[#2B71AE] shadow-xs active:scale-125"
          @mousedown="startResize('ne', $event)"
        />
        <div
          class="resize-handle pointer-events-auto absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 cursor-nesw-resize rounded-xs border-2 border-white bg-[#2B71AE] shadow-xs active:scale-125"
          @mousedown="startResize('sw', $event)"
        />
        <div
          class="resize-handle pointer-events-auto absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-xs border-2 border-white bg-[#2B71AE] shadow-xs active:scale-125"
          @mousedown="startResize('se', $event)"
        />

        <!-- Active Width Indicator Tag -->
        <span class="absolute -top-6 start-0 rounded bg-[#2B71AE] px-1.5 py-0.5 text-[10px] font-mono font-bold text-white shadow-xs">
          {{ currentWidthPercent }}%
        </span>
      </div>

      <!-- ── Google Docs Floating Toolbar (Move Up/Down / Wrapping / Width / Delete) ── -->
      <div
        v-if="selectedImage && imageBox && !isPreview"
        class="google-docs-toolbar absolute z-30 flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-[#162032] transition-all"
        :style="{
          top: `${imageBox.top + imageBox.height + 8}px`,
          left: `${Math.max(10, Math.min(imageBox.left + (imageBox.width / 2) - 180, (editorContainerRef?.clientWidth || 700) - 370))}px`,
        }"
        dir="rtl"
      >
        <!-- Move Up [↑] & Down [↓] buttons (like Google Docs reordering) -->
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'تحريك للأعلى (فوق النص)' : 'Move Up'"
          @click="moveImageUp"
        >
          <ArrowUp class="h-4 w-4" />
        </button>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'تحريك للأسفل (تحت النص)' : 'Move Down'"
          @click="moveImageDown"
        >
          <ArrowDown class="h-4 w-4" />
        </button>

        <span class="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <!-- 1. Wrap Text Right -->
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all active:scale-95"
          :class="currentWrapMode === 'wrap-right' ? 'bg-[#2B71AE] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          :title="locale === 'ar' ? 'محاذاة يمين مع التفاف النص' : 'Wrap text right'"
          @click="setWrapMode('wrap-right')"
        >
          <AlignRight class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ locale === 'ar' ? 'يمين' : 'Right' }}</span>
        </button>

        <!-- 2. Break Text / Center -->
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all active:scale-95"
          :class="currentWrapMode === 'center' ? 'bg-[#2B71AE] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          :title="locale === 'ar' ? 'في المنتصف (فصل النص)' : 'Break text / Center'"
          @click="setWrapMode('center')"
        >
          <AlignCenter class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ locale === 'ar' ? 'وسط' : 'Center' }}</span>
        </button>

        <!-- 3. Wrap Text Left -->
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all active:scale-95"
          :class="currentWrapMode === 'wrap-left' ? 'bg-[#2B71AE] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          :title="locale === 'ar' ? 'محاذاة يسار مع التفاف النص' : 'Wrap text left'"
          @click="setWrapMode('wrap-left')"
        >
          <AlignLeft class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ locale === 'ar' ? 'يسار' : 'Left' }}</span>
        </button>

        <!-- 4. Full Width -->
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all active:scale-95"
          :class="currentWrapMode === 'full' ? 'bg-[#2B71AE] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          :title="locale === 'ar' ? 'عرض كامل 100%' : 'Full width 100%'"
          @click="setWrapMode('full')"
        >
          <Maximize2 class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ locale === 'ar' ? 'عرض كامل' : '100%' }}</span>
        </button>

        <span class="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <!-- 5. Quick Width Selectors -->
        <button
          type="button"
          class="flex h-7 items-center justify-center rounded px-1.5 font-mono text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          :class="currentWidthPercent === 25 ? 'bg-blue-50 text-[#2B71AE] dark:bg-blue-950/50 dark:text-blue-300' : ''"
          @click="setWidth(25)"
        >
          25%
        </button>
        <button
          type="button"
          class="flex h-7 items-center justify-center rounded px-1.5 font-mono text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          :class="currentWidthPercent === 50 ? 'bg-blue-50 text-[#2B71AE] dark:bg-blue-950/50 dark:text-blue-300' : ''"
          @click="setWidth(50)"
        >
          50%
        </button>
        <button
          type="button"
          class="flex h-7 items-center justify-center rounded px-1.5 font-mono text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          :class="currentWidthPercent === 75 ? 'bg-blue-50 text-[#2B71AE] dark:bg-blue-950/50 dark:text-blue-300' : ''"
          @click="setWidth(75)"
        >
          75%
        </button>

        <span class="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <!-- 6. Delete Image Button -->
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 active:scale-95 transition-all"
          :title="locale === 'ar' ? 'حذف الصورة' : 'Delete image'"
          @click="deleteSelectedImage"
        >
          <Trash2 class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ locale === 'ar' ? 'حذف' : 'Delete' }}</span>
        </button>
      </div>
    </div>

    <!-- Image Upload Mini Modal Dialog -->
    <div
      v-if="imageModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div 
        class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#162032]"
        :dir="locale === 'ar' ? 'rtl' : 'ltr'"
      >
        <div class="mb-4 flex items-center justify-between border-b pb-3 dark:border-slate-800">
          <h3 class="font-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon class="h-4 w-4 text-[#2B71AE]" />
            <span>{{ locale === 'ar' ? 'إدراج صورة داخل الشرح' : 'Insert Inline Image' }}</span>
          </h3>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            @click="imageModalOpen = false"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Upload Zone -->
        <label
          class="group block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-[#2B71AE] hover:bg-[#2B71AE]/5 dark:border-slate-700"
          @dragover.prevent
          @drop="onDrop"
        >
          <div v-if="imagePreviewUrl" class="mx-auto mb-2 max-h-36 max-w-xs overflow-hidden rounded-lg">
            <img :src="imagePreviewUrl" alt="Preview" class="h-full w-full object-contain" loading="lazy" />
          </div>
          <div v-else class="flex flex-col items-center">
            <UploadCloud class="h-8 w-8 text-slate-400 transition-colors group-hover:text-[#2B71AE]" />
            <span class="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'اضغط لاختيار صورة أو اسحبها هنا' : 'Click to browse image or drag here' }}
            </span>
            <span class="mt-1 text-[11px] text-slate-400">PNG, JPG, or WEBP (Max 2MB)</span>
          </div>
          <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onFileSelect" />
        </label>

        <p v-if="uploadError" class="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
          {{ uploadError }}
        </p>

        <!-- Image Options -->
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'الموضع المبدئي للصورة' : 'Initial Placement' }}
            </span>
            <select
              v-model="initialAlign"
              class="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-[#0B1520] dark:text-white"
            >
              <option value="center">{{ locale === 'ar' ? 'في المنتصف (فصل النص)' : 'Break text / Centered' }}</option>
              <option value="right">{{ locale === 'ar' ? 'محاذاة لليمين مع التفاف النص' : 'Wrap text right' }}</option>
              <option value="left">{{ locale === 'ar' ? 'محاذاة لليسار مع التفاف النص' : 'Wrap text left' }}</option>
              <option value="full">{{ locale === 'ar' ? 'عرض كامل 100%' : 'Full width 100%' }}</option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'تعليق توضيحي أسفل الصورة (اختياري)' : 'Caption (Optional)' }}
            </span>
            <input
              v-model="imageCaption"
              type="text"
              :placeholder="locale === 'ar' ? 'مثال: مخطط التوصيل للمتحكم...' : 'e.g. Pinout diagram...'"
              class="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-[#0B1520] dark:text-white"
            />
          </label>
        </div>

        <div class="mt-6 flex items-center justify-end gap-2 border-t pt-4 dark:border-slate-800">
          <button
            type="button"
            class="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            @click="imageModalOpen = false"
          >
            {{ locale === 'ar' ? 'إلغاء' : 'Cancel' }}
          </button>
          <button
            type="button"
            :disabled="!imageFile || uploadingImage"
            class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#2B71AE] px-5 text-xs font-bold text-white hover:bg-[#285E8E] disabled:opacity-50 transition-all"
            @click="insertImage"
          >
            <span>{{ uploadingImage ? (locale === 'ar' ? 'جاري الرفع…' : 'Uploading…') : (locale === 'ar' ? 'إدراج الصورة' : 'Insert Image') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.google-docs-toolbar {
  animation: gd-pop 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes gd-pop {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
