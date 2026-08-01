import { PresentSlideHeader } from './PresentShell'
import { PresentJoinPanel } from './PresentJoinInfo'

export function ParticipantsSlide({
  session,
  participantCount,
  qaCount,
  isSessionLive,
  onParticipantsClick,
  onOverallRankingsClick,
  overallRankingsActive = false,
  onQaClick,
  readOnly = false,
}) {
  const sessionTitle = session?.title || 'Live session'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PresentSlideHeader
        sessionTitle={sessionTitle}
        participantCount={participantCount}
        qaCount={qaCount}
        isSessionLive={isSessionLive}
        onParticipantsClick={onParticipantsClick}
        onOverallRankingsClick={onOverallRankingsClick}
        overallRankingsActive={overallRankingsActive}
        onQaClick={onQaClick}
        readOnly={readOnly}
      />

      <PresentJoinPanel session={session} />
    </div>
  )
}
