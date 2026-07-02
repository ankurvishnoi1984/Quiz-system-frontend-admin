import { getChartColor } from './chartColors'
import { mapApiMediaToQuestionMedia } from './questionMedia'
import { wordCountsFromApiResults, wordCountsFromResponses } from './wordCloud'

/** High-contrast palette for fullscreen present mode (MCQ / rating). */
export const PRESENT_OPTION_COLORS = [
  '#4F46E5',
  '#E11D48',
  '#D97706',
  '#0891B2',
  '#7C3AED',
  '#EA580C',
  '#059669',
  '#DB2777',
]

export function getPresentOptionColor(name, index, rawType) {
  if (rawType === 'true_false') {
    const key = String(name).trim().toLowerCase()
    if (key === 'true') return '#16A34A'
    if (key === 'false') return '#DC2626'
  }
  return PRESENT_OPTION_COLORS[index % PRESENT_OPTION_COLORS.length]
}

export function mapLiveQuestionType(type) {
  const map = {
    mcq: 'MCQ',
    poll: 'Poll',
    survey: 'Survey',
    word_cloud: 'Word Cloud',
    rating: 'Rating',
    open_text: 'Text',
    true_false: 'True/False',
    ranking: 'Ranking',
    emoji_reaction: 'Emoji Reaction',
  }
  return map[type] || type
}

/** Chart/analytics type: survey questions use survey_subtype. */
export function getQuestionChartRawType(question) {
  const rawType = question?.question_type ?? question?.rawType
  if (rawType === 'survey') {
    return question?.survey_subtype || 'mcq'
  }
  return rawType
}

/** Non-scored formats do not support per-question scoring leaderboards. */
export function questionSupportsLeaderboard(question) {
  const chartType = getQuestionChartRawType(question)
  return (
    chartType !== 'open_text' &&
    chartType !== 'rating' &&
    chartType !== 'poll' &&
    chartType !== 'word_cloud' &&
    chartType !== 'emoji_reaction'
  )
}

/** True when every question in the session is a standalone poll (non-scored). */
export function sessionIsStandalonePollOnly(questions) {
  if (!Array.isArray(questions) || !questions.length) return false
  return questions.every((q) => (q.rawType ?? q.question_type) === 'poll')
}

/** Open-text survey answers are not aggregated for participant-facing results. */
export function surveySupportsParticipantResults(question) {
  const isSurvey = Boolean(question?.isSurvey || question?.rawType === 'survey')
  if (!isSurvey) return false
  const subType = question?.surveySubType ?? question?.survey_subtype ?? getQuestionChartRawType(question)
  return subType !== 'open_text'
}

/** Poll, rating, and non-open-text surveys can show anonymous aggregate results. */
export function questionSupportsParticipantResults(question) {
  if (!question) return false
  const rawType = question.rawType ?? question.question_type
  if (rawType === 'poll' || rawType === 'rating' || rawType === 'emoji_reaction') return true
  if (rawType === 'survey' || question.isSurvey) {
    return surveySupportsParticipantResults(question)
  }
  return false
}

/** Session-wide Q&A leaderboard requires at least one scorable quiz question. */
export function sessionSupportsOverallLeaderboard(questions) {
  if (!Array.isArray(questions) || !questions.length) return false
  if (sessionIsStandalonePollOnly(questions)) return false
  return questions.some(
    (q) =>
      questionSupportsLeaderboard(q) &&
      Boolean(q.isQuizMode) &&
      q.rawType !== 'poll' &&
      !q.isSurvey,
  )
}

export function questionUsesEmojiChart(chartRawType) {
  return chartRawType === 'emoji_reaction'
}

export function questionUsesOptionChart(chartRawType) {
  return chartRawType === 'mcq' || chartRawType === 'poll' || chartRawType === 'true_false'
}

export function sortTrueFalseOptionData(data) {
  return [...data].sort((a, b) => {
    const rank = (name) => (String(name).trim().toLowerCase() === 'true' ? 0 : 1)
    return rank(a.name) - rank(b.name)
  })
}

