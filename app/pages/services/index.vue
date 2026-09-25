<script setup lang="ts">
import { 
  ArrowRight, 
  Building2, 
  Cpu, 
  Flame, 
  Gauge, 
  Radio, 
  RotateCcw, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Wrench, 
  Zap 
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead(() => ({ 
  title: `${locale.value === 'ar' ? 'الخدمات الهندسية' : 'Engineering Services'} | ${t('brand.name')}` 
}))

const { data: services, pending } = await useAsyncData('services-list', () =>
  $fetch<any[]>('/api/services')
)

const searchQuery = ref('')
const selectedCategory = ref('all')

const serviceMetaMap: Record<number, { icon: any, category: string, tagAr: string, tagEn: string }> = {
  1: { icon: Wrench, category: 'maintenance', tagAr: 'صيانة وإصلاح', tagEn: 'Maintenance & Repair' },
  2: { icon: Radio, category: 'iot', tagAr: 'أنظمة ذكية IoT', tagEn: 'Smart IoT & Telemetry' },
  3: { icon: Cpu, category: 'automation', tagAr: 'تحكم وأتمتة PLC', tagEn: 'PLC & Automation' },
  4: { icon: Flame, category: 'safety', tagAr: 'سلامة ومكافحة حريق', tagEn: 'Fire & Safety' },
  5: { icon: Gauge, category: 'pneumatics', tagAr: 'أنظمة هوائية', tagEn: 'Pneumatic Systems' },
  6: { icon: Search, category: 'sourcing', tagAr: 'بحث وتوريد خاص', tagEn: 'Rare Sourcing' },
  7: { icon: Building2, category: 'sourcing', tagAr: 'توريدات شركات', tagEn: 'Bulk Corporate Supply' },
}

const categories = computed(() => [
  { id: 'all', labelAr: 'كل الخدمات', labelEn: 'All Services' },
  { id: 'maintenance', labelAr: 'صيانة وإصلاح', labelEn: 'Maintenance' },
  { id: 'automation', labelAr: 'تحكم وأتمتة PLC', labelEn: 'PLC & Automation' },
  { id: 'iot', labelAr: 'أنظمة ذكية IoT', labelEn: 'Smart IoT' },
  { id: 'safety', labelAr: 'سلامة وحماية', labelEn: 'Fire & Safety' },
  { id: 'pneumatics', labelAr: 'أنظمة هوائية', labelEn: 'Pneumatics' },
  { id: 'sourcing', labelAr: 'توريدات وبحث', labelEn: 'Sourcing' },
])

const enrichedServices = computed(() => {
  return (services.value || []).map((srv, idx) => {
    const meta = serviceMetaMap[srv.sortOrder] || serviceMetaMap[(idx % 7) + 1]
    return {
      ...srv,
      icon: meta.icon,
      category: meta.category,
      tag: locale.value === 'ar' ? meta.tagAr : meta.tagEn,
      name: locale.value === 'ar' ? srv.nameAr : srv.nameEn,
      description: locale.value === 'ar' ? srv.descriptionAr : srv.descriptionEn,
    }
  })
})

const filteredServices = computed(() => {
  return enrichedServices.value.filter(srv => {
    const matchesCat = selectedCategory.value === 'all' || srv.category === selectedCategory.value
    if (!matchesCat) return false

    if (!searchQuery.value.trim()) return true
    const q = searchQuery.value.toLowerCase().trim()
    return (
      srv.name?.toLowerCase().includes(q) ||
      srv.description?.toLowerCase().includes(q) ||
      srv.tag?.toLowerCase().includes(q)
    )
  })
})

function clearFilters() {
  searchQuery.value = ''
  selectedCategory.value = 'all'
}
</script>

<template>
  <div class="space-y-0">
    
    <!-- Hero Header Banner with Technical Styling -->
    <div class="relative overflow-hidden bg-[#0B1520] text-white border-b border-slate-800">
      <!-- Ambient Lighting -->
      <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2B71AE]/20 blur-3xl"></div>
      <div 
        class="pointer-events-none absolute inset-0 opacity-[0.06]" 
        style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
      ></div>

      <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
        <!-- Badge -->
        <div class="inline-flex items-center gap-1.5 rounded-full bg-[#2B71AE]/20 border border-[#2B71AE]/40 px-3.5 py-1 text-xs font-bold text-blue-300 uppercase tracking-wider mb-4">
          <Wrench class="h-3.5 w-3.5 text-[#F5CC07]" />
          <span>{{ locale === 'ar' ? 'خدماتنا الهندسية' : 'Engineering Services' }}</span>
        </div>

        <h1 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
          {{ locale === 'ar' ? 'حلول وخدمات هندسية تناسب احتياجاتك' : 'Industrial Solutions & Engineering Services' }}
        </h1>

        <p class="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          {{ locale === 'ar' 
            ? 'فحص دوري، أتمتة خطوط الإنتاج، برمجة لوحات PLC، وتركيب الأنظمة الذكية بأيدي مهندسين معتمدين.' 
            : 'Certified diagnostics, line automation, PLC cabinet programming, and smart telemetry tailored for modern industrial facilities.' }}
        </p>

        <!-- Live Service Search Bar -->
        <div class="mx-auto max-w-xl">
          <div class="relative flex items-center">
            <Search class="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="locale === 'ar' ? 'ابحث عن الخدمة التي تحتاجها (صيانة، PLC، حساسات، نيوماتيك...)' : 'Search for the service you need (repair, PLC, IoT, pneumatics...)'"
              class="h-12 w-full rounded-2xl border border-slate-700 bg-white/10 ps-11 pe-10 text-xs sm:text-sm text-white placeholder:text-slate-400 backdrop-blur-md focus:border-[#F5CC07] focus:bg-[#0B1520] focus:outline-none focus:ring-2 focus:ring-[#F5CC07]/20 transition-all shadow-lg"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute end-3 text-slate-400 hover:text-white p-1"
              @click="searchQuery = ''"
            >
              <RotateCcw class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Container -->
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      
      <!-- Category Filter Pills -->
      <div class="mb-10 flex flex-wrap items-center justify-center gap-2">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95"
          :class="selectedCategory === cat.id
            ? 'bg-[#2B71AE] text-white shadow-md dark:bg-[#F5CC07] dark:text-slate-950'
            : 'border border-slate-200 bg-white text-slate-700 hover:border-[#2B71AE] hover:text-[#2B71AE] dark:border-slate-800 dark:bg-[#162032] dark:text-slate-300 dark:hover:border-[#F5CC07] dark:hover:text-[#F5CC07]'"
          @click="selectedCategory = cat.id"
        >
          {{ locale === 'ar' ? cat.labelAr : cat.labelEn }}
        </button>
      </div>

      <!-- Service Cards Grid (Desktop: 3 cards, Tablet: 2 cards, Mobile: 1 card) -->
      <div 
        v-if="filteredServices.length"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
      >
        <NuxtLink
          v-for="srv in filteredServices"
          :key="srv.id"
          :to="localePath(`/services/${srv.id}`)"
          class="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:-translate-y-1 hover:border-[#2B71AE] hover:shadow-xl dark:border-slate-800 dark:bg-[#162032] dark:hover:border-[#2B71AE] transition-all duration-300 cursor-pointer"
        >
          <div>
            <!-- Card Header: Icon Badge & Category Tag -->
            <div class="flex items-center justify-between gap-3 mb-4">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/25 dark:text-blue-300 group-hover:scale-105 group-hover:bg-[#2B71AE] group-hover:text-white transition-all duration-300 shadow-xs">
                <component :is="srv.icon" class="h-6 w-6" />
              </div>
              <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                {{ srv.tag }}
              </span>
            </div>

            <!-- Service Title -->
            <h2 class="font-heading text-lg sm:text-xl font-bold text-slate-900 group-hover:text-[#2B71AE] dark:text-white dark:group-hover:text-[#F5CC07] transition-colors leading-snug line-clamp-2 mb-2.5">
              {{ srv.name }}
            </h2>

            <!-- Service Description -->
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-6">
              {{ srv.description }}
            </p>
          </div>

          <!-- Bottom Action CTA -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#2B71AE] dark:text-[#F5CC07]">
            <span class="group-hover:underline">{{ locale === 'ar' ? 'طلب الخدمة' : 'Request Service' }}</span>
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-[#2B71AE]/10 dark:bg-[#F5CC07]/15 group-hover:bg-[#2B71AE] group-hover:text-white dark:group-hover:bg-[#F5CC07] dark:group-hover:text-slate-950 transition-colors">
              <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty Search / Filter State -->
      <div 
        v-else
        class="rounded-2xl border border-slate-200/90 bg-white p-12 sm:p-16 text-center shadow-xs dark:border-slate-800 dark:bg-[#162032]"
      >
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]">
          <Search class="h-8 w-8" />
        </div>
        <h2 class="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {{ locale === 'ar' ? 'لم نجد خدمة مطابقة' : 'No Matching Services Found' }}
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          {{ locale === 'ar' ? 'جرّب البحث باسم مختلف أو تصفح جميع الخدمات الهندسية المتاحة.' : 'Try searching with different terms or explore all our available engineering services.' }}
        </p>
        <button
          type="button"
          class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-7 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#285E8E] active:scale-95 transition-all"
          @click="clearFilters"
        >
          <RotateCcw class="h-4 w-4" />
          <span>{{ locale === 'ar' ? 'عرض كل الخدمات' : 'View All Services' }}</span>
        </button>
      </div>

    </div>

  </div>
</template>
