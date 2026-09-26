<script setup lang="ts">
const props = defineProps<{ pixelId: string }>()

// Official Meta Pixel base code (developers.facebook.com/docs/meta-pixel/get-started):
// init + PageView on every public page. Rendered only when the admin has
// explicitly enabled the integration with a saved Pixel ID.
useHead(() => ({
  script: [
    {
      innerHTML: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${props.pixelId}');fbq('track','PageView');`,
    },
  ],
  noscript: [
    {
      innerHTML: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${props.pixelId}&ev=PageView&noscript=1" />`,
    },
  ],
}))
</script>

<template>
  <div style="display: none" aria-hidden="true" />
</template>
