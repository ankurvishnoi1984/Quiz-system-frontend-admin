/**
 * Elapsed time from question start to submit (ms).
 * Timed: derived from countdown end; untimed: from first view of the question.
 */
export function computeResponseTimeMs(question, quizCountdownByQuestion, quizQuestionOpenedAt) {
  if (!question?.id) return null
  const qid = String(question.id)
  const timeLimitSec = Number(question.timeLimit ?? question.time_limit_seconds) || 0

  if (timeLimitSec > 0) {
    const entry = quizCountdownByQuestion?.[qid]
    if (!entry?.endsAt) return null
    const limitMs = timeLimitSec * 1000
    if (entry.frozen != null) {
      const usedSec = Math.max(0, timeLimitSec - entry.frozen)
      return Math.max(0, Math.min(limitMs, Math.round(usedSec * 1000)))
    }
    const startedAt = entry.endsAt - limitMs
    const elapsed = Date.now() - startedAt
    return Math.max(0, Math.min(limitMs, Math.round(elapsed)))
  }

  const openedAt = quizQuestionOpenedAt?.[qid]
  if (!openedAt) return null
  return Math.max(0, Math.round(Date.now() - openedAt))
}

function unitLabel(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`
}

/** e.g. "1 second 883 milliseconds" or "1 minute 52 seconds 123 milliseconds" */
export function formatDurationMs(ms) {
  const total = Math.max(0, Math.round(Number(ms)))
  const minutes = Math.floor(total / 60000)
  const remainderAfterMinutes = total % 60000
  const seconds = Math.floor(remainderAfterMinutes / 1000)
  const millis = remainderAfterMinutes % 1000

  const parts = []
  if (minutes > 0) {
    parts.push(unitLabel(minutes, 'minute', 'minutes'))
  }
  if (seconds > 0) {
    parts.push(unitLabel(seconds, 'second', 'seconds'))
  }
  if (millis > 0 || parts.length === 0) {
    parts.push(unitLabel(millis, 'millisecond', 'milliseconds'))
  }

  return parts.join(' ')
}

/** Elapsed time for host live view (Attempts & responses). */
export function formatQuizSubmitTime(responseTimeMs) {
  if (responseTimeMs == null || Number.isNaN(Number(responseTimeMs))) return '—'
  return formatDurationMs(responseTimeMs)
}

/** Compact table cells: "7.438" — seconds.milliseconds */
export function formatQuizSubmitTimeCompact(responseTimeMs) {
  if (responseTimeMs == null || Number.isNaN(Number(responseTimeMs))) return '—'
  const total = Math.max(0, Math.round(Number(responseTimeMs)))
  const seconds = Math.floor(total / 1000)
  const millis = total % 1000
  return `${seconds}.${String(millis).padStart(3, '0')}`
}

/** Participant rankings: "7s 252 ms" — ms normalized to 3 digits */
export function formatQuizSubmitTimeParticipant(responseTimeMs) {
  if (responseTimeMs == null || Number.isNaN(Number(responseTimeMs))) return '—'
  const total = Math.max(0, Math.round(Number(responseTimeMs)))
  const seconds = Math.floor(total / 1000)
  const millis = total % 1000
  return `${seconds}s ${String(millis).padStart(3, '0')} ms`
}
