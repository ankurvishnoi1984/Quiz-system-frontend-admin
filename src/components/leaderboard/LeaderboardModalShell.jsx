import { X } from 'lucide-react'
import { useEffect } from 'react'
import { LeaderboardLimitSelect } from './LeaderboardLimitSelect'

export function LeaderboardModalShell({
  open,
  onClose,
  eyebrow = 'Leaderboard',
  title,
  limit,
  onLimitChange,
  limitSelectId,
  children,
  wide = false,
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-navy-950/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close leaderboard"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-modal-title"
        className={`relative mx-auto mt-12 flex max-h-[min(85vh,820px)] flex-col rounded-2xl border border-amber-200/70 bg-white p-5 shadow-2xl shadow-blue-900/20 ${
          wide ? 'w-[min(92vw,720px)]' : 'w-[min(92vw,520px)]'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">{eyebrow}</p>
            <h3 id="leaderboard-modal-title" className="mt-1 text-xl font-bold text-navy-900">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {onLimitChange ? (
              <LeaderboardLimitSelect
                id={limitSelectId}
                value={limit}
                onChange={onLimitChange}
              />
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-amber-200/70 p-2 text-slate-600 transition hover:bg-amber-50"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
