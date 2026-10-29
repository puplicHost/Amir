import { decryptData, encryptData } from '../encryption'
import { getSiteSettings, upsertSiteSettings } from '../site-settings'
import {
  MARKETING_EVENTS,
  MARKETING_EVENT_DEFINITIONS,
  MARKETING_PROVIDERS,
  defaultEventConfig,
  getMarketingProvider,
  isValidMarketingFieldValue,
  providerSupportedEvents,
  type MarketingEventName,
  type MarketingPlatform,
  type MarketingProviderDefinition,
} from '../../../shared/marketing'

type JsonRecord = Record<string, unknown>

const META: MarketingPlatform = 'meta'

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function bool(value: unknown): boolean {
  return value === true
}

function secretFlags(provider: MarketingProviderDefinition, secrets: JsonRecord): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const f of provider.fields) {
    if (f.secret) out[f.key] = Boolean(text(secrets[f.key]))
  }
  return out
}

export interface IntegrationView {
  id: MarketingPlatform
  name: string
  descriptionEn: string
  descriptionDe: string
  docsUrl: string
  enabled: boolean
  status: string
  config: Record<string, string>
  events: Record<string, boolean>
  hasSecrets: Record<string, boolean>
  missingRequired: string[]
  delivery: { browser: boolean, server: boolean }
  testConnection: boolean
  testNoteEn?: string
  testNoteDe?: string
  lastVerifiedAt: string | null
  lastError: string | null
  lastErrorAt: string | null
}

interface RawIntegration {
  enabled: boolean
  config: JsonRecord
  secrets: JsonRecord
  status: string
  lastVerifiedAt: Date | null
  lastError: string | null
  lastErrorAt: Date | null
}

async function rawIntegration(platform: MarketingPlatform): Promise<RawIntegration> {
  const row = await prisma.marketingIntegration.findUnique({ where: { platform } })
  if (platform === META) {
    // Meta keeps the original SiteSettings columns as source of truth; the row
    // only stores event selection and verification/diagnostic state.
    const s = await getSiteSettings()
    return {
      enabled: bool(s?.metaEnabled),
      config: {
        pixelId: text(s?.metaPixelId),
        testEventCode: text(s?.metaTestEventCode),
        ...(record(row?.config).events ? { events: record(row?.config).events } : {}),
      },
      secrets: s?.metaCapiToken ? { accessToken: s.metaCapiToken } : {},
      status: row?.status || 'NOT_CONFIGURED',
      lastVerifiedAt: row?.lastVerifiedAt ?? null,
      lastError: row?.lastError ?? null,
      lastErrorAt: row?.lastErrorAt ?? null,
    }
  }
  return {
    enabled: bool(row?.enabled),
    config: record(row?.config),
    secrets: record(row?.secrets),
    status: row?.status || 'NOT_CONFIGURED',
    lastVerifiedAt: row?.lastVerifiedAt ?? null,
    lastError: row?.lastError ?? null,
    lastErrorAt: row?.lastErrorAt ?? null,
  }
}

function eventConfig(provider: MarketingProviderDefinition, config: JsonRecord): Record<string, boolean> {
  const defaults = defaultEventConfig(provider)
  const stored = record(config.events)
  const out: Record<string, boolean> = {}
  for (const e of MARKETING_EVENTS) {
    out[e] = typeof stored[e] === 'boolean' ? stored[e] === true : defaults[e] === true
  }
  return out
}

function missingRequired(provider: MarketingProviderDefinition, config: JsonRecord, secrets: JsonRecord): string[] {
  const missing: string[] = []
  for (const f of provider.fields) {
    if (!f.required) continue
    if (f.secret) {
      if (!text(secrets[f.key])) missing.push(f.key)
    }
    else {
      const value = text(config[f.key])
      if (!isValidMarketingFieldValue(provider.id, f.key, value)) missing.push(f.key)
    }
  }
  return missing
}

