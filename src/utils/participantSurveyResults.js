import { sortTrueFalseOptionData, getQuestionChartRawType, mapLiveQuestionType } from './livePresentation'

export function getParticipantResultsTitle(question) {
  if (!question) return 'Results'
  const label =
    question.type || mapLiveQuestionType(getQuestionChartRawType(question)) || 'Question'
  return `${label} results`
}

function normalizeOptions(question) {
  return (question?.options || []).map((option) => ({
    optionId: option.option_id ?? option.optionId,
    optionText: option.option_text ?? option.text ?? 'Option',
  }))
}

function buildOptionRows(question, results) {
  const total = Number(results?.total_responses || 0)
  const byOption = results?.by_option || {}
  const effectiveType = results?.effective_type || question?.surveySubType || 'mcq'

  let rows = normalizeOptions(question).map((option) => {
    const count = Number(byOption[String(option.optionId)] || 0)
    return {
      label: option.optionText,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }
  })

  if (effectiveType === 'true_false') {
    rows = sortTrueFalseOptionData(
      rows.map((row) => ({ name: row.label, value: row.percent, count: row.count })),
    ).map((row) => ({ label: row.name, count: row.count, percent: row.value }))
  }

  rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  return { total, rows }
}

export function buildParticipantSurveyResultsView(question, results) {
  if (!question || !results) return null

  const effectiveType = results.effective_type || question.surveySubType || 'mcq'
  const totalResponses = Number(results.total_responses || 0)

  if (effectiveType === 'mcq' || effectiveType === 'poll' || effectiveType === 'true_false') {
    const { total, rows } = buildOptionRows(question, results)
    return {
      kind: 'options',
      totalResponses: total,
      rows,
      topLabel: rows[0]?.count > 0 ? rows[0].label : null,
    }
  }

  if (effectiveType === 'emoji_reaction') {
    const { total, rows } = buildOptionRows(question, results)
    return {
      kind: 'emoji_reaction',
      totalResponses: total,
      rows,
      topLabel: rows[0]?.count > 0 ? rows[0].label : null,
    }
  }

  if (effectiveType === 'rating') {
    const distribution = results.rating_distribution || {}
    const rows = Object.entries(distribution)
      .map(([value, count]) => ({
        label: value,
        count: Number(count || 0),
        percent:
          totalResponses > 0
            ? Math.round((Number(count || 0) / totalResponses) * 100)
            : 0,
      }))
      .sort((a, b) => Number(a.label) - Number(b.label))

    return {
      kind: 'rating',
      totalResponses,
      averageRating: results.average_rating,
      rows,
    }
  }

  if (effectiveType === 'word_cloud') {
    const rows = (results.word_counts || []).slice(0, 12).map((row) => ({
      label: row.text,
      count: Number(row.count || 0),
      percent:
        totalResponses > 0
          ? Math.round((Number(row.count || 0) / totalResponses) * 100)
          : 0,
    }))

    return {
      kind: 'word_cloud',
      totalResponses,
      rows,
      topLabel: rows[0]?.label || null,
    }
  }

  if (effectiveType === 'ranking') {
    const rows = (results.ranking_analytics?.rankings || []).map((row) => ({
      label: row.optionText,
      count: Number(row.firstPlaceCount || 0),
      percent:
        results.ranking_analytics?.totalResponses > 0
          ? Math.round(
              (Number(row.firstPlaceCount || 0) / results.ranking_analytics.totalResponses) * 100,
            )
          : 0,
      meta: `#${row.rank} · avg rank ${row.averageRank}`,
    }))

    return {
      kind: 'ranking',
      totalResponses: Number(results.ranking_analytics?.totalResponses || 0),
      rows,
      topLabel: rows[0]?.label || null,
    }
  }

  return {
    kind: 'text',
    totalResponses,
    rows: [],
  }
}
