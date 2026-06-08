import { CalendarClock, Clock3, PauseCircle, Radio, XCircle } from 'lucide-react'
import { PageCenteredShell } from './PageCenteredShell'
import { getSessionNotLiveCopy } from '../utils/joinFlow'
import { formatScheduledSessionForDisplay } from '../../../utils/sessionSchedule'

const TONE_STYLES = {
  waiting: {
    icon: Clock3,
    iconWrap: 'bg-sky-100 text-sky-700',
    badge: 'bg-sky-50 text-sky-900 border-sky-200',
    pulse: true,
  },
  paused: {
    icon: PauseCircle,
    iconWrap: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    pulse: false,
  },
  ended: {
    icon: XCircle,
    iconWrap: 'bg-slate-100 text-slate-600',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    pulse: false,
  },
}

export function SessionNotLiveView({
  session,
  hasSessionCodeInUrl,
  isRefreshing = false,
  onUseDifferentCode,
}) {
  const copy = getSessionNotLiveCopy(session?.status)
  const tone = TONE_STYLES[copy.tone] || TONE_STYLES.waiting
  const Icon = tone.icon
  const scheduledLabel = formatScheduledSessionForDisplay(
    session?.scheduled_date,
    session?.scheduled_time,
  )
  const showScheduledDetails = copy.tone === 'waiting' && scheduledLabel

  return (
    <PageCenteredShell maxWidth="max-w-lg">
      <div className="space-y-5">
        <div className="text-center">
          <img src="/logo.svg" alt="Logo" className="mx-auto mb-4 h-12 w-42" />
          <div
            className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full ${tone.iconWrap}`}
          >
            <Icon className={`size-7 ${tone.pulse ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-navy-900">{copy.title}</h1>
          <p className="text-sm leading-relaxed text-slate-600">{copy.message}</p>
        </div>

        <div className="rounded-2xl border border-blue-200/70 bg-blue-50/40 px-4 py-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Session</p>
          <p className="mt-1 text-lg font-bold text-navy-900">{session?.title || 'Quiz session'}</p>
          {showScheduledDetails ? (
            <div className="mt-3 rounded-xl border border-sky-200/80 bg-white/80 px-3 py-2.5">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-900">
                <CalendarClock className="size-3.5" />
                Scheduled for
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug text-navy-900">{scheduledLabel}</p>
            </div>
          ) : null}
        </div>

        {copy.pollForUpdates ? (
          <div
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${tone.badge}`}
          >
            <Radio className={`size-3.5 ${isRefreshing ? 'animate-pulse' : ''}`} />
            {isRefreshing ? 'Checking session status…' : 'Waiting for the host to open the session'}
          </div>
        ) : null}

        {!hasSessionCodeInUrl && onUseDifferentCode ? (
          <div className="text-center">
            <button
              type="button"
              onClick={onUseDifferentCode}
              className="text-sm font-semibold text-navy-700 underline-offset-2 transition hover:text-navy-900 hover:underline"
            >
              Use a different session code
            </button>
          </div>
        ) : null}
      </div>
    </PageCenteredShell>
  )
}
