import { BarChart3 } from 'lucide-react'
import { EmojiBarChart } from '../../../../components/emoji/EmojiBarChart'
import {
  buildParticipantSurveyResultsView,
  getParticipantResultsTitle,
} from '../../../../utils/participantSurveyResults'

function ResultBar({ label, count, percent, meta }) {
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className="shrink-0 text-xs font-semibold text-sky-800">
          {count} · {percent}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sky-100">
        <div
          className="h-full rounded-full bg-linear-to-r from-sky-500 to-blue-600 transition-all duration-300"
          style={{ width: `${Math.max(percent, count > 0 ? 4 : 0)}%` }}
        />
      </div>
      {meta ? <p className="text-[11px] text-slate-500">{meta}</p> : null}
    </div>
  )
}

export function QuestionSurveyResults({ question, results, isLoading }) {
  const view = buildParticipantSurveyResultsView(question, results)
  const resultsTitle = getParticipantResultsTitle(question)

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-sky-950">
            <BarChart3 className="mr-2 inline size-4" />
            {resultsTitle}
          </p>
          <p className="mt-1 text-xs text-sky-900/80">
            Anonymous group results · no names shown
          </p>
        </div>
        {view?.totalResponses != null ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sky-900 shadow-sm">
            {view.totalResponses} response{view.totalResponses === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-sky-900/80">Loading results…</p>
      ) : !view || view.totalResponses === 0 ? (
        <p className="mt-3 text-sm text-sky-900/80">
          Results will appear here as more people respond.
        </p>
      ) : view.kind === 'rating' ? (
        <div className="mt-4 space-y-4">
          {view.averageRating != null ? (
            <p className="text-sm font-semibold text-navy-900">
              Average rating: <span className="text-sky-800">{view.averageRating}</span>
            </p>
          ) : null}
          <div className="space-y-3">
            {view.rows.map((row) => (
              <ResultBar
                key={row.label}
                label={`★ ${row.label}`}
                count={row.count}
                percent={row.percent}
              />
            ))}
          </div>
        </div>
      ) : view.kind === 'emoji_reaction' ? (
        <div className="mt-4">
          <EmojiBarChart
            rows={view.rows.map((row) => ({
              emoji: row.label,
              count: row.count,
              percent: row.percent,
              optionId: row.label,
            }))}
            total={view.totalResponses}
            size="sm"
          />
        </div>
      ) : view.kind === 'text' ? (
        <p className="mt-3 text-sm text-sky-900/80">
          {view.totalResponses} open-text response{view.totalResponses === 1 ? '' : 's'} collected.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {view.topLabel ? (
            <p className="text-sm font-semibold text-navy-900">
              Most chosen: <span className="text-sky-800">{view.topLabel}</span>
            </p>
          ) : null}
          {view.rows.map((row) => (
            <ResultBar
              key={row.label}
              label={row.label}
              count={row.count}
              percent={row.percent}
              meta={row.meta}
            />
          ))}
        </div>
      )}
    </div>
  )
}
