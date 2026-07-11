import { Trophy } from 'lucide-react'
import { ParticipantRankingList } from './ParticipantRankingList'

export function OverallLeaderboardPanel({
  leaderboard,
  hasAnyQuestionSaved,
  sessionStatus,
  isLoading = false,
}) {
  const canShowScores = hasAnyQuestionSaved || sessionStatus === 'completed'

  return (
    <section className="space-y-4 rounded-2xl border border-blue-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Trophy className="size-5 text-amber-600" aria-hidden />
        <h2 className="text-xl font-bold text-navy-900">Overall Rankings</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-600">Loading rankings…</p>
      ) : !canShowScores ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The rankings will appear after participants submit responses.
        </p>
      ) : (
        <ParticipantRankingList
          entries={leaderboard}
          timeMode="session"
          emptyMessage="No scores yet. Rankings update as participants answer quiz questions."
        />
      )}
    </section>
  )
}
