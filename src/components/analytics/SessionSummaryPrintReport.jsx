import { ReportPrintHeader } from '../reports/ReportPrintHeader'

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
    <div className="host-print-only hidden bg-white text-slate-900">
      <ReportPrintHeader reportLabel="Session Summary Report" title={session.title}>
        <p>
          Host {session.host_name} · {session.department_name} · {formatDate(session.date)} ·{' '}
          {session.duration_label}
        </p>
        <p>
          Session {session.session_id} · {session.status} · Generated {generatedAt}
        </p>
      </ReportPrintHeader>

      <section className="report-print-section">
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
        <section className="report-print-section">
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

      {report.survey_question_breakdowns?.length ? (
        <section className="report-print-section">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Survey Responses</h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3 font-semibold">Q#</th>
                <th className="py-2 pr-3 font-semibold">Format</th>
                <th className="py-2 pr-3 font-semibold">Question</th>
                <th className="py-2 pr-3 font-semibold">Item</th>
                <th className="py-2 pr-3 font-semibold">Count</th>
                <th className="py-2 font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {report.survey_question_breakdowns.map((question) =>
                (question.options?.length ? question.options : [{ option_text: '—', count: 0, percent: 0 }]).map(
                  (option, index) => (
                    <tr key={`${question.question_id}-${option.option_text}-${index}`} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{index === 0 ? question.question_index : ''}</td>
                      <td className="py-2 pr-3">{index === 0 ? question.type_label || question.chart_type : ''}</td>
                      <td className="py-2 pr-3">{index === 0 ? question.question_text : ''}</td>
                      <td className="py-2 pr-3">{option.option_text}</td>
                      <td className="py-2 pr-3">{option.count}</td>
                      <td className="py-2">{option.percent}%</td>
                    </tr>
                  ),
                ),
              )}
            </tbody>
          </table>
        </section>
      ) : null}

      {report.standalone_question_breakdowns?.length ? (
        <section className="report-print-section">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Quiz, Poll & Other Questions</h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3 font-semibold">Q#</th>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 font-semibold">Question</th>
                <th className="py-2 pr-3 font-semibold">Option</th>
                <th className="py-2 pr-3 font-semibold">Count</th>
                <th className="py-2 font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {report.standalone_question_breakdowns.map((question) =>
                (question.options?.length ? question.options : [{ option_text: '—', count: 0, percent: 0 }]).map(
                  (option, index) => (
                    <tr key={`${question.question_id}-${option.option_text}-${index}`} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{index === 0 ? question.question_index : ''}</td>
                      <td className="py-2 pr-3">{index === 0 ? question.type_label || question.chart_type : ''}</td>
                      <td className="py-2 pr-3">{index === 0 ? question.question_text : ''}</td>
                      <td className="py-2 pr-3">{option.option_text}</td>
                      <td className="py-2 pr-3">{option.count}</td>
                      <td className="py-2">{option.percent}%</td>
                    </tr>
                  ),
                ),
              )}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="report-print-section">
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
