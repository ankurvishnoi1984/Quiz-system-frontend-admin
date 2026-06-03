import { Download, Loader2 } from 'lucide-react'

function formatAvgTime(seconds) {
  if (seconds == null) return '—'
  return `${seconds}s`
}

export function ParticipantLeaderboardTable({
  leaderboard,
  isLoading,
  onExport,
  isExporting,
}) {
  return (
    <div className="rounded-2xl border border-amber-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Per-participant report
          </p>
          <h3 className="mt-1 text-lg font-bold text-navy-900">Participant leaderboard</h3>
          <p className="mt-1 text-xs text-slate-600">Top 20 by score · export includes every participant</p>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting || isLoading}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-amber-300/80 bg-amber-50 px-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export Excel
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-600">Loading participant report…</p>
      ) : leaderboard?.length ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-amber-200/60">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-amber-200 bg-amber-50/80 text-left">
                <th className="px-3 py-2.5 font-semibold text-slate-700">Rank</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">Nickname</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">Answered</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">Correct</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">Score</th>
                <th className="px-3 py-2.5 font-semibold text-slate-700">Avg time</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.participant_id} className="border-b border-amber-100/80 last:border-b-0">
                  <td className="px-3 py-2.5 font-bold text-navy-900">{row.rank}</td>
                  <td className="px-3 py-2.5 font-semibold text-navy-900">{row.nickname}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.questions_answered}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.correct_count}</td>
                  <td className="px-3 py-2.5 font-bold text-navy-900">{row.total_score}</td>
                  <td className="px-3 py-2.5 text-slate-700">{formatAvgTime(row.avg_response_time_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">No participant responses yet.</p>
      )}
    </div>
  )
}
