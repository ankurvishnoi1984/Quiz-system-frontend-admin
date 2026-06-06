/** Normalize API time (HH:mm or HH:mm:ss) for `<input type="time">`. */
export function toTimeInputValue(time) {
  if (!time) return ''
  return String(time).slice(0, 5)
}

/** Normalize API date for `<input type="date">`. */
export function toDateInputValue(date) {
  if (!date) return ''
  return String(date).slice(0, 10)
}

export function formatScheduledDateForDisplay(date) {
  if (!date) return null
  const parsed = new Date(`${String(date).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatScheduledTimeForDisplay(time) {
  if (!time) return null
  const [hours, minutes] = String(time).slice(0, 5).split(':')
  const parsed = new Date()
  parsed.setHours(Number(hours), Number(minutes), 0, 0)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatScheduledSessionForDisplay(date, time) {
  if (!date && !time) return null

  const dateLabel = formatScheduledDateForDisplay(date)
  const timeLabel = formatScheduledTimeForDisplay(time)

  if (dateLabel && timeLabel) return `${dateLabel} at ${timeLabel}`
  if (dateLabel) return dateLabel
  return timeLabel || null
}
