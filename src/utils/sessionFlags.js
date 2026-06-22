/** Session flag is enabled only for explicit true / 1 (MySQL tinyint safe). */
export function isAllowLateJoinEnabled(value) {
  return value === true || value === 1 || value === '1'
}

export const MULTI_NAV_TIMED_JOIN_CLOSED_MESSAGE = 'Session has already started'

/** Multiple active questions with a personal session-wide quiz timer (minutes). */
export function isSessionQuizTotalTimeEnabled(session) {
  if (!session) return false
  const minutes = Number(session?.quiz_total_time_minutes)
  return (
    session.participant_navigation_enabled !== false &&
    Number.isFinite(minutes) &&
    minutes > 0
  )
}

export function sessionHasTimedQuestions(questions = []) {
  return (questions || []).some(
    (q) => Number(q?.timeLimit ?? q?.time_limit_seconds ?? 0) > 0,
  )
}

function isQuestionLiveFlag(question) {
  return question?.isLive === true || question?.is_live === true || question?.is_live === 1
}

export function getFirstTimedQuestion(questions = []) {
  return (
    [...(questions || [])]
      .filter((q) => Number(q?.timeLimit ?? q?.time_limit_seconds ?? 0) > 0)
      .sort((a, b) => {
        const orderDiff = Number(a?.display_order ?? 0) - Number(b?.display_order ?? 0)
        if (orderDiff !== 0) return orderDiff
        return Number(a?.id ?? a?.question_id ?? 0) - Number(b?.id ?? b?.question_id ?? 0)
      })[0] ?? null
  )
}

/**
 * Multi-question navigation + timed: new joins blocked after first timed question expires.
 */
export function isMultiNavTimedJoinClosed(session, questions = []) {
  if (isSessionQuizTotalTimeEnabled(session)) return false
  if (session?.participant_navigation_enabled === false) return false
  if (!sessionHasTimedQuestions(questions)) return false

  const firstTimed = getFirstTimedQuestion(questions)
  if (!firstTimed || !isQuestionLiveFlag(firstTimed)) return false

  const activatedAt = firstTimed.liveActivatedAt ?? firstTimed.live_activated_at
  if (!activatedAt) return false

  const limit = Number(firstTimed.timeLimit ?? firstTimed.time_limit_seconds ?? 0)
  const deadline = new Date(activatedAt).getTime() + limit * 1000
  return Number.isFinite(deadline) && Date.now() >= deadline
}

/**
 * Strict late join: host activation clock, remaining time only.
 * Applies when single active question mode and the session has timed questions.
 * @param {object} session
 * @param {Array|boolean} [questionsOrHasTimed] Question list, or boolean from DB lookup.
 */
export function isStrictLateJoinSession(session, questionsOrHasTimed = []) {
  if (isSessionQuizTotalTimeEnabled(session)) return false
  if (session?.participant_navigation_enabled !== false) return false
  if (typeof questionsOrHasTimed === 'boolean') return questionsOrHasTimed
  return sessionHasTimedQuestions(questionsOrHasTimed)
}
