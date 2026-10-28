<script setup lang="ts">
import { 
  ArrowDown, 
  ArrowUp, 
  Boxes, 
  ExternalLink, 
  GripVertical, 
  Megaphone, 
  Pencil, 
  Plus, 
  Sparkles, 
  Trash2, 
  Wrench, 
  X 
} from 'lucide-vue-next'

const { locale } = useI18n()
const toast = useAdminToast()
const { confirm: confirmDialog } = useAdminConfirm()

interface Item {
  id: string
  textAr: string
  textEn: string | null
  type: string
  linkType: string
  linkValue: string | null
  sortOrder: number
  isActive: boolean
}

interface ProductOption {
  id: string
  slug: string
  nameAr: string
  nameEn: string
}

interface ServiceOption {
  id: string
  name: string
}

const { data, refresh } = await useAsyncData('admin-announcements-feed', () =>
  $fetch<{
    items: Item[]
    active: boolean
    bgColor: string
    products: ProductOption[]
    services: ServiceOption[]
  }>('/api/admin/announcements'),
)

const isBarActive = ref(true)
const barBgColor = ref('#2B71AE')
const savingSettings = ref(false)

watch(() => data.value, (val) => {
  if (val) {
    isBarActive.value = val.active
    barBgColor.value = val.bgColor || '#2B71AE'
  }
}, { immediate: true })

async function saveBarSettings() {
  savingSettings.value = true
  try {
    await $fetch('/api/admin/announcements/settings', {
      method: 'PUT',
      body: {
        announcementActive: isBarActive.value,
        announcementBgColor: barBgColor.value,
      },
    })
    await refresh()
    toast.success(
      locale.value === 'ar' ? 'تم حفظ إعدادات الشريط' : 'Announcement Settings Saved',
      locale.value === 'ar' ? 'تم تحديث مظهر وتفعيل شريط الإشعارات.' : 'Bar appearance updated.',
    )
  }
  catch {
    toast.error('Failed to save announcement settings')
  }
  finally {
    savingSettings.value = false
  }
}

// Modal State
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const itemForm = reactive({
  textAr: '',
  textEn: '',
  type: 'general' as 'general' | 'product' | 'service',
  linkType: 'none' as 'none' | 'product' | 'service' | 'url',
  linkValue: '',
  isActive: true,
})
const savingItem = ref(false)
const itemError = ref('')

function openCreateModal() {
  editingId.value = null
  itemForm.textAr = ''
  itemForm.textEn = ''
  itemForm.type = 'general'
  itemForm.linkType = 'none'
  itemForm.linkValue = ''
  itemForm.isActive = true
  itemError.value = ''
  modalOpen.value = true
}

function openEditModal(item: Item) {
  editingId.value = item.id
  itemForm.textAr = item.textAr
  itemForm.textEn = item.textEn || ''
  itemForm.type = (item.type as any) || 'general'
  itemForm.linkType = (item.linkType as any) || 'none'
  itemForm.linkValue = item.linkValue || ''
  itemForm.isActive = item.isActive
  itemError.value = ''
  modalOpen.value = true
}

async function saveItem() {
  if (!itemForm.textAr.trim()) {
    itemError.value = locale.value === 'ar' ? 'يرجى كتابة نص الإشعار بالعربية' : 'Arabic text is required'
    return
  }
  savingItem.value = true
  itemError.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/admin/announcements/${editingId.value}`, {
        method: 'PUT',
        body: itemForm,
      })
    }
    else {
      await $fetch('/api/admin/announcements', {
        method: 'POST',
        body: itemForm,
      })
    }
    await refresh()
    modalOpen.value = false
    toast.success(
      locale.value === 'ar' ? 'تم حفظ الإشعار' : 'Announcement Saved',
      locale.value === 'ar' ? 'تم تحديث قائمة إشعارات الشريط بنجاح.' : 'Announcement list updated.',
    )
  }
  catch (e: any) {
    itemError.value = e?.data?.message || 'Failed to save announcement'
  }
  finally {
    savingItem.value = false
  }
}

async function deleteItem(item: Item) {
  const ok = await confirmDialog({
    title: locale.value === 'ar' ? 'حذف الإشعار؟' : 'Delete announcement?',
    message: locale.value === 'ar' ? 'هل تريد بالتأكيد إزالة هذا الإشعار من شريط التنبيهات؟' : 'Are you sure you want to remove this announcement?',
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/announcements/${item.id}`, { method: 'DELETE' })
    await refresh()
    toast.success(locale.value === 'ar' ? 'تم حذف الإشعار' : 'Announcement Deleted')
  }
  catch {
    toast.error('Failed to delete announcement')
  }
}

