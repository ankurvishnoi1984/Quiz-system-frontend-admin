import { Trophy } from 'lucide-react'
import { PresentLeaderboardList } from './PresentLeaderboardList'
import { PresentSlideHeader } from './PresentShell'

export function LeaderboardSlide({
  sessionTitle,
  leaderboard,
  participantCount,
  isSessionLive,
  onParticipantsClick,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PresentSlideHeader
        sessionTitle={sessionTitle}
        participantCount={participantCount}
        isSessionLive={isSessionLive}
        onParticipantsClick={onParticipantsClick}
      />

      <div className="mb-[clamp(0.75rem,2vh,1.25rem)] flex shrink-0 items-center justify-center gap-3">
        <Trophy className="size-[clamp(2rem,5vw,3rem)] text-amber-500" aria-hidden />
        <h2 className="text-[clamp(2rem,6vw,3.5rem)] font-bold text-navy-900">Session leaderboard</h2>
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
