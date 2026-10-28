import { defineCachedEventHandler } from 'nitropack/runtime'
import { getBookingSettings } from '../../utils/booking-payments'
import { BOOKING_HORIZON_DAYS_DEFAULT } from '../../../shared/booking'

// AUDIT P2-04: public, non-sensitive booking rules so the browser can render
// the salon-local calendar day and bound the date picker. The server still
// validates every date independently; this endpoint is display guidance only.
export default defineCachedEventHandler(async () => {
  const settings = await getBookingSettings()
  return {
    timezone: settings.timezone,
    horizonDays: BOOKING_HORIZON_DAYS_DEFAULT,
    minLeadMin: settings.bookingMinLeadMin,
    cancellationWindowHours: settings.cancellationWindowHours,
    currency: settings.currency,
    slotStepMin: settings.slotStepMin,
  }
}, { maxAge: 60 })
