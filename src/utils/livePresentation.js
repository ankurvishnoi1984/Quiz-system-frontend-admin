import { wordCountsFromApiResults, wordCountsFromResponses } from './wordCloud'

export function mapLiveQuestionType(type) {
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

export function questionUsesOptionChart(rawType) {
  return rawType === 'mcq' || rawType === 'true_false'
}

export function sortTrueFalseOptionData(data) {
  return [...data].sort((a, b) => {
    const rank = (name) => (String(name).trim().toLowerCase() === 'true' ? 0 : 1)
    return rank(a.name) - rank(b.name)
  })
}

export function mapLiveQuestions(questions) {
  return (questions || []).map((q) => ({
    id: q.question_id,
    text: q.question_text,
    type: mapLiveQuestionType(q.question_type),
    rawType: q.question_type,
    isLive: Boolean(q.is_live),
    isQuizMode: Boolean(q.is_quiz_mode),
    answerRevealed: Boolean(q.answer_revealed),
    correctOptionIds: (q.correct_option_ids || []).map(Number),
    options: q.question_options || [],
  }))
}

export function getCorrectOptionsForQuestion(question) {
  const ids = new Set((question?.correctOptionIds || []).map(Number))
  if (!ids.size) return []
  return (question?.options || []).filter((o) => ids.has(Number(o.option_id)))
}

export function enrichOptionChartDataWithReveal(optionData, question) {
  const correctIds = new Set((question?.correctOptionIds || []).map(Number))
  const revealed = Boolean(question?.answerRevealed)

  return optionData.map((row, idx) => {
    const matched = (question?.options || []).find(
      (o) => String(o.option_text).trim() === String(row.name).trim(),
    )
    const isCorrect = matched ? correctIds.has(Number(matched.option_id)) : false
    return { ...row, isCorrect: revealed && isCorrect, optionIndex: idx }
  })
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

export function buildLeaderboard(responses, limit = 20) {
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
  const byOption = questionResults?.by_option || {}
  const opts = question.options || []

  if (opts.length > 0) {
    let rows = opts.map((option) => ({
      name: option.option_text,
      value: Number(byOption[String(option.option_id)] || 0),
    }))
    if (question.rawType === 'true_false') {
      rows = sortTrueFalseOptionData(rows)
    }
    return rows
  }

  if (question.rawType === 'true_false') {
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

export function buildRatingChartData(currentResponses) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  currentResponses.forEach((row) => {
    const v = Number(row.rating_value)
    if (v >= 1 && v <= 5) counts[v] += 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name: `★ ${name}`, value }))
}

export function buildWordCloudData(question, questionResults, currentResponses) {
  if (question?.rawType !== 'word_cloud') return []
  const fromApi = wordCountsFromApiResults(questionResults)
  if (fromApi.length) return fromApi
  return wordCountsFromResponses(currentResponses)
}

export function buildResponseRows(currentResponses) {
  return currentResponses
    .map((row) => ({
      id: row.response_id,
      participant: row.participant?.nickname || `Participant ${row.participant_id}`,
      response:
        row.question_option?.option_text ||
        row.text_response ||
        (row.rating_value != null ? `${row.rating_value} / 5` : '—'),
      responseTimeMs: row.response_time_ms != null ? Number(row.response_time_ms) : null,
    }))
    .sort((a, b) => {
      if (a.responseTimeMs == null && b.responseTimeMs == null) return 0
      if (a.responseTimeMs == null) return 1
      if (b.responseTimeMs == null) return -1
      return a.responseTimeMs - b.responseTimeMs
    })
}
