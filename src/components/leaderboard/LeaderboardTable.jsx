import { Crown } from 'lucide-react'

/**
 * @param {{ entries: Array<{ participant_id: number|string, name?: string, nickname?: string, score: number }>, emptyMessage?: string }} props
 */
export function LeaderboardTable({
  entries,
  emptyMessage = 'No scores yet.',
  compact = false,
}) {
  if (!entries?.length) {
    return <p className="py-4 text-center text-sm text-slate-500">{emptyMessage}</p>
  }

  const rowPadding = compact ? 'px-3 py-2' : 'px-4 py-3'
  const rankSize = compact ? 'size-8 text-sm' : 'size-9'

  return (
    <div className="space-y-2">
      {entries.map((row, idx) => (
        <div
          key={row.participant_id}
          className={`flex items-center justify-between rounded-2xl border border-amber-200/60 bg-amber-50/40 ${rowPadding}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`grid shrink-0 place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white ${rankSize}`}
            >
              {idx === 0 ? <Crown className={compact ? 'size-3.5' : 'size-4'} /> : idx + 1}
            </div>
            <p className="truncate font-semibold text-navy-900">
              {row.name || row.nickname || 'Anonymous'}
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold tabular-nums text-navy-900">{row.score}</p>
        </div>
      ))}
    </div>
  )
}