function computedStatus(
  provider: MarketingProviderDefinition,
  enabled: boolean,
  config: JsonRecord,
  secrets: JsonRecord,
  lastVerifiedAt: Date | null,
  lastErrorAt: Date | null,
): string {
  const configured = provider.fields.some(f => f.secret ? text(secrets[f.key]) : text(config[f.key]))
  if (!configured) return 'NOT_CONFIGURED'
  const missing = missingRequired(provider, config, secrets)
  if (missing.length) return enabled ? 'INCOMPLETE' : 'NOT_CONFIGURED'
  if (!enabled) return 'DISABLED'
  if (lastErrorAt && (!lastVerifiedAt || lastErrorAt > lastVerifiedAt)) return 'ERROR'
  if (lastVerifiedAt) return 'VERIFIED'
  return 'UNVERIFIED'
}

function toView(provider: MarketingProviderDefinition, raw: RawIntegration): IntegrationView {
  const configOut: Record<string, string> = {}
  for (const f of provider.fields) {
    if (!f.secret) configOut[f.key] = text(raw.config[f.key])
  }
  const status = computedStatus(provider, raw.enabled, raw.config, raw.secrets, raw.lastVerifiedAt, raw.lastErrorAt)
  return {
    id: provider.id,
    name: provider.name,
    descriptionEn: provider.descriptionEn,
    descriptionDe: provider.descriptionDe,
    docsUrl: provider.docsUrl,
    enabled: raw.enabled,
    status,
    config: configOut,
    events: eventConfig(provider, raw.config),
    hasSecrets: secretFlags(provider, raw.secrets),
    missingRequired: missingRequired(provider, raw.config, raw.secrets),
    delivery: provider.delivery,
    testConnection: provider.testConnection,
    testNoteEn: provider.testNoteEn,
    testNoteDe: provider.testNoteDe,
    lastVerifiedAt: raw.lastVerifiedAt ? raw.lastVerifiedAt.toISOString() : null,
    lastError: raw.lastError || null,
    lastErrorAt: raw.lastErrorAt ? raw.lastErrorAt.toISOString() : null,
  }
}

export async function getIntegrationView(platform: MarketingPlatform): Promise<IntegrationView | null> {
  const provider = getMarketingProvider(platform)
  if (!provider) return null
  return toView(provider, await rawIntegration(platform))
}

export async function listIntegrationViews(): Promise<IntegrationView[]> {
  const out: IntegrationView[] = []
  for (const provider of MARKETING_PROVIDERS) out.push(toView(provider, await rawIntegration(provider.id)))
  return out
}

export interface SaveIntegrationInput {
  enabled?: boolean
  config?: Record<string, unknown>
  secrets?: Record<string, unknown>
  events?: Record<string, unknown>
  clearSecrets?: string[]
}

function validateField(platform: MarketingPlatform, key: string, value: string): void {
  if (value.length > (key.toLowerCase().includes('token') || key.toLowerCase().includes('secret') ? 4000 : 300)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }
  if (value && !isValidMarketingFieldValue(platform, key, value)) {
    if (platform === 'meta' && key === 'pixelId') {
      throw createError({ statusCode: 400, statusMessage: 'Meta Pixel ID must be numeric' })
    }
    if (platform === 'google' && key === 'conversionId') {
      throw createError({ statusCode: 400, statusMessage: 'Google Ads conversion ID must look like AW-123456789' })
    }
    if (platform === 'pinterest' && key === 'adAccountId') {
      throw createError({ statusCode: 400, statusMessage: 'Pinterest ad account ID must be numeric' })
    }
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }
}

