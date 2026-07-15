import { parseActivationTime } from '../../../utils/questionTimer'
import {
  getQuestionMediaKindFromApiType,
  resolveQuestionMediaUrl,
} from '../../../utils/questionMedia'

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export function isLiveActiveQuestion(question) {
  return question?.isLive === true || question?.is_live === true || question?.is_live === 1
}

export function mapQuestionType(type) {
  const map = {
    mcq: 'MCQ',
    poll: 'Poll',
    word_cloud: 'Word Cloud',
    rating: 'Rating',
    open_text: 'Text',
    true_false: 'True/False',
    ranking: 'Ranking',
    emoji_reaction: 'Emoji Reaction',
    survey: 'Survey',
  }
  return map[type] || type
}

export function mapSurveySubTypeToUi(subType) {
  const map = {
    mcq: 'MCQ',
    poll: 'Poll',
    rating: 'Rating',
    open_text: 'Text',
    word_cloud: 'Word Cloud',
    ranking: 'Ranking',
    true_false: 'True/False',
    emoji_reaction: 'Emoji Reaction',
  }
  return map[subType] || 'MCQ'
}

/** Normalize API question row for participant UI (survey → effective format type). */
export function mapParticipantQuestion(q) {
  const rawType = q.question_type
  const isSurvey = rawType === 'survey'
  const type = isSurvey ? mapSurveySubTypeToUi(q.survey_subtype) : mapQuestionType(rawType)

  return {
    id: q.question_id,
    text: q.question_text,
    media: q.media_url
      ? {
          url: resolveQuestionMediaUrl(q.media_url),
          kind: getQuestionMediaKindFromApiType(q.media_type),
        }
      : null,
    type,
    rawType,
    isSurvey,
    surveySubType: isSurvey ? q.survey_subtype : null,
    isQuizMode:
      rawType === 'poll' || rawType === 'emoji_reaction' || isSurvey
        ? false
        : Boolean(q.is_quiz_mode),
    allowMultipleSelect: Boolean(q.allow_multiple_select),
    ratingMin: Number(q.rating_min ?? 1),
    ratingMax: Number(q.rating_max ?? 5),
    ratingMinLabel: q.rating_min_label || '',
    ratingMaxLabel: q.rating_max_label || '',
    isLive: q.is_live === true || q.is_live === 1 || q.is_live === '1',
    answerRevealed: Boolean(q.answer_revealed),
    correctOptionIds: (q.correct_option_ids || []).map(Number),
    showLeaderboard: Boolean(q.show_leaderboard),
    options: q.question_options || [],
    timeLimit: isSurvey ? 0 : Number(q.time_limit_seconds || 0),
    liveActivatedAt: q.live_activated_at || null,
    openForReattempt:
      q.open_for_reattempt === true ||
      q.open_for_reattempt === 1 ||
      q.open_for_reattempt === '1',
    submissionsClosed:
      q.submissions_closed === true ||
      q.submissions_closed === 1 ||
      q.submissions_closed === '1',
  }
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

  if (q.type === 'MCQ' || q.type === 'Poll' || q.type === 'True/False' || q.type === 'Emoji Reaction') {
    if (q.allowMultipleSelect) {
      const selected = Array.isArray(res.selectedOptions) ? res.selectedOptions : []
      const optionIds = selected
        .map((text) => findOptionForSelection(q.options, text)?.option_id)
        .filter((id) => id != null)
      if (!optionIds.length) return null
      payload.option_ids = optionIds
    } else {
      const opt = findOptionForSelection(q.options, res.selectedOption)
      if (!opt?.option_id) return null
      payload.option_id = opt.option_id
    }
  }

  if (q.type === 'Rating') {
    const rating = Number(res.rating)
    const min = Number(q.ratingMin ?? 1)
    const max = Number(q.ratingMax ?? 5)
    if (!Number.isFinite(rating) || rating < min || rating > max) return null
    payload.rating_value = rating
  }

  if (q.type === 'Text') {
    const text = res.textResponse?.trim()
    if (!text) return null
    payload.text_response = text
  }

  if (q.type === 'Ranking') {
    const order = Array.isArray(res.rankingOrder) ? res.rankingOrder.map(Number).filter(Boolean) : []
    const expectedOptionIds = (q.options || []).map((o) => Number(o.option_id)).filter(Boolean)
    const uniqueOrder = [...new Set(order)]
    if (
      expectedOptionIds.length < 2 ||
      uniqueOrder.length !== expectedOptionIds.length ||
      !expectedOptionIds.every((id) => uniqueOrder.includes(id))
    ) {
      return null
    }
    payload.ranking_order = uniqueOrder
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

/** Last question in session display order (host-defined sequence). */
export function getSessionLastQuestionId(questions = []) {
  if (!questions.length) return null
  const sorted = [...questions].sort((a, b) => {
    const orderDiff = Number(a.display_order ?? 0) - Number(b.display_order ?? 0)
    if (orderDiff !== 0) return orderDiff
    return Number(a.id ?? 0) - Number(b.id ?? 0)
  })
  return sorted[sorted.length - 1]?.id ?? null
}

/**
 * Multi-nav: participant finalized by submitting the session's last question.
 * @param {Array} sessionQuestions All session questions (ordered by host)
 * @param {Record<string, boolean>} explicitSubmittedIds
 */
export function isMultiNavLastQuestionFinalized(sessionQuestions = [], explicitSubmittedIds = {}) {
  const lastId = getSessionLastQuestionId(sessionQuestions)
  return lastId != null && Boolean(explicitSubmittedIds[String(lastId)])
}

/** @deprecated Use isMultiNavLastQuestionFinalized */
export const isQuizTotalTimeSessionFinalized = isMultiNavLastQuestionFinalized

/**
 * Whether a previously saved answer may still be edited.
 * @param {object} [editPolicy]
 * @param {boolean} [editPolicy.lastQuestionFinalized]
 */
export function participantCanUpdateSubmittedResponse(
  question,
  navigationEnabled,
  editPolicy = {},
) {
  const { lastQuestionFinalized = false } = editPolicy
  if (!navigationEnabled || lastQuestionFinalized) return false
  return Number(question?.timeLimit ?? 0) <= 0
}

/** Word cloud: lock add/input after submit unless edits are still allowed. */
export function participantWordCloudInputLocked({
  question,
  navigationEnabled,
  inputsLocked,
  submittedIds,
  editPolicy = {},
}) {
  if (inputsLocked) return true
  if (!question || question.type !== 'Word Cloud') return false
  const submitted = Boolean(submittedIds?.[String(question.id)])
  if (!submitted) return false
  return !participantCanUpdateSubmittedResponse(question, navigationEnabled, editPolicy)
}

export function shouldIncludeQuestionInFinalize(
  question,
  submittedIds,
  navigationEnabled,
  responses,
  editPolicy = {},
) {
  if (question?.submissionsClosed && !question?.openForReattempt) return false
  const payload = buildResponsePayloadForQuestion(question, responses[question.id])
  if (!payload) return false
  if (!submittedIds?.[String(question.id)]) return true
  return participantCanUpdateSubmittedResponse(question, navigationEnabled, editPolicy)
}

export function participantQuestionHasAnswer(question, response = {}) {
  if (!question) return false
  if (question.type === 'MCQ' || question.type === 'Poll' || question.type === 'True/False' || question.type === 'Emoji Reaction') {
    if (question.allowMultipleSelect) {
      return Array.isArray(response.selectedOptions) && response.selectedOptions.length > 0
    }
    return Boolean(String(response.selectedOption || '').trim())
  }
  if (question.type === 'Rating') {
    const rating = Number(response.rating)
    const min = Number(question.ratingMin ?? 1)
    const max = Number(question.ratingMax ?? 5)
    return Number.isFinite(rating) && rating >= min && rating <= max
  }
  if (question.type === 'Text') {
    return Boolean(String(response.textResponse || '').trim())
  }
  if (question.type === 'Ranking') {
    const order = Array.isArray(response.rankingOrder) ? response.rankingOrder.map(Number).filter(Boolean) : []
    const optionIds = (question.options || []).map((o) => Number(o.option_id)).filter(Boolean)
    if (optionIds.length < 2) return false
    if (order.length !== optionIds.length) return false
    if (new Set(order).size !== order.length) return false
    return optionIds.every((id) => order.includes(id))
  }
  if (question.type === 'Word Cloud') {
    return (response.tags || []).length > 0
  }
  return false
}

/** Multi-nav: participant has opened, answered, or submitted this question. */
export function hasParticipantViewedOrAttemptedQuestion(
  question,
  { openedAtByQuestion = {}, submittedIds = {}, responses = {} } = {},
) {
  if (!question?.id) return false
  const qid = String(question.id)
  if (openedAtByQuestion?.[qid]) return true
  if (submittedIds?.[qid]) return true
  return participantQuestionHasAnswer(question, responses[question.id])
}

/** Live question the host activated most recently (by live_activated_at). */
export function getLastActivatedLiveQuestion(activeQuestions = []) {
  const live = activeQuestions.filter(isLiveActiveQuestion)
  if (!live.length) return null

  return live.reduce((best, q) => {
    const ms = parseActivationTime(q.liveActivatedAt ?? q.live_activated_at) ?? 0
    const bestMs = parseActivationTime(best.liveActivatedAt ?? best.live_activated_at) ?? 0
    if (ms > bestMs) return q
    if (ms < bestMs) return best
    const orderDiff = Number(q.display_order ?? 0) - Number(best.display_order ?? 0)
    if (orderDiff !== 0) return orderDiff > 0 ? q : best
    return Number(q.id ?? 0) > Number(best.id ?? 0) ? q : best
  })
}

/**
 * Multi-nav + timed: Previous only after the latest host-activated question was submitted
 * via Submit (not merely selecting an option or Next auto-save).
 */
export function canShowPreviousForTimedMultiNav(activeQuestions, explicitSubmittedIds = {}) {
  if (!activeQuestions?.length || activeQuestions.length <= 1) return false
  const lastActivated = getLastActivatedLiveQuestion(activeQuestions)
  if (!lastActivated?.id) return false
  return Boolean(explicitSubmittedIds[String(lastActivated.id)])
}

/** Multi-nav + untimed: Previous is always available when multiple questions are active. */
export function canShowPreviousForUntimedMultiNav(activeQuestions) {
  return Boolean(activeQuestions?.length > 1)
}

/**
 * Multi-nav + quiz total time: Previous after the final question was submitted,
 * when the personal session timer expires, or when the host closes all questions.
 */
export function canShowPreviousForQuizTotalTimeMultiNav(
  activeQuestions,
  explicitSubmittedIds = {},
  sessionTimerExpired = false,
  allQuestionsClosedByHost = false,
) {
  if (!activeQuestions?.length || activeQuestions.length <= 1) return false
  return (
    isMultiNavLastQuestionFinalized(activeQuestions, explicitSubmittedIds) ||
    sessionTimerExpired ||
    allQuestionsClosedByHost
  )
}
