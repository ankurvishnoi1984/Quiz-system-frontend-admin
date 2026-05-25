/**
 * Segmented control for present-mode slide sub-views (results, leaderboard, responses).
 */
export function PresentViewSwitcher({ views, activeId, onChange }) {
  if (!views?.length || views.length < 2) return null

  return (
    <div
      className="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-2xl border border-blue-200/70 bg-white/80 p-1 shadow-sm backdrop-blur-sm"
      role="tablist"
      aria-label="Presentation views"
    >
      {views.map(({ id, label, icon: Icon }) => {
        const active = activeId === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[clamp(0.8rem,1.5vw,0.95rem)] font-semibold transition ${
              active
                ? 'bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-white shadow-md shadow-navy-900/20'
                : 'text-slate-600 hover:bg-blue-50 hover:text-navy-800'
            }`}
          >
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
            {label}
          </button>
        )
      })}
    </div>
  )
}
