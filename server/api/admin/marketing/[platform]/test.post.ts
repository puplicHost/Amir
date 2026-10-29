import { requireSuperAdmin } from '../../../../utils/auth'
import { getMarketingProvider } from '../../../../../shared/marketing'
import { getIntegrationView, getServerDeliveryConfig, markIntegrationVerified } from '../../../../utils/marketing/config'
import { adapterError } from '../../../../utils/marketing/adapters'

// Provider-authorized verification only. No arbitrary URLs, no event replay,
// no secret values in responses. Meta is the only provider with a real
// non-conversion verification path; the others return an honest "not available".
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const platform = getRouterParam(event, 'platform') || ''
  const provider = getMarketingProvider(platform)
  if (!provider) throw createError({ statusCode: 404, statusMessage: 'Unknown marketing platform' })
  const view = await getIntegrationView(platform as any)
  if (!view) throw createError({ statusCode: 404, statusMessage: 'Unknown marketing platform' })

  if (!view.config || Object.values(view.config).every(v => !v)) {
    return { verified: false, tested: false, message: 'Configuration is incomplete.' }
  }
  if (view.missingRequired.length) {
    return {
      verified: false,
      tested: false,
      message: `Configuration is incomplete: missing ${view.missingRequired.join(', ')}.`,
    }
  }

  if (platform !== 'meta') {
    // Honest limitation: these providers do not expose a safe, non-conversion
    // connection test with the credentials this app stores. No fake success.
    return {
      verified: false,
      tested: false,
      message: provider.testNoteEn || 'Automated verification is not available for this provider.',
    }
  }

  const cfg = await getServerDeliveryConfig('meta', { requireEnabled: false })
  if (!cfg) {
    return { verified: false, tested: false, message: 'A valid Meta Pixel ID and Conversions API access token are required.' }
  }

  const pixelId = String(cfg.config.pixelId || '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    // 1) Verify the token can read the configured Pixel.
    const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(pixelId)}?fields=id`, {
      headers: { Authorization: `Bearer ${cfg.secret}` },
      signal: controller.signal,
    })
    const text = (await res.text()).slice(0, 4096)
    let json: any = null
    try { json = JSON.parse(text) } catch { json = text }
    const credentialsOk = res.ok && Boolean(json?.id)
    if (!credentialsOk) {
      const error = adapterError('meta', res.status, json)
      await markIntegrationVerified('meta', false, error)
      return { verified: false, tested: true, message: error || 'Meta verification failed.' }
    }

    // 2) Optional real Test Events delivery. This is never a conversion, and a
    // production deployment must explicitly opt in to using the test code.
    const testEventCode = String((cfg.config as any).testEventCode || '').trim()
    if (!testEventCode) {
      await markIntegrationVerified('meta', true, null)
      return {
        verified: true,
        tested: true,
        message: 'Meta Pixel and access token verified. Add a Test Event Code to send a Test Events page view.',
      }
    }
    if (process.env.NODE_ENV === 'production' && process.env.META_CAPI_ALLOW_TEST_EVENTS !== 'true') {
      await markIntegrationVerified('meta', true, null)
      return {
        verified: true,
        tested: true,
        message: 'Meta Pixel and access token verified. Test Events are disabled in production (META_CAPI_ALLOW_TEST_EVENTS).',
      }
    }

    const config = useRuntimeConfig(event).public as Record<string, string>
    let siteUrl = String(config.siteUrl || process.env.NUXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
    if (!siteUrl) {
      try { siteUrl = getRequestURL(event).origin.replace(/\/$/, '') } catch {}
    }
    const clientIp = getRequestIP(event, { xForwardedFor: true }) || ''
    const clientUserAgent = getRequestHeader(event, 'user-agent') || ''
    const testRes = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(pixelId)}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [{
          event_name: 'PageView',
          event_time: Math.floor(Date.now() / 1000),
          event_id: `admin-verify-${Date.now()}`,
          action_source: 'website',
          ...(siteUrl ? { event_source_url: siteUrl } : {}),
          user_data: {
            ...(clientIp ? { client_ip_address: clientIp } : {}),
            ...(clientUserAgent ? { client_user_agent: clientUserAgent } : {}),
          },
        }],
        test_event_code: testEventCode,
      }),
      signal: controller.signal,
    })
    const testText = (await testRes.text()).slice(0, 4096)
    let testJson: any = null
    try { testJson = JSON.parse(testText) } catch { testJson = testText }
    const eventsReceived = Number(testJson?.events_received || 0) > 0
    if (!testRes.ok || !eventsReceived) {
      const error = adapterError('meta', testRes.status, testJson)
      await markIntegrationVerified('meta', false, error)
      return { verified: false, tested: true, message: `Pixel/token verified, but the Test Event failed: ${error}` }
    }

    await markIntegrationVerified('meta', true, null)
    return {
      verified: true,
      tested: true,
      message: 'Meta Pixel and access token verified; a Test Events page view was received.',
    }
  }
  catch (e: any) {
    const message = e?.name === 'AbortError' ? 'Meta verification timed out.' : 'Meta verification failed.'
    await markIntegrationVerified('meta', false, message)
    return { verified: false, tested: true, message }
  }
  finally {
    clearTimeout(timer)
  }
})
