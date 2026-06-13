function formatRankingTopOption(question) {
  const top = question.rankingAnalytics?.rankings?.[0]
  if (!top) return '—'
  return `${top.optionText} (avg ${top.averageScore})`
}

export function AnalyticsPrintReport({ sessionMeta, summary, perQuestion, leaderboard }) {
  if (!sessionMeta) return null

  const generatedAt = new Date().toLocaleString()

  return (
    <div className="analytics-print-only hidden bg-white p-8 text-slate-900">
      <header className="border-b border-slate-300 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Session Analytics Report</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{sessionMeta.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Session {sessionMeta.id} · {sessionMeta.status} · Generated {generatedAt}
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Summary</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            ['Total joined', summary.joined.toLocaleString()],
            ['Total responded', summary.responded.toLocaleString()],
            ['Avg response rate', `${summary.avg}%`],
            ['Session duration', summary.duration],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Questions</h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-2 pr-3 font-semibold">#</th>
              <th className="py-2 pr-3 font-semibold">Type</th>
              <th className="py-2 pr-3 font-semibold">Question</th>
              <th className="py-2 pr-3 font-semibold">Responses</th>
              <th className="py-2 font-semibold">Insight</th>
            </tr>
          </thead>
          <tbody>
            {perQuestion.map((q) => (
              <tr key={q.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3 font-semibold">Q{q.index}</td>
                <td className="py-2 pr-3">{q.typeLabel || q.type}</td>
                <td className="py-2 pr-3">{q.text || 'Untitled'}</td>
                <td className="py-2 pr-3">{q.responseCount}</td>
                <td className="py-2">
                  {(q.chartRawType || q.rawType) === 'ranking'
                    ? formatRankingTopOption(q)
                    : (q.chartRawType || q.rawType) === 'rating' && q.averageRating != null
                      ? `Avg ${q.averageRating}`
                      : q.isSurvey || q.correctRate == null
                        ? '—'
                        : `${q.correctRate}% correct`}
                </td>
              </tr>
            ))}
            {!perQuestion.length ? (
              <tr>
                <td colSpan={5} className="py-4 text-slate-500">
                  No questions in this session.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Top participants</h2>
        {leaderboard.length ? (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3 font-semibold">Rank</th>
                <th className="py-2 pr-3 font-semibold">Name</th>
                <th className="py-2 font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, idx) => (
                <tr key={`${row.name}-${idx}`} className="border-b border-slate-100">
                  <td className="py-2 pr-3">{idx + 1}</td>
                  <td className="py-2 pr-3">{row.name}</td>
                  <td className="py-2">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No scored responses.</p>
        )}
      </section>
    </div>
  )
}
