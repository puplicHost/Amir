import { ShieldAlert, Users, Wrench } from 'lucide-vue-next'

export interface NotificationTypeMeta {
  en: string
  ar: string
  icon: any
  /** Tinted chip classes for icon container + dot. */
  chip: string
  dot: string
}

/** Shared visual language for notification types (bell + full page). */
export function useNotificationUi() {
  const { locale } = useI18n()

  const TYPE_META: Record<string, NotificationTypeMeta> = {
    booking: {
      en: 'Bookings', ar: 'الحجوزات', icon: Wrench,
      chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    },
    staff: {
      en: 'Staff', ar: 'الموظفون', icon: Users,
      chip: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
      dot: 'bg-neutral-400',
    },
    security: {
      en: 'Security & Alerts', ar: 'الأمان والتنبيهات', icon: ShieldAlert,
      chip: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
      dot: 'bg-rose-500',
    },
  }

  function typeGroupOf(type: string) {
    if (type.startsWith('booking_') || type === 'new_booking') return 'booking'
    if (type === 'new_staff_user' || type === 'staff_updated') return 'staff'
    return 'security'
  }

  function typeLabel(group: string) {
    const m = TYPE_META[group]
    if (!m) return group
    return locale.value === 'ar' ? m.ar : m.en
  }

  return { TYPE_META, typeGroupOf, typeLabel }
}
