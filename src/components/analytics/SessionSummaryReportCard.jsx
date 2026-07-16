import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { QuestionBreakdownTables } from './QuestionBreakdownTables'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-4 shadow-sm shadow-blue-900/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-navy-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  )
}

export function SessionSummaryReportCard({ report, isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-8 text-center text-sm text-slate-600 shadow-sm">
        Loading session summary report…
      </div>
    )
  }

  if (!report) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-200 bg-white/80 p-8 text-center text-sm text-slate-600">
        Session summary report is not available.
      </div>
    )
  }

  const {
    session,
    summary,
    // qa_summary: qaSummary, // Q&A feature disabled
    quiz_stats: quizStats,
    response_timeline: timeline,
  } = report

  return (
    <div className="space-y-5 rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">
            Session Summary Report
          </p>
          <h3 className="mt-1 text-xl font-bold text-navy-900">{session.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Host {session.host_name} · {session.department_name} · {formatDate(session.date)} ·{' '}
            {session.duration_label}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-navy-700">
          {session.status}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total joined"
          value={summary.total_joined.toLocaleString()}
          hint="Participants who entered the session"
        />
        <StatTile
          label="Avg engagement"
          value={`${summary.avg_engagement_rate_percent}%`}
          hint="Average response rate across activated questions"
        />
        <StatTile
          label="Questions activated"
          value={summary.total_questions_activated}
          hint={`${summary.total_questions} total in session`}
        />
        {/* Q&A feature disabled — re-enable when bringing Q&A back
        <StatTile
          label="Q&A"
          value={`${qaSummary.asked} asked`}
          hint={`${qaSummary.approved} approved · ${qaSummary.answered} answered`}
        />
        */}
      </div>

      {quizStats?.has_quiz_mode ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile label="Top score" value={quizStats.top_score} hint="Highest participant score" />
          <StatTile label="Average score" value={quizStats.avg_score} hint="Across all participants" />
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-navy-900">Response timeline</p>
            <p className="text-xs text-slate-600">Responses submitted over time during the session</p>
          </div>
        </div>

        {timeline?.length ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" />
                <XAxis
                  dataKey="bucket_label"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  formatter={(value) => [value, 'Responses']}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #bfdbfe',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#1e3a5f" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-blue-200 bg-white/80 p-8 text-center text-sm text-slate-600">
            No response activity recorded for this session yet.
          </div>
        )}
      </div>

      <QuestionBreakdownTables
        surveyQuestions={report.survey_question_breakdowns}
        standaloneQuestions={report.standalone_question_breakdowns}
      />
    </div>
  )
}
