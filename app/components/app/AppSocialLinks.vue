<script setup lang="ts">
import {
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Music2,
  Twitter,
  Youtube,
} from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  /** Visual style: footer (dark icon buttons) or card (light tiles). */
  variant?: 'footer' | 'card'
}>(), {
  variant: 'footer',
})

// Shared async-data key so Footer / Contact page / Homepage reuse one request.
const { data: contact } = await useAsyncData('site-contact-social', () =>
  $fetch<any>('/api/settings/contact'),
)

interface SocialLink {
  key: string
  label: string
  href: string
  icon: any
  hover: string
}

const links = computed<SocialLink[]>(() => {
  const c = contact.value
  if (!c) return []
  const out: SocialLink[] = []
  const push = (key: string, label: string, href: string | null | undefined, icon: any, hover: string) => {
    if (href && href.trim()) out.push({ key, label, href: href.trim(), icon, hover })
  }
  push('facebook', 'Facebook', c.socialFacebook, Facebook, 'hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white')
  push('instagram', 'Instagram', c.socialInstagram, Instagram, 'hover:border-[#E4405F] hover:bg-[#E4405F] hover:text-white')
  push('tiktok', 'TikTok', c.socialTiktok, Music2, 'hover:border-slate-400 hover:bg-slate-700 hover:text-white')
  push('youtube', 'YouTube', c.socialYoutube, Youtube, 'hover:border-[#FF0000] hover:bg-[#FF0000] hover:text-white')
  push('linkedin', 'LinkedIn', c.socialLinkedin, Linkedin, 'hover:border-[#0A66C2] hover:bg-[#0A66C2] hover:text-white')
  push('x', 'X (Twitter)', c.socialX, Twitter, 'hover:border-slate-400 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950')
  // WhatsApp click-to-chat reuses the existing chat number (not a social field).
  const num = (c.contactWhatsapp || c.contactPhone1 || '').replace(/[^0-9]/g, '')
  if (num) {
    out.push({
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/${num}`,
      icon: MessageCircle,
      hover: 'hover:border-emerald-500 hover:bg-emerald-600 hover:text-white',
    })
  }
  return out
})
</script>

<template>
  <div v-if="links.length" class="flex items-center gap-2.5" :class="variant === 'card' ? 'flex-wrap' : ''">
    <a
      v-for="l in links"
      :key="l.key"
      :href="l.href"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="l.label"
      :title="l.label"
      class="flex items-center justify-center transition-all active:scale-95"
      :class="[
        variant === 'footer'
          ? 'h-9 w-9 rounded-lg border border-slate-800 bg-slate-900/90 text-slate-300'
          : 'h-10 w-10 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        l.hover,
      ]"
    >
      <component :is="l.icon" class="h-4 w-4" aria-hidden="true" />
    </a>
  </div>
</template>