export function normalizeQuestionOptions(question) {
  const raw = question?.question_options || question?.QuestionOptions || []
  return raw.map((option) => ({
    option_id: option.option_id,
    option_text: option.option_text,
    is_correct: Boolean(option.is_correct),
    display_order: option.display_order,
  }))
}

/** Host API returns options with is_correct; participant API may send correct_option_ids. */
export function resolveCorrectOptionIds(question, options) {
  const fromApi = (question?.correct_option_ids || []).map(Number).filter(Boolean)
  if (fromApi.length) return fromApi

  const revealed = Boolean(question?.answer_revealed ?? question?.answerRevealed)
  if (!revealed) return []

  return options.filter((option) => option.is_correct).map((option) => Number(option.option_id))
}

export function mapLiveQuestions(questions) {
  return (questions || []).map((q) => {
    const options = normalizeQuestionOptions(q)
    const answerRevealed = Boolean(q.answer_revealed)
    const rawType = q.question_type
    const chartRawType = getQuestionChartRawType(q)
    const isSurvey = rawType === 'survey'
    return {
      id: q.question_id,
      text: q.question_text,
      type: isSurvey ? mapLiveQuestionType(chartRawType) : mapLiveQuestionType(rawType),
      rawType,
      chartRawType,
      isSurvey,
      surveySubType: isSurvey ? q.survey_subtype : null,
      isLive: Boolean(q.is_live),
      timeLimit: isSurvey ? 0 : Number(q.time_limit_seconds) || 0,
      submissionsClosed: Boolean(q.submissions_closed),
      isQuizMode:
        rawType === 'poll' || rawType === 'emoji_reaction' || isSurvey
          ? false
          : Boolean(q.is_quiz_mode),
      answerRevealed,
      showLeaderboard: Boolean(q.show_leaderboard),
      ratingMin: Number(q.rating_min ?? 1),
      ratingMax: Number(q.rating_max ?? 5),
      ratingMinLabel: q.rating_min_label || '',
      ratingMaxLabel: q.rating_max_label || '',
      correctOptionIds: resolveCorrectOptionIds({ ...q, answerRevealed }, options),
      options,
      media: mapApiMediaToQuestionMedia(q),
    }
  })
}

export function getCorrectOptionsForQuestion(question) {
  const ids = new Set((question?.correctOptionIds || []).map(Number))
  if (!ids.size) return []
  return (question?.options || []).filter((o) => ids.has(Number(o.option_id)))
}

export function enrichOptionChartDataWithReveal(optionData, question) {
  const correctIds = new Set((question?.correctOptionIds || []).map(Number))
  const revealed = Boolean(question?.answerRevealed)
  const rawType = question?.chartRawType ?? question?.rawType

  return optionData.map((row, idx) => {
    const matched = (question?.options || []).find(
      (o) => String(o.option_text).trim() === String(row.name).trim(),
    )
    const isCorrect = matched ? correctIds.has(Number(matched.option_id)) : false
    return {
      ...row,
      isCorrect: revealed && isCorrect,
      optionIndex: idx,
      color: getPresentOptionColor(row.name, idx, rawType),
    }
  })
}

export function enrichRatingChartDataWithColors(ratingData) {
  return ratingData.map((row, idx) => ({
    ...row,
    optionIndex: idx,
    color: getPresentOptionColor(row.name, idx, 'rating'),
  }))
}

