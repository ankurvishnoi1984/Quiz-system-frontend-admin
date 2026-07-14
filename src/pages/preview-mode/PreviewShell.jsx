import { Maximize2, Minimize2 } from 'lucide-react'

export function PreviewShell({ children, footer }) {
  return (
    <div className="preview-mode relative flex min-h-dvh flex-col overflow-hidden bg-linear-to-br from-slate-50 via-sky-50/80 to-blue-100/60 text-navy-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 18%, rgba(27, 75, 107, 0.12) 0%, transparent 45%), radial-gradient(circle at 88% 82%, rgba(14, 165, 233, 0.1) 0%, transparent 42%)',
        }}
      />
      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-[clamp(1rem,3.5vw,3.5rem)] py-[clamp(0.75rem,2vh,1.75rem)]">
        {children}
      </main>
      {footer}
    </div>
  )
}

export function PreviewHeader({ sessionTitle }) {
  return (
    <header className="mb-[clamp(1rem,3vh,1.75rem)] flex shrink-0 flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[clamp(0.7rem,1.3vw,0.85rem)] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Preview mode
        </p>
        <h1 className="mt-1 truncate text-[clamp(1.35rem,3vw,2rem)] font-bold text-navy-900">
          {sessionTitle}
        </h1>
      </div>
    </header>
  )
}

export function PreviewFullscreenButton({ isFullscreen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-xl border border-blue-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-navy-800 shadow-sm transition hover:bg-white"
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="size-4" />
          Exit fullscreen
        </>
      ) : (
        <>
          <Maximize2 className="size-4" />
          Fullscreen
        </>
      )}
    </button>
  )
}
