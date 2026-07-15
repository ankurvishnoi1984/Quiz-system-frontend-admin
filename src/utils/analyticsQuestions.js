import { wordCountsFromApiResults, wordCountsFromResponses } from './wordCloud'
import {
  buildRatingChartData,
  getQuestionChartRawType,
  mapLiveQuestionType,
  sortTrueFalseOptionData,
} from './livePresentation'
import { buildEmojiBarData } from './emojiReaction'

export function apiQuestionTypeToUi(type) {
  const mapping = {
    mcq: 'MCQ',
    poll: 'Poll',
    survey: 'Survey',
    word_cloud: 'Word Cloud',
    rating: 'Rating',
    open_text: 'Text',
    true_false: 'True/False',
    ranking: 'Ranking',
    emoji_reaction: 'Emoji Reaction',
    fill_blank: 'Text',
  }
  return mapping[type] || type || 'Text'
}

export function surveySubTypeLabel(subType) {
  const labels = {
    mcq: 'Multiple Choice (MCQ)',
    poll: 'Poll',
    rating: 'Rating',
    open_text: 'Open Text',
    word_cloud: 'Word Cloud',
    ranking: 'Ranking',
    true_false: 'True/False',
    emoji_reaction: 'Emoji Reaction',
  }
  return labels[subType] || subType || '—'
}

export function chartFromQuestionResults(results, question, questionResponses = []) {
  const chartType = getQuestionChartRawType(question)
  const total = results?.total_responses || 0
  const options = question.question_options || []

  if ((chartType === 'mcq' || chartType === 'poll' || chartType === 'true_false') && options.length) {
    const byOption = results?.by_option || {}
    let rows = options.map((opt) => {
      const count = Number(byOption[String(opt.option_id)] || 0)
      return {
        name: opt.option_text,
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        count,
      }
    })
    if (chartType === 'true_false') {
      rows = sortTrueFalseOptionData(rows)
    }
    return rows
  }

  if (chartType === 'rating') {
    const ratingRows = buildRatingChartData(questionResponses, {
      rating_min: question.rating_min,
      rating_max: question.rating_max,
      ratingMin: question.rating_min,
      ratingMax: question.rating_max,
    })
    const ratingTotal = ratingRows.reduce((sum, row) => sum + row.value, 0)
    return ratingRows.map((row) => ({
      name: row.name,
      count: row.value,
      value: ratingTotal > 0 ? Math.round((row.value / ratingTotal) * 100) : 0,
    }))
  }

  if (chartType === 'emoji_reaction') {
    const { rows } = buildEmojiBarData(question, results, questionResponses)
    return rows.map((row) => ({
      name: row.emoji,
      emoji: row.emoji,
      count: row.count,
      value: row.percent,
    }))
  }

  return []
}

export function correctRateForQuestion(question, responses) {
  if (question?.question_type === 'survey' || !question?.is_quiz_mode) return null
  const qid = Number(question.question_id)
  const qResponses = (responses || []).filter((r) => Number(r.question_id) === qid)
  if (!qResponses.length) return null
  const correct = qResponses.filter((r) => r.is_correct).length
  return Math.round((correct / qResponses.length) * 100)
}

export function mapAnalyticsPerQuestion(q, idx, breakdown, results, allResponses) {
  const chartRawType = getQuestionChartRawType(q)
  const isSurvey = q.question_type === 'survey'
  const questionResponses = (allResponses || []).filter(
    (r) => Number(r.question_id) === Number(q.question_id),
  )
  const apiWordCounts = wordCountsFromApiResults(results)
  const wordCloud =
    chartRawType === 'word_cloud'
      ? apiWordCounts.length
        ? apiWordCounts
        : wordCountsFromResponses(questionResponses)
      : []

  return {
    id: String(q.question_id),
    index: idx + 1,
    type: isSurvey ? mapLiveQuestionType(chartRawType) : apiQuestionTypeToUi(q.question_type),
    typeLabel: isSurvey ? surveySubTypeLabel(chartRawType) : apiQuestionTypeToUi(q.question_type),
    text: q.question_text || breakdown?.question_text || '',
    responseCount: breakdown?.response_count ?? results?.total_responses ?? 0,
    correctRate: correctRateForQuestion(q, allResponses),
    chart: chartFromQuestionResults(results, q, questionResponses),
    wordCloud,
    rawType: q.question_type,
    chartRawType,
    isSurvey,
    surveySubType: q.survey_subtype || null,
    ratingMin: Number(q.rating_min ?? 1),
    ratingMax: Number(q.rating_max ?? 5),
    averageRating: results?.average_rating ?? null,
    rankingAnalytics: results?.ranking_analytics || null,
    openTextResponses: questionResponses
      .filter((r) => r.text_response)
      .map((r) => ({
        id: r.response_id,
        participant: r.participant?.nickname || `Participant ${r.participant_id}`,
        text: r.text_response,
      })),
  }
}

export function buildAnalyticsCsvRows({ sessionMeta, sortedQuestions, allResponses }) {
  const questionOrder = new Map(sortedQuestions.map((q, i) => [Number(q.question_id), i + 1]))
  const questionsById = new Map(sortedQuestions.map((q) => [Number(q.question_id), q]))

  return allResponses.map((r) => {
    const q = questionsById.get(Number(r.question_id))
    const isSurvey = q?.question_type === 'survey'
    const isEmojiReaction = q?.question_type === 'emoji_reaction'
    const chartType = q ? getQuestionChartRawType(q) : ''
    const responseText =
      r.question_option?.option_text ||
      (r.rating_value != null ? String(r.rating_value) : '') ||
      r.text_response ||
      ''

    return [
      sessionMeta.id,
      sessionMeta.title,
      String(questionOrder.get(Number(r.question_id)) ?? ''),
      apiQuestionTypeToUi(r.question?.question_type || q?.question_type),
      isSurvey ? q.survey_subtype || chartType : '',
      (r.question?.question_text ?? q?.question_text ?? '').replaceAll('"', '""'),
      r.participant?.nickname ?? '',
      responseText,
      isSurvey || isEmojiReaction ? '' : String(r.points_earned ?? 0),
      isSurvey || isEmojiReaction ? '' : r.is_correct == null ? '' : r.is_correct ? 'Yes' : 'No',
    ]
  })
}
