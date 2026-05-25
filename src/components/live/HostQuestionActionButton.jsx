const HOST_ACTION_TONES = {
  emerald: {
    active:
      'border-emerald-500 bg-emerald-100 text-emerald-950 shadow-sm shadow-emerald-200/60 ring-1 ring-emerald-300/70',
    activeIcon: 'bg-emerald-600 text-white',
    idle: 'border-emerald-200/90 bg-emerald-50/90 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100',
    idleIcon: 'bg-emerald-200/80 text-emerald-700',
    dot: 'bg-emerald-600',
  },
  rose: {
    active: 'border-rose-500 bg-rose-100 text-rose-950 shadow-sm shadow-rose-200/60 ring-1 ring-rose-300/70',
    activeIcon: 'bg-rose-600 text-white',
    idle: 'border-rose-200/90 bg-rose-50/90 text-rose-800 hover:border-rose-400 hover:bg-rose-100',
    idleIcon: 'bg-rose-200/80 text-rose-700',
    dot: 'bg-rose-600',
  },
  violet: {
    active:
      'border-violet-500 bg-violet-100 text-violet-950 shadow-sm shadow-violet-200/60 ring-1 ring-violet-300/70',
    activeIcon: 'bg-violet-600 text-white',
    idle: 'border-violet-200/90 bg-violet-50/90 text-violet-800 hover:border-violet-400 hover:bg-violet-100',
    idleIcon: 'bg-violet-200/80 text-violet-700',
    dot: 'bg-violet-600',
  },
  amber: {
    active: 'border-amber-500 bg-amber-100 text-amber-950 shadow-sm shadow-amber-200/60 ring-1 ring-amber-300/70',
    activeIcon: 'bg-amber-600 text-white',
    idle: 'border-amber-200/90 bg-amber-50/90 text-amber-900 hover:border-amber-400 hover:bg-amber-100',
    idleIcon: 'bg-amber-200/80 text-amber-800',
    dot: 'bg-amber-600',
  },
  sky: {
    active: 'border-sky-500 bg-sky-100 text-sky-950 shadow-sm shadow-sky-200/60 ring-1 ring-sky-300/70',
    activeIcon: 'bg-sky-600 text-white',
    idle: 'border-sky-200/90 bg-sky-50/90 text-sky-800 hover:border-sky-400 hover:bg-sky-100',
    idleIcon: 'bg-sky-200/80 text-sky-700',
    dot: 'bg-sky-600',
  },
}

export function HostQuestionActionButton({
  disabled,
  onClick,
  icon: Icon,
  label,
  active = false,
  tone = 'emerald',
  title,
  size = 'default',
}) {
  const styles = HOST_ACTION_TONES[tone] || HOST_ACTION_TONES.emerald
  const tooltip = title || label
  const isCompact = size === 'compact'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={tooltip}
      aria-pressed={active}
      className={`group inline-flex items-center gap-2 rounded-lg border font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
        isCompact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
      } ${active ? styles.active : styles.idle}`}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-md transition-colors ${
          isCompact ? 'size-6' : 'size-7'
        } ${active ? styles.activeIcon : styles.idleIcon}`}
      >
        <Icon className={isCompact ? 'size-3' : 'size-3.5'} strokeWidth={2.25} aria-hidden />
      </span>
      <span className="whitespace-nowrap">{label}</span>
      {active ? (
        <span className={`size-1.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
      ) : null}
    </button>
  )
}
