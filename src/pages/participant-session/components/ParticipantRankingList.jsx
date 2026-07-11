import { Clock3, Crown } from 'lucide-react'
import { normalizeLeaderboardEntries } from '../../../utils/leaderboard'
import { formatQuizSubmitTimeParticipant } from '../../../utils/quizResponseTime'

const TIME_HINTS = {
  question: 'Time taken on this question · e.g. 7.123 s/ms',
  session: 'Average time across answered questions · e.g. 7.123 s/ms',
}

function RankingTimeBadge({ responseTimeMs, timeMode }) {
  if (responseTimeMs == null) {
    return <span className="text-[11px] font-medium text-slate-400">—</span>
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-slate-600 ring-1 ring-amber-200/70"
      title={
        timeMode === 'session'
          ? 'Average response time across all answered questions'
          : 'Time taken to answer this question'
      }
    >
      <Clock3 className="size-3 shrink-0 text-slate-400" aria-hidden />
      {timeMode === 'session' ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">avg</span>
      ) : null}
      {formatQuizSubmitTimeParticipant(responseTimeMs)}
    </span>
  )
}

export function ParticipantRankingList({
  entries,
  emptyMessage = 'No rankings yet.',
  timeMode = 'question',
  limit = null,
  compact = false,
}) {
  const rows = normalizeLeaderboardEntries(entries)
  const visibleRows = limit != null ? rows.slice(0, limit) : rows
  const hasAnyTime = visibleRows.some((row) => row.responseTimeMs != null)

  if (!visibleRows.length) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>
  }

  const rowPadding = compact ? 'px-3 py-2' : 'px-4 py-3'

  return (
    <div className="space-y-2">
      {visibleRows.map((row, idx) => (
        <div
          key={row.participant_id}
          className={`flex items-center justify-between gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/40 ${rowPadding}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-linear-to-br from-amber-400 to-amber-600 text-sm font-bold text-white">
              {idx === 0 ? <Crown className="size-3.5" aria-hidden /> : idx + 1}
            </div>
            <p className="truncate font-semibold text-navy-900">{row.name}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <p className="text-sm font-bold tabular-nums text-amber-800">
              {row.score}
              <span className="ml-1 text-xs font-semibold text-amber-700/80">pts</span>
            </p>
            <RankingTimeBadge responseTimeMs={row.responseTimeMs} timeMode={timeMode} />
          </div>
        </div>
      ))}

      {hasAnyTime ? (
        <p className="pt-1 text-center text-xs text-slate-500">{TIME_HINTS[timeMode]}</p>
      ) : null}
    </div>
  )
}
