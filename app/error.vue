<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps({
  error: Object as () => NuxtError
})

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <NuxtLayout>
    <div class="mx-auto max-w-2xl px-4 py-32 text-center">
      <h1 class="font-heading text-6xl font-bold text-[#2B71AE] mb-4">{{ error?.statusCode || 500 }}</h1>
      <h2 class="text-3xl font-bold mb-6">
        <template v-if="error?.statusCode === 404">Page Not Found</template>
        <template v-else>An error occurred</template>
      </h2>
      <p class="text-slate-500 mb-8 text-lg">
        <template v-if="error?.statusCode === 404">
          We couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </template>
        <template v-else>
          {{ error?.message || 'Something went wrong on our end. Please try again later.' }}
        </template>
      </p>
      <button @click="handleError" class="h-12 inline-flex items-center justify-center rounded bg-[#2B71AE] px-8 font-bold text-white hover:bg-[#285E8E] transition-colors">
        Go Back Home
      </button>
    </div>
  </NuxtLayout>
</template>
