/**
 * Shared state + logic for admin settings tab forms.
 *
 * Gives every settings tab the same UX contract:
 * - SSR-safe data loading via useRequestFetch
 * - Dirty tracking (unsaved-changes detection) shared with the tab bar
 * - Reset-to-last-saved, unified save flow with auto-dismissing feedback
 * - Consistent input styling tokens
 */

// Shared key the tab bar reads to guard against discarding edits.
export function useSettingsDirtyFlag() {
  return useState<boolean>('admin-settings-dirty', () => false)
}

export const settingsInputCls = 'h-10 w-full rounded-md border bg-white px-3 text-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-bg'

export const settingsTextareaCls = 'w-full rounded-md border bg-white p-2.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-bg'

interface SettingsFormOptions<T extends Record<string, any>> {
  /** useAsyncData cache key */
  key: string
  /** GET endpoint for current values */
  endpoint: string
  /** Pristine field values */
  defaults: T
  /** Map GET response onto form fields (default: pick matching keys) */
  mapData?: (data: any) => Partial<T>
  /** Build PUT body from form (default: whole form) */
  buildBody?: (form: T) => any
  /** PUT endpoint for saving */
  saveEndpoint: string
  successAr: string
  successEn: string
  failAr: string
  failEn: string
}

function snapshotOf<T>(form: T): string {
  return JSON.stringify(form)
}

export async function useSettingsForm<T extends Record<string, any>>(options: SettingsFormOptions<T>) {
  const { locale } = useI18n()
  const fetch = useRequestFetch()
  const dirtyFlag = useSettingsDirtyFlag()
  let dismissTimer: ReturnType<typeof setTimeout> | null = null
  // Register before any await: lifecycle hooks after an await warn
  // ("onUnmounted called with no active instance") and never run.
  onUnmounted(() => {
    if (dismissTimer) clearTimeout(dismissTimer)
  })

  const { data, refresh } = await useAsyncData(options.key, () => fetch<any>(options.endpoint))

  const form = reactive({ ...options.defaults }) as T
  const loading = ref(false)
  const statusMessage = ref('')
  const isError = ref(false)
  let snapshot = snapshotOf(form)

  function hydrate() {
    if (data.value) {
      const mapped = options.mapData
        ? options.mapData(data.value)
        : Object.fromEntries(
          Object.keys(options.defaults)
            .filter(k => data.value[k] !== undefined && data.value[k] !== null)
            .map(k => [k, data.value[k]]),
        )
      Object.assign(form, mapped)
    }
    snapshot = snapshotOf(form)
  }

  hydrate()

  const dirty = computed(() => snapshotOf(form) !== snapshot)

  // Publish dirty state for the tab-switch guard. Immediate so the flag is
  // correct right after mount (previous tab may have left it true).
  watch(dirty, v => { dirtyFlag.value = v }, { immediate: true })

  function flash(message: string, error: boolean) {
    statusMessage.value = message
    isError.value = error
    if (dismissTimer) clearTimeout(dismissTimer)
    dismissTimer = setTimeout(() => { if (!isError.value) statusMessage.value = '' }, 4000)
  }

  async function save(): Promise<boolean> {
    if (loading.value) return false
    loading.value = true
    statusMessage.value = ''
    isError.value = false
    try {
      await $fetch(options.saveEndpoint, {
        method: 'PUT',
        body: options.buildBody ? options.buildBody({ ...form } as T) : { ...form },
      })
      await refresh()
      hydrate()
      const msg = locale.value === 'ar' ? options.successAr : options.successEn
      flash(msg, false)
      const toast = useAdminToast()
      toast.success(
        locale.value === 'ar' ? 'تم حفظ الإعدادات' : 'Settings Saved',
        msg,
      )
      return true
    }
    catch (e: any) {
      const msg = e?.data?.message || (locale.value === 'ar' ? options.failAr : options.failEn)
      flash(msg, true)
      const toast = useAdminToast()
      toast.error(
        locale.value === 'ar' ? 'فشل حفظ الإعدادات' : 'Save Failed',
        msg,
      )
      return false
    }
    finally {
      loading.value = false
    }
  }

  function reset() {
    Object.assign(form, JSON.parse(snapshot))
    statusMessage.value = ''
    isError.value = false
  }

  /** Re-take the pristine snapshot (e.g. after clearing secrets post-save). */
  function markSaved() {
    snapshot = snapshotOf(form)
  }

  return { form, data, refresh, loading, statusMessage, isError, dirty, save, reset, markSaved }
}
