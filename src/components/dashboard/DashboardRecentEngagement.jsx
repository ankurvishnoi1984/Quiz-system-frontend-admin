import { useMemo } from 'react'
import { buildRecentSessionEngagement } from '../../utils/dashboardMetrics'

const STATUS_STYLES = {
  Draft: 'bg-slate-100 text-slate-700',
  Live: 'bg-emerald-100 text-emerald-800',
  Completed: 'bg-navy-100 text-navy-800',
}

function EngagementRow({ row }) {
  const hasActivity = row.participants > 0

  return (
    <li className="rounded-xl border border-blue-100/80 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-navy-900" title={row.title}>
            {row.title}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">{row.dateLabel}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            STATUS_STYLES[row.status] || STATUS_STYLES.Draft
          }`}
        >
          {row.status}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Joined</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-navy-900">{row.participants}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Finished</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-navy-900">{row.completed}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Rate</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-navy-900">
            {hasActivity ? `${row.completion}%` : '—'}
          </p>
        </div>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${
            row.completion >= 70 ? 'bg-emerald-500' : row.completion >= 40 ? 'bg-amber-500' : 'bg-slate-300'
          }`}
          style={{ width: `${hasActivity ? row.completion : 0}%` }}
        />
      </div>
    </li>
  )
}

export function DashboardRecentEngagement({ sessions = [], isLoading = false }) {
  const rows = useMemo(() => buildRecentSessionEngagement(sessions, 6), [sessions])
  const hasEngagement = rows.some((row) => row.participants > 0)

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading engagement…
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-blue-200/80 bg-blue-50/40 px-4 text-center text-sm text-slate-600">
        No sessions in this department yet.
      </div>
    )
  }

  if (!hasEngagement) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-dashed border-blue-200/80 bg-blue-50/40 px-3 py-2 text-center text-xs text-slate-600">
          Engagement metrics appear once participants join live or completed sessions.
        </div>
        <ul className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
          {rows.map((row) => (
            <EngagementRow key={row.id} row={row} />
          ))}
        </ul>
      </div>
    )
  }

  return (
    <ul className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
      {rows.map((row) => (
        <EngagementRow key={row.id} row={row} />
      ))}
    </ul>
  )
}
