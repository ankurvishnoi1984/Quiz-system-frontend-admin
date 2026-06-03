function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function SessionSummaryPrintReport({ report }) {
  if (!report?.session) return null

  const { session, summary, qa_summary: qaSummary, quiz_stats: quizStats, response_timeline: timeline } =
    report
  const generatedAt = new Date().toLocaleString()
  const maxTimelineCount = Math.max(1, ...(timeline || []).map((row) => row.count))

  return (
    <div className="analytics-print-only hidden bg-white p-8 text-slate-900">
      <header className="border-b border-slate-300 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Session Summary Report</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{session.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Host {session.host_name} · {session.department_name} · {formatDate(session.date)} ·{' '}
          {session.duration_label}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Session {session.session_id} · {session.status} · Generated {generatedAt}
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Summary</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            ['Total joined', summary.total_joined.toLocaleString()],
            ['Total responded', summary.total_responded.toLocaleString()],
            ['Avg engagement rate', `${summary.avg_engagement_rate_percent}%`],
            ['Questions activated', `${summary.total_questions_activated} / ${summary.total_questions}`],
            ['Q&A asked', qaSummary.asked],
            ['Q&A approved', qaSummary.approved],
            ['Q&A answered', qaSummary.answered],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {quizStats?.has_quiz_mode ? (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Quiz scores</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              ['Top score', quizStats.top_score],
              ['Average score', quizStats.avg_score],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Response timeline</h2>
        {timeline?.length ? (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3 font-semibold">Time</th>
                <th className="py-2 pr-3 font-semibold">Responses</th>
                <th className="py-2 font-semibold">Activity</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((row) => {
                const barWidth = Math.round((row.count / maxTimelineCount) * 100)
                return (
                  <tr key={row.bucket_start} className="border-b border-slate-100">
                    <td className="py-2 pr-3">{row.bucket_label}</td>
                    <td className="py-2 pr-3 font-semibold">{row.count}</td>
                    <td className="py-2">
                      <div className="h-3 rounded bg-slate-100">
                        <div
                          className="h-3 rounded bg-slate-700"
                          style={{ width: `${barWidth}%`, minWidth: row.count > 0 ? '4px' : 0 }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No response activity recorded for this session.</p>
        )}
      </section>
    </div>
  )
}
