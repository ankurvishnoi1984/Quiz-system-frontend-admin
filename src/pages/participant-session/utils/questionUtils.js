export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export function mapQuestionType(type) {
  const map = {
    mcq: 'MCQ',
    word_cloud: 'Word Cloud',
    rating: 'Rating',
    open_text: 'Text',
    true_false: 'True/False',
    ranking: 'Ranking',
  }
  return map[type] || type
}

export function findOptionForSelection(options, selected) {
  if (selected == null || selected === '' || !options?.length) return null
  const norm = String(selected).trim().toLowerCase()
  return options.find((o) => String(o.option_text || '').trim().toLowerCase() === norm) || null
}

export function getTrueFalseChoices(question) {
  const opts = question?.options || []
  if (opts.length >= 2) {
    return [...opts].sort((a, b) => {
      const rank = (t) => (String(t).trim().toLowerCase() === 'true' ? 0 : 1)
      return rank(a.option_text) - rank(b.option_text)
    })
  }
  return [{ option_text: 'True' }, { option_text: 'False' }]
}

export function buildResponsePayloadForQuestion(q, res) {
  if (!q || !res) return null

  const payload = { question_id: q.id }

  if (q.type === 'MCQ' || q.type === 'True/False') {
    const opt = findOptionForSelection(q.options, res.selectedOption)
    if (!opt?.option_id) return null
    payload.option_id = opt.option_id
  }

  if (q.type === 'Rating') payload.rating_value = res.rating

  if (q.type === 'Text' || q.type === 'Ranking') {
    const text = res.textResponse?.trim()
    if (!text) return null
    payload.text_response = text
  }

  if (q.type === 'Word Cloud') {
    const tags = (res.tags || []).join(', ')
    if (!tags) return null
    payload.text_response = tags
  }

  return payload
}

export function getParticipantCurrentQuestion(activeQuestions, { liveQuestionId, questionIndex }) {
  if (!activeQuestions?.length) return null
  if (liveQuestionId) {
    const live = activeQuestions.find((q) => q.id === liveQuestionId)
    if (live) return live
  }
  const idx = clamp(questionIndex, 0, activeQuestions.length - 1)
  return activeQuestions[idx] ?? null
}

/**
 * The participant is "attempting" a question when there is one currently
 * displayed and they have not submitted it yet. Otherwise they are idle and
 * safe to auto-navigate.
 */
export function isParticipantAttemptingQuestion(question, submittedIds) {
  if (!question) return false
  return !submittedIds?.[String(question.id)]
}

export function canAutoNavigateToActivatedQuestion({
  activeQuestions,
  liveQuestionId,
  questionIndex,
  quizSubmittedQuestionIds,
}) {
  const currentQuestion = getParticipantCurrentQuestion(activeQuestions, {
    liveQuestionId,
    questionIndex,
  })
  return !isParticipantAttemptingQuestion(currentQuestion, quizSubmittedQuestionIds)
}

/**
 * When navigation is disabled, pick the question the participant should see.
 * Prefer host-targeted liveQuestionId, then first live question not yet submitted.
 */
export function getLockedNavigationQuestion(
  activeQuestions,
  liveQuestionId,
  submittedIds = {},
) {
  if (!activeQuestions?.length) return null

  if (liveQuestionId != null) {
    const byId = activeQuestions.find((q) => q.id === liveQuestionId)
    if (byId) return byId
  }

  const unsubmittedLive = activeQuestions.find(
    (q) => q.isLive && !submittedIds?.[String(q.id)],
  )
  if (unsubmittedLive) return unsubmittedLive

  const live = activeQuestions.find((q) => q.isLive)
  if (live) return live

  return activeQuestions[0] ?? null
}

/** Next active question the participant has not submitted yet (for locked navigation). */
export function findNextUnsubmittedActiveQuestion(activeQuestions, submittedIds, currentQuestionId) {
  if (!activeQuestions?.length) return null
  return (
    activeQuestions.find(
      (q) =>
        q.id !== currentQuestionId && !submittedIds?.[String(q.id)],
    ) ?? null
  )
}

export function participantQuestionHasAnswer(question, response = {}) {
  if (!question) return false
  if (question.type === 'MCQ' || question.type === 'True/False') {
    return Boolean(String(response.selectedOption || '').trim())
  }
  if (question.type === 'Rating') {
    return Number(response.rating) > 0
  }
  if (question.type === 'Text' || question.type === 'Ranking') {
    return Boolean(String(response.textResponse || '').trim())
  }
  if (question.type === 'Word Cloud') {
    return (response.tags || []).length > 0
  }
  return false
}
