import { useMemo } from 'react'

const SIZE_CLASS = {
  sm: {
    emoji: 'text-3xl',
    button: 'min-h-14 min-w-14',
    bar: 'h-24',
    label: 'text-xs',
  },
  md: {
    emoji: 'text-4xl',
    button: 'min-h-16 min-w-16',
    bar: 'h-32',
    label: 'text-sm',
  },
  lg: {
    emoji: 'text-[clamp(2rem,5vw,3.5rem)]',
    button: 'min-h-[3.5rem] min-w-[3.5rem] sm:min-h-16 sm:min-w-16',
    bar: 'h-[clamp(5rem,18vh,8rem)]',
    label: 'text-[clamp(0.7rem,1.4vw,0.85rem)]',
  },
}

export function EmojiBarChart({
  rows = [],
  total,
  size = 'md',
  showTotal = true,
  emptyLabel = 'Waiting for reactions…',
  className = '',
}) {
  const styles = SIZE_CLASS[size] || SIZE_CLASS.md
  const computedTotal = useMemo(() => {
    if (Number.isFinite(total)) return total
    return rows.reduce((sum, row) => sum + Number(row.count || 0), 0)
  }, [rows, total])

  const leaderCount = useMemo(
    () => rows.reduce((max, row) => Math.max(max, Number(row.count || 0)), 0),
    [rows],
  )

  if (!rows.length) {
    return (
      <div className={`flex h-full items-center justify-center text-sm text-slate-500 ${className}`}>
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="grid flex-1 grid-cols-5 items-end gap-2 sm:gap-3">
        {rows.map((row) => {
          const count = Number(row.count || 0)
          const percent = Number(row.percent ?? (computedTotal > 0 ? Math.round((count / computedTotal) * 100) : 0))
          const isLeader = leaderCount > 0 && count === leaderCount
          const fillHeight = computedTotal > 0 ? Math.max(8, Math.round((count / computedTotal) * 100)) : 0

          return (
            <div key={row.optionId ?? row.emoji} className="flex min-w-0 flex-col items-center gap-2">
              <div
                className={`relative flex w-full flex-col overflow-hidden rounded-2xl border border-blue-100 bg-slate-50/80 ${styles.bar}`}
              >
                <div
                  className={`absolute inset-x-0 bottom-0 rounded-b-2xl bg-linear-to-t from-indigo-500/80 to-sky-400/70 transition-all duration-500 ease-out ${
                    isLeader ? 'animate-pulse' : ''
                  }`}
                  style={{ height: `${fillHeight}%` }}
                />
                <div className="relative z-10 flex flex-1 items-center justify-center">
                  <span className={`leading-none ${styles.emoji} ${isLeader ? 'scale-110' : ''}`}>
                    {row.emoji}
                  </span>
                </div>
              </div>
              <div className={`w-full text-center font-semibold text-slate-700 ${styles.label}`}>
                <p>{count}</p>
                <p className="text-slate-500">{percent}%</p>
              </div>
            </div>
          )
        })}
      </div>
      {showTotal ? (
        <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
          {computedTotal} reaction{computedTotal === 1 ? '' : 's'}
        </p>
      ) : null}
    </div>
  )
}
