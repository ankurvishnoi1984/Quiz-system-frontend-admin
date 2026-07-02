import { DEFAULT_EMOJI_REACTION_OPTIONS } from '../constants/emojiReaction'

export function createDefaultEmojiReactionOptions(uid) {
  return DEFAULT_EMOJI_REACTION_OPTIONS.map((emoji, index) => ({
    id: uid(`emoji_${index}`),
    optionId: null,
    text: emoji,
    isCorrect: false,
  }))
}

function normalizeQuestionOptions(question) {
  const raw = question?.options || question?.question_options || question?.QuestionOptions || []
  return raw.map((option) => ({
    option_id: option.option_id ?? option.optionId,
    option_text: option.option_text ?? option.text ?? '—',
    display_order: option.display_order,
  }))
}

function countResponsesByOption(currentResponses = []) {
  const counts = new Map()
  for (const row of currentResponses) {
    if (row.option_id == null) continue
    const key = String(row.option_id)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return counts
}

/**
 * Build emoji bar rows from API results and/or live response rows.
 * Returns { rows, total } where each row has emoji, count, percent, optionId.
 */
export function buildEmojiBarData(question, results, currentResponses = []) {
  const options = normalizeQuestionOptions(question).sort(
    (a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0),
  )
  const byOption = results?.by_option || {}
  const responseCounts = countResponsesByOption(currentResponses)

  const rows = options.map((option) => {
    const optionId = option.option_id
    const countFromApi = Number(byOption[String(optionId)] || 0)
    const countFromResponses = responseCounts.get(String(optionId)) || 0
    const count = Object.keys(byOption).length ? countFromApi : countFromResponses
    return {
      optionId,
      emoji: option.option_text,
      count,
      value: count,
    }
  })

  const totalFromApi = Number(results?.total_responses)
  const total =
    Number.isFinite(totalFromApi) && totalFromApi >= 0
      ? totalFromApi
      : rows.reduce((sum, row) => sum + row.count, 0)

  return {
    rows: rows.map((row) => ({
      ...row,
      percent: total > 0 ? Math.round((row.count / total) * 100) : 0,
    })),
    total,
    leaderEmoji:
      rows.length > 0
        ? rows.reduce((best, row) => (row.count > best.count ? row : best), rows[0])?.emoji
        : null,
  }
}

export function buildEmojiReactionCsvSummaryRows({ sessionMeta, question, results, allResponses }) {
  const questionResponses = (allResponses || []).filter(
    (row) => Number(row.question_id) === Number(question.question_id),
  )
  const { rows } = buildEmojiBarData(question, results, questionResponses)
  const emojiColumns = rows.map((row) => row.emoji)
  const countColumns = rows.map((row) => String(row.count))

  return [
    sessionMeta.id,
    sessionMeta.title,
    String(question.display_order ?? ''),
    'Emoji Reaction',
    '',
    (question.question_text || '').replaceAll('"', '""'),
    'EMOJI_SUMMARY',
    ...emojiColumns,
    ...countColumns,
  ]
}

export function emojiDistributionFromReport(questionReport) {
  const responses = questionReport?.responses || []
  const counts = new Map()
  for (const row of responses) {
    const emoji = String(row.answer || '').trim()
    if (!emoji) continue
    counts.set(emoji, (counts.get(emoji) || 0) + 1)
  }
  const total = responses.length
  return Array.from(counts.entries())
    .map(([emoji, count]) => ({
      emoji,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji))
}
