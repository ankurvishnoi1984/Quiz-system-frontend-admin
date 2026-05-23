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
    const startedAt = entry.endsAt - limitMs
    const elapsed = Date.now() - startedAt
    return Math.max(0, Math.min(limitMs, Math.round(elapsed)))
  }

  const openedAt = quizQuestionOpenedAt?.[qid]
  if (!openedAt) return null
  return Math.max(0, Math.round(Date.now() - openedAt))
}

/** e.g. 10.234s or 10.234s / 30s for timed questions */
export function formatQuizSubmitTime(responseTimeMs, timeLimitSeconds = 0) {
  if (responseTimeMs == null || Number.isNaN(Number(responseTimeMs))) return '—'
  const ms = Math.max(0, Math.round(Number(responseTimeMs)))
  const seconds = Math.floor(ms / 1000)
  const millis = ms % 1000
  const elapsed = `${seconds}.${String(millis).padStart(3, '0')}s`
  const limit = Number(timeLimitSeconds) || 0
  if (limit > 0) {
    return `${elapsed} / ${limit}s`
  }
  return elapsed
}
