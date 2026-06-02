export function AnalyticsQuestionInsights({ question }) {
  if (!question) return null

  if (question.rawType === 'ranking') {
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

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Correct-answer rate</p>
        <p className="mt-1 text-lg font-bold text-navy-900">
          {question.correctRate == null ? '—' : `${question.correctRate}%`}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</p>
        <p className="mt-1 text-sm text-slate-600">
          {question.correctRate == null
            ? 'Not a scored question'
            : 'Based on marked correct options'}
        </p>
      </div>
    </div>
  )
}