export async function saveIntegration(platform: MarketingPlatform, input: SaveIntegrationInput): Promise<IntegrationView> {
  const provider = getMarketingProvider(platform)
  if (!provider) throw createError({ statusCode: 404, statusMessage: 'Unknown marketing platform' })

  const current = await rawIntegration(platform)
  const nextConfig: JsonRecord = { ...current.config }
  const nextSecrets: JsonRecord = { ...current.secrets }
  const enabled = input.enabled === undefined ? current.enabled : input.enabled === true

  for (const f of provider.fields) {
    if (f.secret) continue
    const raw = input.config?.[f.key]
    if (raw === undefined) continue
    const value = text(raw)
    validateField(platform, f.key, value)
    if (value) nextConfig[f.key] = value
    else delete nextConfig[f.key]
  }

  const clear = new Set((input.clearSecrets || []).filter((x): x is string => typeof x === 'string'))
  for (const f of provider.fields) {
    if (!f.secret) continue
    if (clear.has(f.key)) {
      delete nextSecrets[f.key]
      continue
    }
    const raw = input.secrets?.[f.key]
    if (typeof raw !== 'string' || !raw.trim()) continue // blank keeps the existing secret
    const value = raw.trim()
    if (value.length > 4000) throw createError({ statusCode: 400, statusMessage: `Invalid ${f.key}` })
    nextSecrets[f.key] = encryptData(value)
  }

  const supported = new Set(providerSupportedEvents(provider))
  const events = eventConfig(provider, nextConfig)
  for (const [key, value] of Object.entries(input.events || {})) {
    if (!supported.has(key as MarketingEventName)) continue
    events[key] = value === true
  }
  nextConfig.events = events

  const missing = missingRequired(provider, nextConfig, nextSecrets)
  if (enabled && missing.length) {
    const labels = missing.map(k => provider.fields.find(f => f.key === k)?.labelEn || k).join(', ')
    throw createError({ statusCode: 400, statusMessage: `Cannot enable ${provider.name}: missing ${labels}` })
  }

  const status = computedStatus(provider, enabled, nextConfig, nextSecrets, null, null)

  if (platform === META) {
    const settingsData: JsonRecord = {
      metaEnabled: enabled,
      metaPixelId: text(nextConfig.pixelId) || null,
      metaTestEventCode: text(nextConfig.testEventCode) || null,
    }
    if (!nextSecrets.accessToken) settingsData.metaCapiToken = null
    else settingsData.metaCapiToken = nextSecrets.accessToken
    await upsertSiteSettings(settingsData, { siteNameAr: 'AMIR', siteNameEn: 'Amir' })
    await prisma.marketingIntegration.upsert({
      where: { platform: META },
      update: {
        enabled,
        config: { events } as any,
        secrets: {} as any,
        status,
        lastVerifiedAt: null,
        lastError: null,
        lastErrorAt: null,
      },
      create: {
        platform: META,
        enabled,
        config: { events } as any,
        secrets: {} as any,
        status,
      },
    })
  }
  else {
    await prisma.marketingIntegration.upsert({
      where: { platform },
      update: {
        enabled,
        config: nextConfig as any,
        secrets: nextSecrets as any,
        status,
        lastVerifiedAt: null,
        lastError: null,
        lastErrorAt: null,
      },
      create: {
        platform,
        enabled,
        config: nextConfig as any,
        secrets: nextSecrets as any,
        status,
      },
    })
  }

  return (await getIntegrationView(platform))!
}

/**
 * Server adapter config: complete public config plus a decryptable secret.
 * Dispatchers require an enabled integration; the admin verification endpoint
 * may request the config of a disabled integration to test before enabling.
 */
export async function getServerDeliveryConfig(
  platform: MarketingPlatform,
  options: { requireEnabled?: boolean } = {},
) {
  const provider = getMarketingProvider(platform)
  if (!provider || !provider.delivery.server) return null
  const raw = await rawIntegration(platform)
  if (options.requireEnabled !== false && !raw.enabled) return null
  if (missingRequired(provider, raw.config, raw.secrets).length) return null
  const secretField = provider.fields.find(f => f.secret)
  if (!secretField || !text(raw.secrets[secretField.key])) return null
  let secret = ''
  try {
    secret = decryptData(text(raw.secrets[secretField.key]))
  }
  catch {
    return null
  }
  if (!secret) return null
  return {
    provider,
    enabled: true,
    config: raw.config,
    secret,
    events: eventConfig(provider, raw.config),
  }
}

export async function markIntegrationVerified(platform: MarketingPlatform, verified: boolean, error?: string | null) {
  const now = new Date()
  const provider = getMarketingProvider(platform)
  if (!provider) return
  const raw = await rawIntegration(platform)
  const status = verified
    ? (raw.enabled ? 'VERIFIED' : 'DISABLED')
    : (raw.lastVerifiedAt ? 'ERROR' : computedStatus(provider, raw.enabled, raw.config, raw.secrets, raw.lastVerifiedAt, now))
  await prisma.marketingIntegration.upsert({
    where: { platform },
    update: {
      status,
      ...(verified ? { lastVerifiedAt: now } : {}),
      lastError: verified ? null : (error || 'Verification failed').slice(0, 500),
      lastErrorAt: verified ? null : now,
    },
    create: {
      platform,
      enabled: raw.enabled,
      status,
      ...(verified ? { lastVerifiedAt: now } : {}),
      lastError: verified ? null : (error || 'Verification failed').slice(0, 500),
      lastErrorAt: verified ? null : now,
    },
  })
}

