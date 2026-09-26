export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface AdminToast {
  id: number
  type: ToastType
  title: string
  message?: string
  body?: string
  url?: string
  duration?: number
}

let counter = 0

/** Global brand-styled toast notification store for Admin Panel. */
export function useAdminToast() {
  const toasts = useState<AdminToast[]>('admin-toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function add(input: Omit<AdminToast, 'id'>) {
    counter += 1
    const id = counter
    const duration = input.duration ?? 4500
    toasts.value.push({ id, ...input })
    if (duration > 0 && typeof window !== 'undefined') {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  /** Backward-compatible push method used by useAdminPush */
  function push(input: { title: string, body?: string, url?: string }) {
    return add({
      type: 'info',
      title: input.title,
      body: input.body,
      url: input.url,
      duration: 7000,
    })
  }

  function success(title: string, message?: string, options?: { url?: string, duration?: number }) {
    return add({ type: 'success', title, message, body: message, ...options })
  }

  function error(title: string, message?: string, options?: { url?: string, duration?: number }) {
    return add({ type: 'error', title, message, body: message, ...options })
  }

  function warning(title: string, message?: string, options?: { url?: string, duration?: number }) {
    return add({ type: 'warning', title, message, body: message, ...options })
  }

  function info(title: string, message?: string, options?: { url?: string, duration?: number }) {
    return add({ type: 'info', title, message, body: message, ...options })
  }

  return { toasts, dismiss, add, push, success, error, warning, info }
}

/** Bump counter to refresh the notification bell after foreground pushes. */
export function useAdminNotifTick() {
  return useState('admin-notif-tick', () => 0)
}
