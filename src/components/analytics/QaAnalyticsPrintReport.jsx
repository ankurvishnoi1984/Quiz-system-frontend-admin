function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatStatus(status) {
  if (!status) return '—'
  return String(status).replaceAll('_', ' ')
}

export function QaAnalyticsPrintReport({ report }) {
  if (!report?.session) return null

  const { session, summary, top_questions: topQuestions, submission_ratio: submissionRatio, qa_log: qaLog } =
    report
  const generatedAt = new Date().toLocaleString()
  const visibleLog = (qaLog || []).filter((row) => row.status !== 'rejected')
  const totalSubmissions = (submissionRatio?.anonymous || 0) + (submissionRatio?.named || 0)

  return (
    <div className="analytics-print-only hidden bg-white p-8 text-slate-900">
      <header className="border-b border-slate-300 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Q&A Analytics Report</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{session.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Session {session.session_id} · {session.status} · Generated {generatedAt}
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Summary</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            ['Total asked', summary.total_asked],
            ['Approval rate', `${summary.approval_rate_percent}%`],
            ['Unanswered', summary.unanswered_count],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Anonymous vs named</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            ['Anonymous submissions', submissionRatio.anonymous],
            ['Named submissions', submissionRatio.named],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {value}
                {totalSubmissions > 0 ? (
                  <span className="ml-2 text-sm font-medium text-slate-600">
                    ({Math.round((value / totalSubmissions) * 100)}%)
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Top 5 by upvotes</h2>
        {topQuestions?.length ? (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3 font-semibold">#</th>
                <th className="py-2 pr-3 font-semibold">Question</th>
                <th className="py-2 pr-3 font-semibold">Upvotes</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {topQuestions.map((question, index) => (
                <tr key={question.qa_id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 font-semibold">{index + 1}</td>
                  <td className="py-2 pr-3">{question.question_text}</td>
                  <td className="py-2 pr-3">{question.upvotes}</td>
                  <td className="py-2 capitalize">{formatStatus(question.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No Q&A questions yet.</p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Q&A log</h2>
        <p className="mt-1 text-xs text-slate-500">Approved, answered, and pending questions (rejected excluded)</p>
        {visibleLog.length ? (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3 font-semibold">Question</th>
                <th className="py-2 pr-3 font-semibold">Submitter</th>
                <th className="py-2 pr-3 font-semibold">Upvotes</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Submitted</th>
                <th className="py-2 font-semibold">Answered</th>
              </tr>
            </thead>
            <tbody>
              {visibleLog.map((row) => (
                <tr key={row.qa_id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3">{row.question_text}</td>
                  <td className="py-2 pr-3">{row.submitter}</td>
                  <td className="py-2 pr-3">{row.upvotes}</td>
                  <td className="py-2 pr-3 capitalize">{formatStatus(row.status)}</td>
                  <td className="py-2 pr-3">{formatDate(row.submitted_at)}</td>
                  <td className="py-2">{formatDate(row.answered_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No Q&A questions yet.</p>
        )}
      </section>
    </div>
  )
}
