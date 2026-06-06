import { Info } from 'lucide-react'

export function PresentShell({ children, footer }) {
  return (
    <div className="present-mode relative flex min-h-dvh flex-col overflow-hidden bg-linear-to-br from-slate-50 via-blue-50/80 to-indigo-100/60 text-navy-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(27, 75, 107, 0.12) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(79, 70, 229, 0.08) 0%, transparent 40%)',
        }}
      />
      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-[clamp(1.5rem,4vw,4rem)] py-[clamp(1.25rem,3vh,2.5rem)]">
        {children}
      </main>
      {footer}
    </div>
  )
}

export function PresentSlideHeader({
  sessionTitle,
  participantCount = 0,
  isSessionLive = false,
  onParticipantsClick,
}) {
  const participantControl = (
    <>
      <div className="flex items-center justify-end gap-2">
        {isSessionLive ? (
          <span className="relative flex size-2.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
        ) : (
          <span className="inline-flex size-2.5 shrink-0 rounded-full bg-slate-300" aria-hidden />
        )}
        <p className="text-[clamp(0.7rem,1.3vw,0.85rem)] font-semibold uppercase tracking-wider text-slate-500">
          Participants
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">
        <p className="text-[clamp(1.25rem,2.4vw,1.75rem)] font-bold tabular-nums text-navy-700">
          {participantCount}
        </p>
        {onParticipantsClick ? (
          <Info
            className="size-[clamp(0.9rem,1.6vw,1.1rem)] shrink-0 text-sky-600 transition group-hover:text-sky-700"
            aria-hidden
          />
        ) : null}
      </div>
    </>
  )

  return (
    <header className="mb-[clamp(1rem,3vh,2rem)] flex shrink-0 flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[clamp(0.65rem,1.2vw,0.8rem)] font-semibold uppercase tracking-[0.35em] text-navy-600/80">
          Present mode
        </p>
        <h1 className="mt-1 text-[clamp(1.1rem,2.5vw,1.75rem)] font-bold text-navy-900">{sessionTitle}</h1>
      </div>
      {onParticipantsClick ? (
        <button
          type="button"
          onClick={onParticipantsClick}
          className="group cursor-pointer rounded-2xl border border-blue-200/80 bg-white/90 px-4 py-2.5 text-right shadow-sm transition hover:border-sky-300 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          aria-label={`${participantCount} participants joined. View participant list.`}
        >
          {participantControl}
        </button>
      ) : (
        <div className="text-right">{participantControl}</div>
      )}
    </header>
  )
}

export function PresentNavButton({ direction, onClick, disabled, label }) {
  const isPrev = direction === 'prev'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex min-h-[clamp(3rem,8vh,4.5rem)] min-w-[clamp(8rem,18vw,12rem)] items-center justify-center gap-2 rounded-2xl border border-blue-200/80 bg-white/90 px-6 text-[clamp(0.95rem,1.8vw,1.15rem)] font-semibold text-navy-800 shadow-lg shadow-navy-900/10 transition hover:border-navy-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {isPrev ? '←' : '→'}
      <span>{label}</span>
    </button>
  )
}