async function moveOrder(index: number, direction: 'up' | 'down') {
  const items = [...(data.value?.items || [])]
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= items.length) return
  const temp = items[index]
  items[index] = items[targetIndex]
  items[targetIndex] = temp

  for (let i = 0; i < items.length; i++) {
    await $fetch(`/api/admin/announcements/${items[i].id}`, {
      method: 'PUT',
      body: { sortOrder: i + 1 },
    })
  }
  await refresh()
}

const inputCls = 'h-10 w-full rounded-md border bg-white px-3 text-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-bg dark:border-neutral-700 dark:text-white'
</script>

<template>
  <div class="space-y-6" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    
    <!-- Top Configuration Card (Toggle + Background Color Picker) -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-neutral-900 dark:border-neutral-800">
      <div class="flex items-center justify-between border-b pb-3.5 mb-4 dark:border-neutral-800">
        <div>
          <h2 class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Megaphone class="h-4 w-4 text-primary dark:text-primary" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'شريط الإشعارات العلوي (Announcement Bar)' : 'Top Announcement Bar' }}</span>
          </h2>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {{ locale === 'ar' ? 'شريط ترويجي يظهر أعلى كل صفحات الموقع للتنويه عن العروض، الخدمات، أو التوصيل.' : 'Top-of-page promotional bar for deals, service notices, or shipping announcements.' }}
          </p>
        </div>

        <button
          type="button"
          :disabled="savingSettings"
          class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-on-primary shadow-xs hover:bg-primary/90 disabled:opacity-50 transition"
          @click="saveBarSettings"
        >
          <span>{{ savingSettings ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ إعدادات الشريط' : 'Save Bar Settings') }}</span>
        </button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 items-center">
        <!-- Toggle Switch -->
        <label class="flex cursor-pointer items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-bg">
          <div>
            <span class="block text-xs font-bold text-neutral-900 dark:text-white">
              {{ locale === 'ar' ? 'تفعيل شريط الإشعارات' : 'Enable Announcement Bar' }}
            </span>
            <span class="text-[11px] text-neutral-500 dark:text-neutral-400">
              {{ isBarActive ? (locale === 'ar' ? 'الشريط ظاهر في الموقع' : 'Bar is currently visible') : (locale === 'ar' ? 'الشريط مخفي مؤقتاً' : 'Bar is hidden') }}
            </span>
          </div>
          <input
            v-model="isBarActive"
            type="checkbox"
            class="h-5 w-5 rounded accent-primary"
          />
        </label>

        <!-- Background Color Picker -->
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-700 dark:bg-bg">
          <span class="mb-1.5 block text-xs font-bold text-neutral-900 dark:text-white">
            {{ locale === 'ar' ? 'لون خلفية الشريط' : 'Bar Background Color' }}
          </span>
          <div class="flex items-center gap-2">
            <label class="relative h-11 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-neutral-300 shadow-xs" :style="{ backgroundColor: barBgColor }">
              <input v-model="barBgColor" type="color" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
            <input v-model="barBgColor" type="text" placeholder="#2B71AE" dir="ltr" :class="inputCls" />
          </div>
        </div>
      </div>
    </div>

    <!-- Announcement Items List Card (Change 12: Multi-Item Draggable List) -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-neutral-900 dark:border-neutral-800">
      <div class="flex items-center justify-between border-b pb-3 mb-4 dark:border-neutral-800">
        <div>
          <h3 class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>{{ locale === 'ar' ? 'قائمة الإشعارات المتتابعة' : 'Announcement Items Carousel' }}</span>
            <span class="font-mono text-xs font-semibold text-neutral-400">
              ({{ data?.items?.length || 0 }} / 10)
            </span>
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {{ locale === 'ar' ? 'تتنقل الإشعارات تلقائياً كل 5 ثوانٍ مع أزرار التنقل والتحكم.' : 'Auto-scrolls every 5 seconds with slide animation.' }}
          </p>
        </div>

        <button
          type="button"
          :disabled="(data?.items?.length || 0) >= 10"
          class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-bold text-on-primary shadow-xs hover:bg-primary/90 disabled:opacity-50 transition"
          @click="openCreateModal"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة إشعار جديد' : 'Add Item' }}</span>
        </button>
      </div>

      <!-- Items List Table -->
      <div v-if="data?.items?.length" class="divide-y divide-neutral-100 dark:divide-neutral-800 border rounded-lg overflow-hidden dark:border-neutral-700">
        <div
          v-for="(item, idx) in data.items"
          :key="item.id"
          class="flex items-center justify-between gap-3 p-3.5 bg-white hover:bg-neutral-50/70 dark:bg-neutral-900 dark:hover:bg-neutral-800/40 transition-colors"
        >
          <!-- Left: Order Handles + Badge + Texts -->
          <div class="flex items-center gap-3 min-w-0">
            <!-- Order Arrows -->
            <div class="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                :disabled="idx === 0"
                :aria-label="locale === 'ar' ? 'تحريك لأعلى' : 'Move up'"
                class="flex h-11 w-11 items-center justify-center rounded text-neutral-400 hover:bg-neutral-200 disabled:opacity-20 dark:hover:bg-neutral-700"
                @click="moveOrder(idx, 'up')"
              >
                <ArrowUp class="h-3 w-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                :disabled="idx === data.items.length - 1"
                :aria-label="locale === 'ar' ? 'تحريك لأسفل' : 'Move down'"
                class="flex h-11 w-11 items-center justify-center rounded text-neutral-400 hover:bg-neutral-200 disabled:opacity-20 dark:hover:bg-neutral-700"
                @click="moveOrder(idx, 'down')"
              >
                <ArrowDown class="h-3 w-3" aria-hidden="true" />
              </button>
            </div>

            <!-- Type Badge -->
            <span
              class="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
              :class="[
                item.type === 'product'
                  ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-300'
                  : item.type === 'service'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
              ]"
            >
              {{ item.type === 'product' ? (locale === 'ar' ? 'منتج' : 'Product') : item.type === 'service' ? (locale === 'ar' ? 'خدمة' : 'Service') : (locale === 'ar' ? 'عام' : 'General') }}
            </span>

            <div class="min-w-0">
              <p class="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white truncate">
                {{ item.textAr }}
              </p>
              <p v-if="item.textEn" class="text-[11px] text-neutral-400 truncate font-mono">
                {{ item.textEn }}
              </p>
            </div>
          </div>

          <!-- Right: Link indicator & Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <span v-if="item.linkType !== 'none' && item.linkValue" class="text-[11px] text-neutral-400 font-mono hidden sm:inline truncate max-w-[140px]">
              🔗 {{ item.linkValue }}
            </span>

            <button
              type="button"
              :aria-label="locale === 'ar' ? 'تعديل الإشعار' : 'Edit announcement'"
              class="flex h-11 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              @click="openEditModal(item)"
            >
              <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              :aria-label="locale === 'ar' ? 'حذف الإشعار' : 'Delete announcement'"
              class="flex h-11 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              @click="deleteItem(item)"
            >
              <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div v-else class="rounded-lg border border-dashed p-8 text-center text-xs text-neutral-400 dark:border-neutral-700">
        {{ locale === 'ar' ? 'لا توجد إشعارات مسجلة. اضغط على "إضافة إشعار جديد" لإضافة إشعار للشريط العلوي.' : 'No announcements configured yet.' }}
      </div>
    </div>

    <!-- Modal to Add / Edit Announcement Item -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div 
        class="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        :dir="locale === 'ar' ? 'rtl' : 'ltr'"
      >
        <div class="mb-4 flex items-center justify-between border-b pb-3 dark:border-neutral-800">
          <h3 class="font-heading text-base font-bold text-neutral-900 dark:text-white">
            {{ editingId ? (locale === 'ar' ? 'تعديل الإشعار' : 'Edit Announcement') : (locale === 'ar' ? 'إضافة إشعار جديد للشريط العلوي' : 'New Announcement Item') }}
          </h3>
          <button
            type="button"
            :aria-label="t('common.close')"
            class="flex h-11 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            @click="modalOpen = false"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="saveItem">
          <!-- Text AR -->
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {{ locale === 'ar' ? 'نص الإشعار (بالعربية) *' : 'Announcement Text (Arabic) *' }}
            </span>
            <input
              v-model="itemForm.textAr"
              type="text"
              required
              placeholder="مثال: 🏷️ خصم 20% على أجهزة قياس فلوك المعتمدة"
              dir="rtl"
              :class="inputCls"
            />
          </label>

          <!-- Text EN -->
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {{ locale === 'ar' ? 'نص الإشعار (بالإنجليزية)' : 'Announcement Text (English)' }}
            </span>
            <input
              v-model="itemForm.textEn"
              type="text"
              placeholder="e.g. 🏷️ Special 20% discount on genuine Fluke multimeters"
              dir="ltr"
              :class="inputCls"
            />
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <!-- Type -->
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {{ locale === 'ar' ? 'نوع الإشعار' : 'Announcement Type' }}
              </span>
              <select v-model="itemForm.type" :class="inputCls">
                <option value="general">{{ locale === 'ar' ? 'عام / توصيل / خبر' : 'General / Info' }}</option>
                <option value="product">{{ locale === 'ar' ? 'عرض على منتج' : 'Product Offer' }}</option>
                <option value="service">{{ locale === 'ar' ? 'تنويه عن خدمة' : 'Service Announcement' }}</option>
              </select>
            </label>

            <!-- Link Type -->
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {{ locale === 'ar' ? 'ربط بـ' : 'Link Target' }}
              </span>
              <select v-model="itemForm.linkType" :class="inputCls">
                <option value="none">{{ locale === 'ar' ? 'بدون رابط' : 'No link' }}</option>
                <option value="product">{{ locale === 'ar' ? 'منتج محدد' : 'Specific Product' }}</option>
                <option value="service">{{ locale === 'ar' ? 'خدمة محددة' : 'Specific Service' }}</option>
                <option value="url">{{ locale === 'ar' ? 'رابط خارجي / صفحة' : 'Custom URL' }}</option>
              </select>
            </label>
          </div>

          <!-- Dynamic Link Target Picker -->
          <div v-if="itemForm.linkType === 'product'" class="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-bg">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {{ locale === 'ar' ? 'اختر المنتج المرتبط' : 'Select Product' }}
              </span>
              <select v-model="itemForm.linkValue" required :class="inputCls">
                <option value="">{{ locale === 'ar' ? 'اختر المنتج…' : 'Select product…' }}</option>
                <option v-for="p in data?.products || []" :key="p.id" :value="p.slug">
                  {{ p.nameAr }} ({{ p.nameEn }})
                </option>
              </select>
            </label>
          </div>

          <div v-else-if="itemForm.linkType === 'service'" class="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-bg">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {{ locale === 'ar' ? 'اختر الخدمة المرتبطة' : 'Select Service' }}
              </span>
              <select v-model="itemForm.linkValue" required :class="inputCls">
                <option value="">{{ locale === 'ar' ? 'اختر الخدمة…' : 'Select service…' }}</option>
                <option v-for="s in data?.services || []" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </label>
          </div>

          <div v-else-if="itemForm.linkType === 'url'" class="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-bg">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {{ locale === 'ar' ? 'الرابط المطلوب' : 'Target URL' }}
              </span>
              <input
                v-model="itemForm.linkValue"
                type="text"
                required
                placeholder="https://... أو /products"
                dir="ltr"
                :class="inputCls"
              />
            </label>
          </div>

          <p v-if="itemError" class="text-xs font-medium text-rose-600 dark:text-rose-400">
            {{ itemError }}
          </p>

          <div class="mt-6 flex items-center justify-end gap-2 border-t pt-4 dark:border-neutral-800">
            <button
              type="button"
              class="h-11 rounded-lg border border-neutral-200 px-4 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300"
              @click="modalOpen = false"
            >
              {{ locale === 'ar' ? 'إلغاء' : 'Cancel' }}
            </button>
            <button
              type="submit"
              :disabled="savingItem"
              class="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-xs font-bold text-on-primary hover:bg-primary/90 disabled:opacity-50 transition"
            >
              <span>{{ savingItem ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ الإشعار' : 'Save Item') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
