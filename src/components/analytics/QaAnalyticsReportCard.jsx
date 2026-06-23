// Pie chart (Anonymous vs named) — disabled; restore when re-enabling chart below:
// import { CHART_COLORS, CHART_TOOLTIP_STYLE } from '../../utils/chartColors'
// import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
// import { renderPieLabel } from '../charts/renderPieLabel'

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-blue-200/70 bg-white p-4 shadow-sm shadow-blue-900/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-navy-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  )
}

export function QaAnalyticsReportCard({ report, isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-8 text-center text-sm text-slate-600 shadow-sm">
        Loading Q&A analytics…
      </div>
    )
  }

  if (!report) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-200 bg-white/80 p-8 text-center text-sm text-slate-600">
        Q&A analytics are not available for this session.
      </div>
    )
  }

  const { summary, top_questions: topQuestions, submission_ratio: submissionRatio } = report
  // Pie chart data — kept for future use (see commented chart block below)
  // const donutData = [
  //   { name: 'Anonymous', value: submissionRatio.anonymous },
  //   { name: 'Named', value: submissionRatio.named },
  // ].filter((row) => row.value > 0)

  return (
    <div className="space-y-5 rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Q&A Analytics Report</p>
        <p className="mt-1 text-sm text-slate-600">
          Audience questions · rejected items appear only in Excel export
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Total asked" value={summary.total_asked} hint="All submissions" />
        {/* <StatTile
          label="Approval rate"
          value={`${summary.approval_rate_percent}%`}
          hint="Approved, answered, or pinned"
        /> */}
        {/* <StatTile
          label="Unanswered"
          value={summary.unanswered_count}
          hint="Pending, approved, or pinned"
        /> */}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* <div>
          <p className="text-sm font-semibold text-navy-900">Top 5 by upvotes</p>
          {topQuestions?.length ? (
            <ol className="mt-3 space-y-2">
              {topQuestions.map((question, index) => (
                <li
                  key={question.qa_id}
                  className="rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-navy-700">#{index + 1}</span>
                    <span className="text-xs font-semibold text-slate-600">{question.upvotes} upvotes</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-navy-900">{question.question_text}</p>
                  <p className="mt-1 text-xs capitalize text-slate-500">{question.status}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No Q&A questions yet.</p>
          )}
        </div> */}

        <div>
          {/* <p className="text-sm font-semibold text-navy-900">Anonymous vs named</p>
          <p className="text-xs text-slate-600">
            {submissionRatio.anonymous} anonymous · {submissionRatio.named} named
          </p> */}
          {/*
          <div className="mt-3 h-56">
            {donutData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    formatter={(value) => (
                      <span className="text-xs font-medium text-slate-600">{value}</span>
                    )}
                  />
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={88}
                    innerRadius={48}
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={2}
                    label={renderPieLabel}
                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-blue-200 text-sm text-slate-600">
                No submissions yet
              </div>
            )}
          </div>
          */}
        </div>
      </div>
    </div>
  )
}