export function mapSessionParticipants(rows) {
  return (rows || [])
    .map((row) => {
      const id = row.participant_id
      if (!id) return null
      return {
        id,
        name: row.nickname?.trim() || `Participant ${id}`,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function buildParticipantList(responses) {
  const byId = new Map()
  for (const row of responses || []) {
    const id = row.participant_id
    if (!id || byId.has(id)) continue
    byId.set(id, {
      id,
      name: row.participant?.nickname || `Participant ${id}`,
    })
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function mergeParticipantLists(...lists) {
  const byId = new Map()
  for (const list of lists) {
    for (const entry of list || []) {
      if (!entry?.id) continue
      byId.set(entry.id, entry)
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function buildLeaderboard(responses, limit = 10) {
  const scoreByParticipant = new Map()
  for (const row of responses || []) {
    const key = row.participant_id
    const existing = scoreByParticipant.get(key) || {
      participant_id: key,
      name: row.participant?.nickname || `Participant ${key}`,
      score: 0,
      attempts: 0,
    }
    existing.score += Number(row.points_earned || 0)
    existing.attempts += 1
    scoreByParticipant.set(key, existing)
  }
  return Array.from(scoreByParticipant.values())
    .sort((a, b) => b.score - a.score || b.attempts - a.attempts)
    .slice(0, limit)
}

export function filterResponsesForQuestion(responses, questionId) {
  return (responses || []).filter((r) => Number(r.question_id) === Number(questionId))
}

export function buildOptionChartData(question, questionResults, currentResponses) {
  if (!question) return []
  const chartType = question.chartRawType ?? getQuestionChartRawType(question)
  const byOption = questionResults?.by_option || {}
  const opts = question.options || []

  if (opts.length > 0) {
    let rows = opts.map((option) => ({
      name: option.option_text,
      value: Number(byOption[String(option.option_id)] || 0),
    }))
    if (chartType === 'true_false') {
      rows = sortTrueFalseOptionData(rows)
    }
    return rows
  }

  if (chartType === 'true_false') {
    const counts = { True: 0, False: 0 }
    currentResponses.forEach((row) => {
      const label = (row.question_option?.option_text || '').trim()
      if (label.toLowerCase() === 'true') counts.True += 1
      else if (label.toLowerCase() === 'false') counts.False += 1
    })
    return [
      { name: 'True', value: counts.True },
      { name: 'False', value: counts.False },
    ]
  }

  return []
}

export function buildRatingChartData(currentResponses, question) {
  const min = Number(question?.rating_min ?? question?.ratingMin ?? 1)
  const max = Number(question?.rating_max ?? question?.ratingMax ?? 5)
  const counts = {}
  for (let v = min; v <= max; v += 1) counts[v] = 0
  currentResponses.forEach((row) => {
    const v = Number(row.rating_value)
    if (v >= min && v <= max) counts[v] += 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name: `★ ${name}`, value }))
}

export function buildWordCloudData(question, questionResults, currentResponses) {
  const chartType = question?.chartRawType ?? getQuestionChartRawType(question)
  if (chartType !== 'word_cloud') return []
  const fromApi = wordCountsFromApiResults(questionResults)
  if (fromApi.length) return fromApi
  return wordCountsFromResponses(currentResponses)
}

export function buildRankingResponseLabel(row, optionsById) {
  const order = Array.isArray(row?.ranking_order) ? row.ranking_order.map(Number).filter(Boolean) : []
  if (!order.length) return null
  return order
    .map((optionId, idx) => `${idx + 1}. ${optionsById.get(optionId) || `Option ${optionId}`}`)
    .join(' | ')
}

export function buildResponseRows(currentResponses, question = null) {
  const ratingMax = Number(question?.rating_max ?? question?.ratingMax ?? 5)
  const chartRawType = question ? question.chartRawType ?? getQuestionChartRawType(question) : null
  const isRanking = chartRawType === 'ranking'
  const optionsById = isRanking
    ? new Map((question?.options || []).map((opt) => [Number(opt.option_id), opt.option_text]))
    : null

  return currentResponses
    .map((row) => ({
      id: row.response_id,
      participant: row.participant?.nickname || `Participant ${row.participant_id}`,
      response:
        row.question_option?.option_text ||
        (isRanking && optionsById ? buildRankingResponseLabel(row, optionsById) : null) ||
        row.text_response ||
        (row.rating_value != null ? `${row.rating_value} / ${ratingMax}` : '—'),
      responseTimeMs: row.response_time_ms != null ? Number(row.response_time_ms) : null,
    }))
    .sort((a, b) => {
      if (a.responseTimeMs == null && b.responseTimeMs == null) return 0
      if (a.responseTimeMs == null) return 1
      if (b.responseTimeMs == null) return -1
      return a.responseTimeMs - b.responseTimeMs
    })
}
