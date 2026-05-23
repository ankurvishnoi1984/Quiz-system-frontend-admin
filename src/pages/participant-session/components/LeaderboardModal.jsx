import { Crown, XCircle } from 'lucide-react'

export function LeaderboardModal({ open, leaderboard, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-navy-950/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close leaderboard"
      />
      <div className="relative mx-auto mt-20 w-[min(92vw,520px)] rounded-2xl border border-amber-200/70 bg-white p-5 shadow-2xl shadow-blue-900/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Leaderboard</p>
            <h3 className="mt-1 text-xl font-bold text-navy-900">Top Participants</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-amber-200/70 p-2 text-slate-600 transition hover:bg-amber-50"
            aria-label="Close"
          >
            <XCircle className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {leaderboard.map((row, idx) => (
            <div
              key={row.participant_id}
              className="flex items-center justify-between rounded-2xl border border-amber-200/60 bg-amber-50/40 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white">
                  {idx === 0 ? <Crown className="size-4" /> : idx + 1}
                </div>
                <p className="font-semibold text-navy-900">{row.name || row.nickname || 'Anonymous'}</p>
              </div>
              <p className="text-sm font-bold text-navy-900">{row.score}</p>
            </div>
          ))}
          {!leaderboard.length ? (
            <p className="py-4 text-center text-sm text-slate-500">No scores yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
