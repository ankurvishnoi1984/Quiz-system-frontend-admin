import { ReportPrintHeader } from '../reports/ReportPrintHeader'

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
    <>
      <ReportPrintHeader reportLabel="Q&A Analytics Report" title={session.title}>
        <p>
          Session {session.session_id} · {session.status}
        </p>
        <p>Generated {generatedAt}</p>
      </ReportPrintHeader>

      <section className="report-print-section">
        <h2>Summary</h2>
        <div className="report-print-grid report-print-grid--3">
          {[
            ['Total asked', summary.total_asked],
            ['Approval rate', `${summary.approval_rate_percent}%`],
            ['Unanswered', summary.unanswered_count],
          ].map(([label, value]) => (
            <div key={label} className="report-print-card">
              <p className="report-print-card-label">{label}</p>
              <p className="report-print-card-value">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="report-print-section">
        <h2>Anonymous vs named</h2>
        <div className="report-print-grid">
          {[
            ['Anonymous submissions', submissionRatio.anonymous],
            ['Named submissions', submissionRatio.named],
          ].map(([label, value]) => (
            <div key={label} className="report-print-card">
              <p className="report-print-card-label">{label}</p>
              <p className="report-print-card-value">
                {value}
                {totalSubmissions > 0 ? (
                  <span className="report-print-card-hint">
                    ({Math.round((value / totalSubmissions) * 100)}%)
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="report-print-section">
        <h2>Top 5 by upvotes</h2>
        {topQuestions?.length ? (
          <table className="report-print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Upvotes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {topQuestions.map((question, index) => (
                <tr key={question.qa_id}>
                  <td>{index + 1}</td>
                  <td>{question.question_text}</td>
                  <td>{question.upvotes}</td>
                  <td className="report-print-capitalize">{formatStatus(question.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="report-print-empty">No Q&A questions yet.</p>
        )}
      </section>

      <section className="report-print-section">
        <h2>Q&A log</h2>
        <p className="report-print-note">Approved, answered, and pending questions (rejected excluded)</p>
        {visibleLog.length ? (
          <table className="report-print-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Submitter</th>
                <th>Upvotes</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Answered</th>
              </tr>
            </thead>
            <tbody>
              {visibleLog.map((row) => (
                <tr key={row.qa_id}>
                  <td>{row.question_text}</td>
                  <td>{row.submitter}</td>
                  <td>{row.upvotes}</td>
                  <td className="report-print-capitalize">{formatStatus(row.status)}</td>
                  <td>{formatDate(row.submitted_at)}</td>
                  <td>{formatDate(row.answered_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="report-print-empty">No Q&A questions yet.</p>
        )}
      </section>
    </>
  )
}
