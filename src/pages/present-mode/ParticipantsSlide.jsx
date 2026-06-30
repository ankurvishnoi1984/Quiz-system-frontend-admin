import { Calendar, Clock3 } from 'lucide-react'
import {
  formatScheduledDateForDisplay,
  formatScheduledTimeForDisplay,
} from '../../utils/sessionSchedule'
import { PresentSlideHeader } from './PresentShell'

function SessionInfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-4 rounded-3xl border border-blue-200/70 bg-white/95 px-[clamp(1.25rem,3vw,2rem)] py-[clamp(1rem,2.5vh,1.5rem)] shadow-md shadow-navy-900/5">
      <span className="grid size-[clamp(3rem,6vw,4rem)] shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sky-100 to-blue-100 text-sky-800">
        <Icon className="size-[clamp(1.25rem,2.5vw,1.75rem)]" strokeWidth={2} />
      </span>
      <div className="min-w-0 pt-1">
        <p className="text-[clamp(0.7rem,1.3vw,0.85rem)] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-[clamp(1.25rem,3vw,2rem)] font-bold leading-snug text-navy-900">
          {value}
        </p>
      </div>
    </div>
  )
}

export function ParticipantsSlide({
  session,
  participantCount,
  qaCount,
  isSessionLive,
  onParticipantsClick,
  onQaClick,
}) {
  const sessionTitle = session?.title || 'Live session'
  const dateLabel =
    formatScheduledDateForDisplay(session?.scheduled_date) ||
    (session?.created_at
      ? formatScheduledDateForDisplay(String(session.created_at).slice(0, 10))
      : null) ||
    'Not scheduled'
  const timeLabel = formatScheduledTimeForDisplay(session?.scheduled_time) || '—'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PresentSlideHeader
        sessionTitle={sessionTitle}
        participantCount={participantCount}
        qaCount={qaCount}
        isSessionLive={isSessionLive}
        onParticipantsClick={onParticipantsClick}
        onQaClick={onQaClick}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-[clamp(0.5rem,2vw,1.5rem)]">
        <div className="w-full max-w-3xl space-y-[clamp(1rem,3vh,1.75rem)]">
          <div className="text-center">
            <p className="text-[clamp(0.75rem,1.4vw,0.95rem)] font-semibold uppercase tracking-[0.3em] text-navy-600/80">
              Session
            </p>
            <h2 className="mt-3 text-[clamp(2rem,6vw,4rem)] font-bold leading-tight text-navy-900">
              {sessionTitle}
            </h2>
          </div>

          <div className="grid gap-[clamp(0.75rem,2vh,1.25rem)]">
            <SessionInfoRow icon={Calendar} label="Date" value={dateLabel} />
            <SessionInfoRow icon={Clock3} label="Time" value={timeLabel} />
          </div>
        </div>
      </div>
    </div>
  )
}
