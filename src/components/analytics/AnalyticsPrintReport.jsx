import { ReportPrintHeader } from '../reports/ReportPrintHeader'

function formatRankingTopOption(question) {
  const top = question.rankingAnalytics?.rankings?.[0]
  if (!top) return '—'
  return `${top.optionText} (avg ${top.averageScore})`
}

export function AnalyticsPrintReport({ sessionMeta, summary, perQuestion, leaderboard }) {
  if (!sessionMeta) return null

  const generatedAt = new Date().toLocaleString()

  return (
    <>
      <ReportPrintHeader reportLabel="Session Analytics Report" title={sessionMeta.title}>
        <p>
          Session {sessionMeta.id} · {sessionMeta.status}
        </p>
        <p>Generated {generatedAt}</p>
      </ReportPrintHeader>

      <section className="report-print-section">
        <h2>Summary</h2>
        <div className="report-print-grid">
          {[
            ['Total joined', summary.joined.toLocaleString()],
            ['Total responded', summary.responded.toLocaleString()],
            ['Avg response rate', `${summary.avg}%`],
            ['Session duration', summary.duration],
          ].map(([label, value]) => (
            <div key={label} className="report-print-card">
              <p className="report-print-card-label">{label}</p>
              <p className="report-print-card-value">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="report-print-section">
        <h2>Questions</h2>
        <table className="report-print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Question</th>
              <th>Responses</th>
              <th>Insight</th>
            </tr>
          </thead>
          <tbody>
            {perQuestion.map((q) => (
              <tr key={q.id}>
                <td>Q{q.index}</td>
                <td>{q.typeLabel || q.type}</td>
                <td>{q.text || 'Untitled'}</td>
                <td>{q.responseCount}</td>
                <td>
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
                <td colSpan={5} className="report-print-empty">
                  No questions in this session.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="report-print-section">
        <h2>Top participants</h2>
        {leaderboard.length ? (
          <table className="report-print-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, idx) => (
                <tr key={`${row.name}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="report-print-empty">No scored responses.</p>
        )}
      </section>
    </>
  )
}
