import { Crown, Medal, Trophy } from 'lucide-react'
import { normalizeLeaderboardEntries } from '../../utils/leaderboard'

function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <span className="grid size-[clamp(2.75rem,6vw,3.75rem)] shrink-0 place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-900/25">
        <Crown className="size-[clamp(1.1rem,2.5vw,1.5rem)]" aria-hidden />
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="grid size-[clamp(2.5rem,5.5vw,3.25rem)] shrink-0 place-items-center rounded-2xl bg-linear-to-br from-slate-300 to-slate-500 text-white shadow-md">
        <Medal className="size-[clamp(1rem,2.2vw,1.35rem)]" aria-hidden />
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="grid size-[clamp(2.5rem,5.5vw,3.25rem)] shrink-0 place-items-center rounded-2xl bg-linear-to-br from-amber-700/90 to-amber-900 text-white shadow-md">
        <Medal className="size-[clamp(1rem,2.2vw,1.35rem)]" aria-hidden />
      </span>
    )
  }
  return (
    <span className="grid size-[clamp(2.25rem,5vw,3rem)] shrink-0 place-items-center rounded-xl bg-linear-to-br from-navy-700 to-navy-500 text-[clamp(0.95rem,2vw,1.2rem)] font-bold text-white tabular-nums">
      {rank}
    </span>
  )
}

function LeaderboardRow({ row, rank, maxScore, highlight }) {
  const pct = maxScore > 0 ? Math.round((row.score / maxScore) * 100) : 0

  return (
    <li
      className={`present-lb-row flex items-center gap-[clamp(0.75rem,2vw,1.25rem)] rounded-2xl border px-[clamp(0.85rem,2.5vw,1.5rem)] py-[clamp(0.65rem,1.8vh,1rem)] shadow-md transition hover:shadow-lg ${
        highlight
          ? 'border-amber-300/80 bg-linear-to-r from-amber-50/95 to-white shadow-amber-900/10'
          : 'border-blue-200/70 bg-white/95 shadow-navy-900/5'
      }`}
      style={{ animationDelay: `${(rank - 1) * 55}ms` }}
    >
      <RankBadge rank={rank} />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-semibold text-navy-900 ${
            highlight ? 'text-[clamp(1.15rem,3vw,1.65rem)]' : 'text-[clamp(1rem,2.5vw,1.35rem)]'
          }`}
        >
          {row.name}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              rank === 1
                ? 'bg-linear-to-r from-amber-400 to-amber-600'
                : 'bg-linear-to-r from-navy-600 to-navy-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p
        className={`shrink-0 font-bold tabular-nums text-navy-800 ${
          highlight ? 'text-[clamp(1.5rem,4vw,2.25rem)]' : 'text-[clamp(1.15rem,3vw,1.65rem)]'
        }`}
      >
        {row.score}
        <span className="ml-1 text-[clamp(0.65rem,1.2vw,0.8rem)] font-semibold text-slate-500">
          pts
        </span>
      </p>
    </li>
  )
}

export function PresentLeaderboardList({
  entries,
  emptyMessage = 'Scores will appear once participants submit answers.',
  title = 'Leaderboard',
  showTitle = true,
}) {
  const rows = normalizeLeaderboardEntries(entries)
  const maxScore = rows.length ? Math.max(...rows.map((r) => r.score), 1) : 1

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-blue-200/70 bg-white/90 shadow-xl shadow-navy-900/10">
      {showTitle ? (
        <div className="flex shrink-0 items-center gap-3 border-b border-blue-100/80 px-[clamp(1rem,3vw,1.75rem)] py-[clamp(0.75rem,2vh,1rem)]">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <Trophy className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-[clamp(0.7rem,1.3vw,0.8rem)] font-semibold uppercase tracking-wider text-slate-500">
              {title}
            </p>
            <p className="text-[clamp(0.95rem,1.8vw,1.1rem)] font-semibold text-navy-800">
              {rows.length} participant{rows.length === 1 ? '' : 's'} ranked
            </p>
          </div>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="present-lb-list min-h-0 flex-1 space-y-[clamp(0.45rem,1.2vh,0.75rem)] overflow-y-auto p-[clamp(0.75rem,2vw,1.25rem)]">
          {rows.map((row, idx) => (
            <LeaderboardRow
              key={row.participant_id}
              row={row}
              rank={idx + 1}
              maxScore={maxScore}
              highlight={idx === 0}
            />
          ))}
        </ul>
      ) : (
        <p className="flex flex-1 items-center justify-center p-8 text-center text-[clamp(1rem,2vw,1.25rem)] text-slate-500">
          {emptyMessage}
        </p>
      )}
    </div>
  )
}
