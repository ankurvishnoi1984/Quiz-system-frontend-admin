export function AnalyticsQuestionInsights({ question }) {
  if (!question) return null

  const chartType = question.chartRawType || question.rawType

  if (chartType === 'ranking') {
    const top = question.rankingAnalytics?.rankings?.[0]
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Top option (avg score)</p>
          <p className="mt-1 text-lg font-bold text-navy-900">{top?.optionText ?? '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</p>
          <p className="mt-1 text-sm text-slate-600">
            {top
              ? `Avg score ${top.averageScore} · avg rank ${top.averageRank} · ${question.rankingAnalytics?.totalResponses ?? 0} responses`
              : 'Ranking analytics appear after participants submit'}
          </p>
        </div>
      </div>
    )
  }

  if (chartType === 'emoji_reaction') {
    const top = (question.chart || []).reduce(
      (best, row) => (Number(row.count) > Number(best?.count ?? -1) ? row : best),
      null,
    )
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Leading reaction</p>
          <p className="mt-1 text-3xl leading-none">{top?.emoji || top?.name || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</p>
          <p className="mt-1 text-sm text-slate-600">
            {top
              ? `${top.count} votes · ${top.value}% of ${question.responseCount} responses`
              : 'Emoji counts appear after participants react'}
          </p>
        </div>
      </div>
    )
  }

  if (chartType === 'rating') {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average rating</p>
          <p className="mt-1 text-lg font-bold text-navy-900">
            {question.averageRating != null ? question.averageRating : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</p>
          <p className="mt-1 text-sm text-slate-600">
            {question.isSurvey
              ? 'Survey rating — not scored'
              : `Scale ${question.ratingMin}–${question.ratingMax}`}
          </p>
        </div>
      </div>
    )
  }

  if (question.isSurvey || question.correctRate == null) {
    return (
      <div className="mt-4 rounded-2xl border border-blue-200/70 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Scoring</p>
        <p className="mt-1 text-sm text-slate-600">
          {question.isSurvey
            ? 'Survey question — responses are not scored and correct answers are not shown.'
            : 'Not a scored question'}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Correct-answer rate</p>
        <p className="mt-1 text-lg font-bold text-navy-900">{`${question.correctRate}%`}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</p>
        <p className="mt-1 text-sm text-slate-600">Based on marked correct options</p>
      </div>
    </div>
  )
}
