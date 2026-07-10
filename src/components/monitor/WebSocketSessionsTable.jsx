import { formatMonitorRole } from '../../utils/websocketMonitor'

function RoleBreakdown({ byRole = {} }) {
  const entries = Object.entries(byRole).sort((a, b) => b[1] - a[1])
  if (!entries.length) return <span className="text-slate-400">—</span>

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([role, count]) => (
        <span
          key={role}
          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-navy-800"
        >
          {formatMonitorRole(role)}: {count}
        </span>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    live: 'bg-emerald-50 text-emerald-700',
    paused: 'bg-amber-50 text-amber-800',
    draft: 'bg-slate-100 text-slate-600',
    completed: 'bg-slate-100 text-slate-600',
    archived: 'bg-slate-100 text-slate-500',
  }
  const label = status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : '—'

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        styles[status] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {label}
    </span>
  )
}

export function WebSocketSessionsTable({ sessions = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-8 text-center text-sm text-slate-600 shadow-sm">
        Loading sessions…
      </div>
    )
  }

  if (!sessions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-sm text-slate-600">
        No active WebSocket sessions. Connections will appear here when hosts or participants join live
        sessions.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5">
      <div className="border-b border-blue-100 bg-blue-50/40 px-4 py-3">
        <h3 className="text-sm font-bold text-navy-900">Active sessions</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Sessions with at least one open WebSocket connection
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-blue-100 bg-white">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Session</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Code</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Connections</th>
              <th className="px-4 py-3 font-semibold text-slate-700">By role</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((row) => (
              <tr key={row.session_code} className="border-b border-blue-50 last:border-b-0">
                <td className="px-4 py-3 font-medium text-navy-900">{row.title || 'Untitled session'}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.session_code}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums text-navy-900">
                  {row.total_connections}
                </td>
                <td className="px-4 py-3">
                  <RoleBreakdown byRole={row.by_role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
