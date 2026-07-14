import { Trophy } from 'lucide-react'
import { PresentLeaderboardList } from '../present-mode/PresentLeaderboardList'
import { PreviewHeader } from './PreviewShell'

export function PreviewRankingSlide({ sessionTitle, leaderboard }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PreviewHeader sessionTitle={sessionTitle} />

      <div className="mb-[clamp(0.75rem,2vh,1.25rem)] flex shrink-0 flex-col items-center justify-center gap-1">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="size-[clamp(2rem,5vw,3rem)] text-amber-500" aria-hidden />
          <h2 className="text-[clamp(2rem,6vw,3.5rem)] font-bold text-navy-900">Session rankings</h2>
        </div>
        <p className="text-[clamp(0.85rem,1.8vw,1rem)] font-medium text-slate-500">Top 10</p>
      </div>

      <PresentLeaderboardList
        entries={leaderboard}
        title="Top scores"
        showTitle={false}
        emptyMessage="Scores will appear once participants submit answers."
      />
    </div>
  )
}
