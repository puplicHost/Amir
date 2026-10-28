/**
 * Strips stack traces from the error that Nuxt serializes into the SSR payload.
 *
 * Nuxt renders `error.vue` for HTML 404s, but also embeds the raw error object
 * (including `stack`) in `__NUXT_DATA__`. Removing it here keeps the rendered
 * page working while preventing internal paths from leaking to the client.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:rendered', ({ ssrContext }) => {
    const error = (ssrContext?.payload?.error ?? nuxtApp.payload.error) as
      | Record<string, unknown>
      | undefined
    if (!error) return

    delete error.stack
    delete error.cause
  })
})
