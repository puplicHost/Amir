<script setup lang="ts">
import { 
  Camera, 
  Cpu, 
  Flame, 
  Gauge, 
  Radio, 
  Sparkles, 
  Tag, 
  Wrench, 
  Zap 
} from 'lucide-vue-next'

const route = useRoute()
const localePath = useLocalePath()
const { locale } = useI18n()

interface StripItem {
  id: string
  labelAr: string
  labelEn: string
  icon: any
  emoji: string
  to: string
  isOffer?: boolean
}

const items: StripItem[] = [
  { id: 'measuring', labelAr: 'أجهزة القياس', labelEn: 'Test & Measure', icon: Zap, emoji: '⚡', to: '/products?search=أجهزة+القياس' },
  { id: 'plc', labelAr: 'PLC والتحكم', labelEn: 'PLC & Control', icon: Cpu, emoji: '🔧', to: '/products?search=PLC' },
  { id: 'cctv', labelAr: 'كاميرات المراقبة', labelEn: 'Security Cameras', icon: Camera, emoji: '📷', to: '/products?search=كاميرات' },
  { id: 'tools', labelAr: 'أدوات كهربائية', labelEn: 'Electrical Tools', icon: Wrench, emoji: '🔌', to: '/products?search=أدوات+كهربائية' },
  { id: 'iot', labelAr: 'مستلزمات IoT', labelEn: 'IoT & Telemetry', icon: Radio, emoji: '📡', to: '/products?search=IoT' },
  { id: 'pneumatic', labelAr: 'الأنظمة الهوائية', labelEn: 'Pneumatics', icon: Gauge, emoji: '💨', to: '/services' },
  { id: 'offers', labelAr: 'عروض وخصومات', labelEn: 'Deals & Offers', icon: Tag, emoji: '🏷️', to: '/products/offers', isOffer: true },
  { id: 'machinery', labelAr: 'صيانة المعدات', labelEn: 'Maintenance', icon: Wrench, emoji: '🔩', to: '/services' },
  { id: 'smart', labelAr: 'أنظمة ذكية', labelEn: 'Smart Systems', icon: Sparkles, emoji: '🤖', to: '/services' },
]

function isActive(item: StripItem) {
  if (item.to === '/products/offers' && route.path.includes('/products/offers')) return true
  if (item.to.includes('search=') && route.query.search === item.to.split('search=')[1]) return true
  return false
}
</script>

<template>
  <div class="relative w-full border-b bg-[#F8FAFC] dark:bg-[#1A1D2E] transition-colors" :style="{ borderColor: 'var(--color-border)' }">
    <!-- Faint gradient fade on edges for horizontal scroll indication -->
    <div class="pointer-events-none absolute inset-y-0 start-0 z-10 w-6 bg-gradient-to-e from-[#F8FAFC] to-transparent dark:from-[#1A1D2E] sm:hidden" />
    <div class="pointer-events-none absolute inset-y-0 end-0 z-10 w-8 bg-gradient-to-s from-[#F8FAFC] to-transparent dark:from-[#1A1D2E] sm:hidden" />

    <div class="mx-auto max-w-7xl px-2 sm:px-4">
      <nav 
        class="flex h-[52px] items-center gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden justify-start md:justify-center"
        aria-label="Secondary Category Navigation"
      >
        <NuxtLink
          v-for="item in items"
          :key="item.id"
          :to="localePath(item.to)"
          class="group relative flex h-full min-w-[80px] sm:min-w-[90px] shrink-0 flex-col items-center justify-center px-2 text-center transition-all"
          :class="[
            isActive(item)
              ? 'text-[#2B71AE] dark:text-[#F5CC07] border-b-2 border-[#F5CC07]'
              : item.isOffer
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-[#2B71AE] hover:border-b-2 hover:border-[#2B71AE] dark:text-slate-300 dark:hover:text-[#F5CC07]'
          ]"
        >
          <!-- Special highlighted yellow pill for "عروض وخصومات" -->
          <div
            v-if="item.isOffer"
            class="flex items-center gap-1 rounded-full bg-[#F5CC07] px-2.5 py-0.5 shadow-xs transition-transform group-hover:scale-105 active:scale-95"
          >
            <span class="text-xs">{{ item.emoji }}</span>
            <span class="text-[11px] sm:text-xs font-bold text-slate-950 whitespace-nowrap">
              {{ locale === 'ar' ? item.labelAr : item.labelEn }}
            </span>
          </div>

          <!-- Standard Item (stacked icon + label) -->
          <template v-else>
            <span class="text-[15px] sm:text-[16px] leading-none mb-0.5 transition-transform group-hover:scale-110">
              {{ item.emoji }}
            </span>
            <span class="text-[11px] sm:text-[12px] font-medium leading-tight whitespace-nowrap text-slate-600 group-hover:text-[#2B71AE] dark:text-slate-300 dark:group-hover:text-[#F5CC07]">
              {{ locale === 'ar' ? item.labelAr : item.labelEn }}
            </span>
          </template>
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>