export interface DeliveryInput {
  platform: MarketingPlatform
  eventName: MarketingEventName
  eventId: string
  responseCode?: number | null
  error?: string | null
}

/** Claim an event id for a platform; returns a row id or null when already handled. */
export async function claimDelivery(input: DeliveryInput): Promise<string | null> {
  try {
    const row = await prisma.marketingDelivery.create({
      data: {
        platform: input.platform,
        eventName: input.eventName,
        eventId: input.eventId,
        status: 'PENDING',
      },
      select: { id: true },
    })
    return row.id
  }
  catch (e: any) {
    if (e?.code === 'P2002') return null
    return null
  }
}

export async function finishDelivery(
  id: string,
  status: 'SENT' | 'FAILED' | 'SKIPPED',
  responseCode: number | null = null,
  error: string | null = null,
) {
  await prisma.marketingDelivery.update({
    where: { id },
    data: {
      status,
      responseCode,
      error: error ? error.slice(0, 500) : null,
    },
  }).catch(() => null)
}

/** Bound diagnostics growth: keep the last 30 days. */
export async function pruneMarketingDeliveries() {
  await prisma.marketingDelivery.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  }).catch(() => null)
}

export async function getMarketingOverview() {
  await pruneMarketingDeliveries()
  const integrations = await listIntegrationViews()
  const [recent, lastSuccess, errors] = await Promise.all([
    prisma.marketingDelivery.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { platform: true, eventName: true, status: true, responseCode: true, error: true, createdAt: true },
    }),
    prisma.marketingDelivery.findFirst({
      where: { status: 'SENT' },
      orderBy: { createdAt: 'desc' },
      select: { platform: true, eventName: true, createdAt: true },
    }),
    prisma.marketingDelivery.findMany({
      where: { status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { platform: true, eventName: true, status: true, error: true, createdAt: true },
    }),
  ])
  return {
    integrations,
    totals: {
      configured: integrations.filter(i => i.status !== 'NOT_CONFIGURED').length,
      enabled: integrations.filter(i => i.enabled).length,
      attention: integrations.filter(i => ['ERROR', 'INCOMPLETE', 'UNVERIFIED'].includes(i.status)).length,
    },
    lastSuccessfulDelivery: lastSuccess,
    recentDeliveries: recent,
    recentErrors: errors,
  }
}

/**
 * Browser-safe configuration: public IDs, public options and enabled browser
 * events only. Secrets (CAPI/API tokens) must never be added here.
 */
export async function getPublicMarketingConfig() {
  const platforms: Record<string, {
    id: string
    events: Record<string, boolean>
    options?: Record<string, string>
  }> = {}
  for (const provider of MARKETING_PROVIDERS) {
    if (!provider.delivery.browser) continue
    const raw = await rawIntegration(provider.id)
    if (!raw.enabled) continue
    if (missingRequired(provider, raw.config, raw.secrets).length) continue
    const idKey = provider.id === 'pinterest' ? 'tagId' : provider.id === 'google' ? 'conversionId' : 'pixelId'
    const id = text(raw.config[idKey])
    if (!id) continue
    const events = eventConfig(provider, raw.config)
    const filtered: Record<string, boolean> = {}
    for (const [key, on] of Object.entries(events)) {
      const def = MARKETING_EVENT_DEFINITIONS.find(e => e.key === key)
      if (on && def?.browser) filtered[key] = true
    }
    const options: Record<string, string> = {}
    if (provider.id === 'google') {
      const label = text(raw.config.conversionLabel)
      if (label) options.conversionLabel = label
    }
    platforms[provider.id] = {
      id,
      events: filtered,
      ...(Object.keys(options).length ? { options } : {}),
    }
  }
  return { platforms }
}
