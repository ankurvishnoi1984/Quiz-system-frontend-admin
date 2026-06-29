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
    <>
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
        <h2>Summary</h2>
        <div className="report-print-grid">
          {[
            ['Total joined', summary.total_joined.toLocaleString()],
            ['Total responded', summary.total_responded.toLocaleString()],
            ['Avg engagement rate', `${summary.avg_engagement_rate_percent}%`],
            ['Questions activated', `${summary.total_questions_activated} / ${summary.total_questions}`],
            ['Q&A asked', qaSummary.asked],
            ['Q&A approved', qaSummary.approved],
            ['Q&A answered', qaSummary.answered],
          ].map(([label, value]) => (
            <div key={label} className="report-print-card">
              <p className="report-print-card-label">{label}</p>
              <p className="report-print-card-value">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {quizStats?.has_quiz_mode ? (
        <section className="report-print-section">
          <h2>Quiz scores</h2>
          <div className="report-print-grid">
            {[
              ['Top score', quizStats.top_score],
              ['Average score', quizStats.avg_score],
            ].map(([label, value]) => (
              <div key={label} className="report-print-card">
                <p className="report-print-card-label">{label}</p>
                <p className="report-print-card-value">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {report.survey_question_breakdowns?.length ? (
        <section className="report-print-section">
          <h2>Survey Responses</h2>
          <table className="report-print-table">
            <thead>
              <tr>
                <th>Q#</th>
                <th>Format</th>
                <th>Question</th>
                <th>Item</th>
                <th>Count</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {report.survey_question_breakdowns.map((question) =>
                (question.options?.length ? question.options : [{ option_text: '—', count: 0, percent: 0 }]).map(
                  (option, index) => (
                    <tr key={`${question.question_id}-${option.option_text}-${index}`}>
                      <td>{index === 0 ? question.question_index : ''}</td>
                      <td>{index === 0 ? question.type_label || question.chart_type : ''}</td>
                      <td>{index === 0 ? question.question_text : ''}</td>
                      <td>{option.option_text}</td>
                      <td>{option.count}</td>
                      <td>{option.percent}%</td>
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
          <h2>Quiz, Poll & Other Questions</h2>
          <table className="report-print-table">
            <thead>
              <tr>
                <th>Q#</th>
                <th>Type</th>
                <th>Question</th>
                <th>Option</th>
                <th>Count</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {report.standalone_question_breakdowns.map((question) =>
                (question.options?.length ? question.options : [{ option_text: '—', count: 0, percent: 0 }]).map(
                  (option, index) => (
                    <tr key={`${question.question_id}-${option.option_text}-${index}`}>
                      <td>{index === 0 ? question.question_index : ''}</td>
                      <td>{index === 0 ? question.type_label || question.chart_type : ''}</td>
                      <td>{index === 0 ? question.question_text : ''}</td>
                      <td>{option.option_text}</td>
                      <td>{option.count}</td>
                      <td>{option.percent}%</td>
                    </tr>
                  ),
                ),
              )}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="report-print-section">
        <h2>Response timeline</h2>
        {timeline?.length ? (
          <table className="report-print-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Responses</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((row) => {
                const barWidth = Math.round((row.count / maxTimelineCount) * 100)
                return (
                  <tr key={row.bucket_start}>
                    <td>{row.bucket_label}</td>
                    <td>{row.count}</td>
                    <td>
                      <div className="report-print-bar">
                        <div
                          className="report-print-bar-fill"
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
          <p className="report-print-empty">No response activity recorded for this session.</p>
        )}
      </section>
    </>
  )
}
