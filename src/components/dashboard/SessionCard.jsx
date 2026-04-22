import { BarChart3, Copy, Pencil, Rocket, Share2, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import KebabMenu from '../ui/KebabMenu'

function StatusBadge({ status }) {
  const styles = {
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    Live: 'bg-red-50 text-red-700 border-red-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[status] ?? styles.Draft}`}>
      {status}
    </span>
  )
}

function Tag({ children }) {
  return <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">{children}</span>
}

function ProgressPill({ value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-linear-to-r from-blue-600 to-indigo-600" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600">{value}%</span>
    </div>
  )
}

function SessionCard({ session, onAction }) {
  const preview = useMemo(() => {
    const labels = session.tags?.join(', ') || 'Quiz'
    return `${labels} • ${session.participants} participants • Status: ${session.status}`
  }, [session.participants, session.status, session.tags])

  return (
    <div
      className="group relative z-0 overflow-visible rounded-2xl border border-blue-200/70 bg-white/85 p-4 shadow-sm shadow-blue-900/5 backdrop-blur transition hover:z-20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-900/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-navy-900">{session.title}</p>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">Created: {session.date}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(session.tags ?? []).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            <span className="ml-auto text-sm font-semibold text-slate-700">{session.participants} participants</span>
          </div>
          <div className="mt-3">
            <ProgressPill value={session.progress ?? 0} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-blue-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            onClick={() => onAction('launch', session)}
          >
            <Rocket className="mr-2 inline size-4" />
            Launch
          </button>

          <KebabMenu
            items={[
              { id: 'share', label: 'Share', icon: Share2, onClick: () => onAction('share', session) },
              { id: 'edit', label: 'Edit', icon: Pencil, onClick: () => onAction('edit', session) },
              { id: 'analytics', label: 'Analytics', icon: BarChart3, onClick: () => onAction('analytics', session) },
              { id: 'duplicate', label: 'Duplicate', icon: Copy, onClick: () => onAction('duplicate', session) },
              { id: 'delete', label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => onAction('delete', session) },
            ]}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 top-2 hidden max-w-[70%] rounded-xl border border-blue-200/70 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg shadow-blue-900/10 group-hover:block">
        Quick preview: {preview}
      </div>
    </div>
  )
}

export default SessionCard

