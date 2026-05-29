/** @param {string | number | Date | null | undefined} value */
export function parseActivationTime(value) {
  if (value == null || value === '') return null
  const ms = new Date(value).getTime()
  // Reject invalid / sentinel dates (e.g. bad VARCHAR values parsing as 1970).
  if (!Number.isFinite(ms) || ms < Date.UTC(2020, 0, 1)) return null
  return ms
}

/**
 * Host activation deadline for a timed question (epoch ms).
 * @param {{ timeLimit?: number, time_limit_seconds?: number, liveActivatedAt?: unknown, live_activated_at?: unknown }} question
 */
export function getQuestionDeadlineMs(question) {
  const limit = Number(question?.timeLimit ?? question?.time_limit_seconds ?? 0)
  const activated = parseActivationTime(
    question?.liveActivatedAt ?? question?.live_activated_at,
  )
  if (limit <= 0 || activated == null) return null
  return activated + limit * 1000
}

export function isTimedLiveQuestionExpired(question, now = Date.now()) {
  const limit = Number(question?.timeLimit ?? question?.time_limit_seconds ?? 0)
  if (limit <= 0) return false

  const deadline = getQuestionDeadlineMs(question)
  // No reliable host activation time yet — keep visible until we have one.
  if (deadline == null) return false
  return now >= deadline
}

/** Live questions visible to participants (including expired timed; answers lock via timer). */
export function filterActiveQuestionsForLateJoinPolicy(questions) {
  return (questions || []).filter(
    (q) => q.isLive === true || q.is_live === true || q.is_live === 1,
  )
}

/**
 * Countdown end timestamp for the participant UI.
 * Strict late join: shared host deadline (remaining time only).
 * Otherwise: full limit from when the participant opens the question.
 */
export function getCountdownEndsAtForQuestion({ question, strictLateJoin }) {
  const limit = Number(question?.timeLimit ?? question?.time_limit_seconds ?? 0)
  if (limit <= 0) return null

  if (!strictLateJoin) {
    return Date.now() + limit * 1000
  }

  const deadline = getQuestionDeadlineMs(question)
  if (deadline != null) return deadline
  // Host activation time unknown — participant still sees the question with a fresh window.
  return Date.now() + limit * 1000
}
