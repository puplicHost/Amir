<script setup lang="ts">
const props = defineProps<{ pixelId: string }>()

const { hasMarketingConsent, removeMetaCookies } = useCookieConsent()
const route = useRoute()

const isAdminRoute = computed(() =>
  route.path.replace(/^\/(en|ar)(?=\/|$)/, '').startsWith('/admin'),
)

function injectPixel() {
  if (!import.meta.client || isAdminRoute.value || !hasMarketingConsent.value || !props.pixelId) return
  const w = window as any
  if (w.fbq) return // already loaded

  /* eslint-disable */
  const f = window as any
  const b = document
  const e = 'script'
  const v = 'https://connect.facebook.net/en_US/fbevents.js'
  f.fbq = function () {
    f.fbq.callMethod ? f.fbq.callMethod.apply(f.fbq, arguments) : f.fbq.queue.push(arguments)
  }
  if (!f._fbq) f._fbq = f.fbq
  f.fbq.push = f.fbq
  f.fbq.loaded = true
  f.fbq.version = '2.0'
  f.fbq.queue = []
  const t = b.createElement(e) as HTMLScriptElement
  t.async = true
  t.src = v
  const s = b.getElementsByTagName(e)[0]
  s?.parentNode?.insertBefore(t, s)
  /* eslint-enable */

  f.fbq('init', props.pixelId)
  f.fbq('track', 'PageView')
}

function tearDownPixel() {
  if (!import.meta.client) return
  const w = window as any
  if (props.pixelId) {
    w[`fbq-disable-${props.pixelId}`] = true
  }
  delete w.fbq
  delete w._fbq
  removeMetaCookies()
}

onMounted(() => {
  if (hasMarketingConsent.value && !isAdminRoute.value) {
    injectPixel()
  }

  window.addEventListener('amir:marketing-consent-granted', () => {
    if (!isAdminRoute.value) injectPixel()
  })
})

watch(hasMarketingConsent, (consent) => {
  if (consent && !isAdminRoute.value) {
    injectPixel()
  }
  else if (!consent) {
    tearDownPixel()
  }
})
</script>

<template>
  <div style="display: none" aria-hidden="true" />
</template>
