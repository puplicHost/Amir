export interface AdminConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red danger styling for the confirm button (default true). */
  danger?: boolean
}

interface PendingConfirm {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  danger: boolean
  resolve: (value: boolean) => void
}

/** Promise-based branded confirmation dialog for destructive admin actions. */
export function useAdminConfirm() {
  const pending = useState<PendingConfirm | null>('admin-confirm-pending', () => null)

  function confirm(options: AdminConfirmOptions): Promise<boolean> {
    if (import.meta.server) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      pending.value = {
        title: options.title,
        message: options.message || '',
        confirmLabel: options.confirmLabel || '',
        cancelLabel: options.cancelLabel || '',
        danger: options.danger !== false,
        resolve,
      }
    })
  }

  function resolvePending(value: boolean) {
    pending.value?.resolve(value)
    pending.value = null
  }

  return { pending, confirm, resolvePending }
}
