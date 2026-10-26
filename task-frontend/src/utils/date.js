import { format, isToday, isTomorrow, isYesterday, isThisYear } from 'date-fns'

// The backend (Jackson + LocalDateTime) sends dates either as an array
// [year, month(1-12), day, hour, minute, second, nanos] or as an ISO string
// without a time zone. Both mean local time.
export function fromApi(value) {
  if (!value) return null
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value
    return new Date(year, month - 1, day, hour, minute, second)
  }
  return new Date(value)
}

// LocalDateTime expects local time without a zone suffix.
// Date.toJSON() would send UTC ("...Z") and shift the date.
export function toApi(date) {
  if (!date) return null
  return format(date, "yyyy-MM-dd'T'HH:mm:00")
}

export function formatDue(date) {
  if (!date) return null
  const time = format(date, 'HH:mm')
  if (isToday(date)) return `Today, ${time}`
  if (isTomorrow(date)) return `Tomorrow, ${time}`
  if (isYesterday(date)) return `Yesterday, ${time}`
  return format(date, isThisYear(date) ? 'MMM d, HH:mm' : 'MMM d yyyy, HH:mm')
}

export function formatShort(date) {
  if (!date) return null
  return format(date, isThisYear(date) ? 'MMM d' : 'MMM d yyyy')
}
