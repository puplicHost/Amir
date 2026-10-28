import type { H3Event } from 'h3'
import { getRequestHeader, send, setResponseHeader, setResponseStatus } from 'h3'

interface NitroErrorLike {
  statusCode?: number
  statusMessage?: string
}

/**
 * Nitro error handler.
 *
 * Handles only *unmatched route* 404s: returns a generic response with no
 * stack trace, internal paths, or raw error message. Route handlers that
 * throw their own 404 (e.g. "Product not found") fall through to Nuxt/Nitro's
 * default handler so existing API responses are unchanged.
 *
 * Wired up via `nitro.errorHandler` in nuxt.config.ts.
 */
export default async function errorHandler(
  error: NitroErrorLike,
  event: H3Event,
) {
  const isUnmatchedRoute =
    error.statusCode === 404 &&
    typeof error.statusMessage === 'string' &&
    error.statusMessage.startsWith('Page not found:')

  if (!isUnmatchedRoute) return

  const wantsHtml = (getRequestHeader(event, 'accept') || '').includes('text/html')

  setResponseStatus(event, 404, 'Not Found')
  setResponseHeader(event, 'cache-control', 'no-cache')
  setResponseHeader(event, 'x-content-type-options', 'nosniff')

  if (wantsHtml) {
    setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
    await send(event, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #0f172a; }
  main { padding: 2rem; text-align: center; }
  h1 { color: #2B71AE; font-size: 3rem; margin: 0 0 1rem; }
  a { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; border-radius: 0.25rem; background: #2B71AE; color: #fff; text-decoration: none; font-weight: 700; }
  a:hover { background: #285E8E; }
</style>
</head>
<body>
<main>
  <h1>404</h1>
  <p>Page not found. The page you are looking for does not exist or has been moved.</p>
  <a href="/">Go back home</a>
</main>
</body>
</html>`)
    return
  }

  setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
  await send(event, JSON.stringify({ statusCode: 404, message: 'Page not found' }))
}
