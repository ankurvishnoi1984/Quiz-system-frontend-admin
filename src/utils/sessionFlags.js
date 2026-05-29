/** Session flag is enabled only for explicit true / 1 (MySQL tinyint safe). */
export function isAllowLateJoinEnabled(value) {
  return value === true || value === 1 || value === '1'
}

export function sessionHasTimedQuestions(questions = []) {
  return (questions || []).some(
    (q) => Number(q?.timeLimit ?? q?.time_limit_seconds ?? 0) > 0,
  )
}

/**
 * Strict late join: host activation clock, remaining time only.
 * Applies when single active question mode and the session has timed questions.
 * @param {object} session
 * @param {Array|boolean} [questionsOrHasTimed] Question list, or boolean from DB lookup.
 */
export function isStrictLateJoinSession(session, questionsOrHasTimed = []) {
  if (session?.participant_navigation_enabled !== false) return false
  if (typeof questionsOrHasTimed === 'boolean') return questionsOrHasTimed
  return sessionHasTimedQuestions(questionsOrHasTimed)
}
