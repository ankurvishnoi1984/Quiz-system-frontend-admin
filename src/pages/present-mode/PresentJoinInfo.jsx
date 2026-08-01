import { useEffect, useState } from 'react'
import { Calendar, Clock3, Link2, QrCode } from 'lucide-react'
import {
  buildGenericJoinUrl,
  buildSessionJoinUrl,
  normalizeSessionCode,
} from '../../utils/joinUrl'
import {
  formatScheduledDateForDisplay,
  formatScheduledTimeForDisplay,
} from '../../utils/sessionSchedule'

function usePresentJoinInfo(session) {
  const sessionCode = normalizeSessionCode(session?.session_code)
  const directJoinUrl = sessionCode ? buildSessionJoinUrl(sessionCode) : ''
  const joinPageUrl = buildGenericJoinUrl()
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    const qrTarget = directJoinUrl || joinPageUrl
    if (!qrTarget) {
      setQrDataUrl('')
      return undefined
    }
    import('qrcode')
      .then((QRCode) =>
        QRCode.toDataURL(qrTarget, {
          margin: 1,
          width: 420,
          color: { dark: '#0a1f2e', light: '#ffffff' },
        }),
      )
      .then((data) => {
        if (!cancelled) setQrDataUrl(data)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [directJoinUrl, joinPageUrl])

  return { sessionCode, directJoinUrl, joinPageUrl, qrDataUrl }
}

function SessionMetaRow({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-blue-200/70 bg-white/95 px-[clamp(0.85rem,2vw,1.25rem)] py-[clamp(0.65rem,1.5vh,0.9rem)] shadow-sm shadow-navy-900/5">
      <span className="grid size-[clamp(2.5rem,5vw,3rem)] shrink-0 place-items-center rounded-xl bg-linear-to-br from-sky-100 to-blue-100 text-sky-800">
        <Icon className="size-[clamp(1.1rem,2.2vw,1.35rem)]" strokeWidth={2} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[clamp(0.65rem,1.2vw,0.75rem)] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 break-words text-[clamp(1rem,2.2vw,1.35rem)] font-bold leading-snug text-navy-900">
          {value}
        </p>
      </div>
    </div>
  )
}

function JoinLinkBlock({ label, hint, url, compact = false }) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-blue-100 bg-slate-50/90 ${
        compact ? 'px-2.5 py-1.5' : 'rounded-2xl px-3 py-2'
      }`}
    >
      <p className="text-[clamp(0.55rem,1vw,0.65rem)] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-0.5 break-all font-semibold leading-snug text-navy-800 ${
          compact
            ? 'text-[clamp(0.65rem,1.15vw,0.8rem)]'
            : 'text-[clamp(0.75rem,1.35vw,0.9rem)]'
        }`}
      >
        {url || '—'}
      </p>
      {hint && !compact ? (
        <p className="mt-0.5 text-[clamp(0.65rem,1.1vw,0.75rem)] text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * Join info strip / panel.
 * - banner: top strip on non-question slides
 * - column: equal third panel beside Results & Responses
 */
export function PresentJoinBar({ session, placement = 'banner' }) {
  const { sessionCode, directJoinUrl, joinPageUrl, qrDataUrl } = usePresentJoinInfo(session)
  const isColumn = placement === 'column'
  const isSidebar = placement === 'sidebar'

  if (!sessionCode && !joinPageUrl && !directJoinUrl) return null

  if (isColumn) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-blue-200/70 bg-white/90 shadow-xl shadow-navy-900/10">
        <div className="shrink-0 border-b border-blue-100/80 px-2.5 py-2 sm:px-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
            How to join
          </p>
          <p className="text-[0.8rem] font-semibold leading-snug text-navy-800">Scan or link</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3">
          <div className="mx-auto grid size-[clamp(8.5rem,18vw,12rem)] shrink-0 place-items-center overflow-hidden rounded-2xl border border-blue-100 bg-white">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scan to join" className="size-full object-contain p-2" />
            ) : (
              <QrCode className="size-10 text-slate-400" aria-hidden />
            )}
          </div>

          <div className="min-w-0 rounded-xl border border-blue-100 bg-slate-50/90 px-2 py-1.5 text-center">
            <p className="text-[0.55rem] font-semibold uppercase tracking-wider text-slate-500">
              Session code
            </p>
            <p className="mt-0.5 break-all font-mono text-[clamp(0.95rem,1.6vw,1.2rem)] font-bold tracking-[0.12em] text-navy-900">
              {sessionCode || '—'}
            </p>
          </div>

          <JoinLinkBlock label="Join page" url={joinPageUrl} compact />
          <JoinLinkBlock label="Direct join link" url={directJoinUrl} compact />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`w-full min-w-0 max-w-full shrink-0 overflow-hidden border border-blue-200/70 bg-white/95 shadow-md shadow-navy-900/5 ${
        isSidebar ? 'rounded-2xl px-2.5 py-2' : 'rounded-2xl px-3 py-2.5 sm:px-4'
      }`}
    >
      <div
        className={`grid min-w-0 gap-2 ${
          isSidebar
            ? 'grid-cols-[auto_minmax(0,1fr)] items-start'
            : 'grid-cols-1 gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-blue-100 bg-white ${
              isSidebar ? 'size-12' : 'size-14 sm:size-16'
            }`}
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scan to join" className="size-full object-contain p-0.5" />
            ) : (
              <QrCode className="size-4 text-slate-400" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">
              Session code
            </p>
            <p
              className={`mt-0.5 font-mono font-bold tracking-[0.14em] text-navy-900 ${
                isSidebar
                  ? 'text-[clamp(0.95rem,1.8vw,1.25rem)]'
                  : 'text-[clamp(1.15rem,2.5vw,1.65rem)]'
              }`}
            >
              {sessionCode || '—'}
            </p>
          </div>
        </div>

        <div className={`grid min-w-0 gap-1.5 ${isSidebar ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
          <JoinLinkBlock
            label="Join page"
            hint="Enter the code on this page"
            url={joinPageUrl}
            compact={isSidebar}
          />
          <JoinLinkBlock
            label="Direct join link"
            hint="Opens this session"
            url={directJoinUrl}
            compact={isSidebar}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Full join panel for the opening Present Mode slide.
 */
export function PresentJoinPanel({ session, className = '' }) {
  const { sessionCode, directJoinUrl, joinPageUrl, qrDataUrl } = usePresentJoinInfo(session)
  const sessionTitle = session?.title || 'Live session'
  const dateLabel =
    formatScheduledDateForDisplay(session?.scheduled_date) ||
    (session?.created_at
      ? formatScheduledDateForDisplay(String(session.created_at).slice(0, 10))
      : null) ||
    'Not scheduled'
  const timeLabel = formatScheduledTimeForDisplay(session?.scheduled_time) || '—'

  return (
    <div
      className={`flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-x-hidden px-[clamp(0.5rem,2vw,1.5rem)] ${className}`}
    >
      <div className="w-full min-w-0 max-w-6xl">
        <div className="mb-[clamp(1rem,3vh,1.75rem)] text-center">
          <p className="text-[clamp(0.75rem,1.4vw,0.95rem)] font-semibold uppercase tracking-[0.3em] text-navy-600/80">
            How to join
          </p>
          <h2 className="mt-2 text-[clamp(1.75rem,5vw,3.25rem)] font-bold leading-tight text-navy-900">
            {sessionTitle}
          </h2>
          <p className="mt-2 text-[clamp(0.95rem,1.8vw,1.2rem)] text-slate-600">
            Open the join page and enter the code, use the direct link, or scan the QR code.
          </p>
        </div>

        <div className="mb-[clamp(0.75rem,2vh,1.25rem)] grid min-w-0 gap-[clamp(0.65rem,1.5vh,0.85rem)] sm:grid-cols-2">
          <SessionMetaRow icon={Calendar} label="Date" value={dateLabel} />
          <SessionMetaRow icon={Clock3} label="Time" value={timeLabel} />
        </div>

        <div className="grid min-w-0 items-stretch gap-[clamp(1rem,3vw,2rem)] lg:grid-cols-[minmax(14rem,20rem)_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-blue-200/70 bg-white/95 p-[clamp(1rem,2.5vw,1.75rem)] shadow-xl shadow-navy-900/10">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code to join this session"
                className="aspect-square w-full max-w-[min(100%,16rem)] rounded-2xl"
              />
            ) : (
              <div className="flex aspect-square w-full max-w-[min(100%,16rem)] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
                {sessionCode || joinPageUrl ? 'Generating QR…' : 'No code yet'}
              </div>
            )}
            <p className="mt-4 text-center text-[clamp(0.75rem,1.3vw,0.9rem)] font-semibold uppercase tracking-wider text-slate-500">
              Scan to join
            </p>
          </div>

          <div className="flex min-w-0 flex-col justify-center gap-[clamp(0.75rem,2vh,1rem)]">
            <div className="min-w-0 rounded-3xl border border-blue-200/70 bg-white/95 px-[clamp(1rem,2.5vw,1.75rem)] py-[clamp(0.85rem,2vh,1.25rem)] shadow-md shadow-navy-900/5">
              <p className="flex items-center gap-1.5 text-[clamp(0.7rem,1.3vw,0.85rem)] font-semibold uppercase tracking-wider text-slate-500">
                <Link2 className="size-3.5 shrink-0" aria-hidden />
                Join page
              </p>
              <p className="mt-2 break-all text-[clamp(0.95rem,1.9vw,1.25rem)] font-semibold leading-snug text-navy-800">
                {joinPageUrl || 'Join page unavailable'}
              </p>
              <p className="mt-1 text-[clamp(0.75rem,1.3vw,0.85rem)] text-slate-500">
                No code in the URL — enter the session code below.
              </p>
            </div>

            <div className="min-w-0 rounded-3xl border border-blue-200/70 bg-white/95 px-[clamp(1rem,2.5vw,1.75rem)] py-[clamp(0.85rem,2vh,1.25rem)] shadow-md shadow-navy-900/5">
              <p className="text-[clamp(0.7rem,1.3vw,0.85rem)] font-semibold uppercase tracking-wider text-slate-500">
                Session code
              </p>
              <p className="mt-2 font-mono text-[clamp(1.75rem,4.5vw,3rem)] font-bold tracking-[0.2em] text-navy-900">
                {sessionCode || '—'}
              </p>
            </div>

            <div className="min-w-0 rounded-3xl border border-blue-200/70 bg-white/95 px-[clamp(1rem,2.5vw,1.75rem)] py-[clamp(0.85rem,2vh,1.25rem)] shadow-md shadow-navy-900/5">
              <p className="text-[clamp(0.7rem,1.3vw,0.85rem)] font-semibold uppercase tracking-wider text-slate-500">
                Direct join link
              </p>
              <p className="mt-2 break-all text-[clamp(0.95rem,1.9vw,1.25rem)] font-semibold leading-snug text-navy-800">
                {directJoinUrl || 'Direct link unavailable'}
              </p>
              <p className="mt-1 text-[clamp(0.75rem,1.3vw,0.85rem)] text-slate-500">
                Opens this session without typing the code.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
