import { Download, ExternalLink, FileText, Search, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KebabMenu from '../components/ui/KebabMenu'
import { useSessions } from '../context/SessionsContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportSessionCsv(session) {
  const headers = [
    'sessionId',
    'sessionTitle',
    'status',
    'department',
    'joinRequirement',
    'questionIndex',
    'questionType',
    'questionText',
    'sampleResponse',
  ]

  const rows = (session.questions ?? []).map((q, idx) => {
    const sample = q.type === 'MCQ' ? (q.options?.[0]?.text ?? '') : 'Sample response'
    return [
      session.id,
      session.title,
      session.status,
      session.department ?? '',
      session.joinRequirement ?? 'name',
      String(idx + 1),
      q.type ?? '',
      q.text ?? '',
      sample,
    ]
  })

  const csv = [headers.join(','), ...rows.map((r) => r.map((x) => `"${String(x ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
  downloadText(`report-${session.id}.csv`, csv, 'text/csv')
}

function exportAllCsv(sessions) {
  const headers = [
    'sessionId',
    'sessionTitle',
    'status',
    'department',
    'joinRequirement',
    'questionIndex',
    'questionType',
    'questionText',
    'sampleResponse',
  ]

  const rows = []
  sessions.forEach((session) => {
    ;(session.questions ?? []).forEach((q, idx) => {
      const sample = q.type === 'MCQ' ? (q.options?.[0]?.text ?? '') : 'Sample response'
      rows.push([
        session.id,
        session.title,
        session.status,
        session.department ?? '',
        session.joinRequirement ?? 'name',
        String(idx + 1),
        q.type ?? '',
        q.text ?? '',
        sample,
      ])
    })
  })

  const csv = [headers.join(','), ...rows.map((r) => r.map((x) => `"${String(x ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
  downloadText(`reports-all-sessions.csv`, csv, 'text/csv')
}

function ReportsPage() {
  const { sessions } = useSessions()
  const navigate = useNavigate()
  const [status, setStatus] = useState('All')
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const debounced = useDebouncedValue(query, 250).trim().toLowerCase()

  const filtered = useMemo(() => {
    return sessions
      .filter((s) => (status === 'All' ? true : s.status === status))
      .filter((s) => (debounced ? `${s.title} ${s.id}`.toLowerCase().includes(debounced) : true))
      .filter((s) => {
        if (!fromDate && !toDate) return true
        const d = new Date(s.date ?? '').getTime()
        const from = fromDate ? new Date(fromDate).getTime() : -Infinity
        const to = toDate ? new Date(toDate).getTime() : Infinity
        return d >= from && d <= to
      })
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
  }, [sessions, status, debounced, fromDate, toDate])

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-800">Reports</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">Download & view session reports</h2>
          <p className="mt-1 text-sm text-slate-600">Exports are based on your sessions, questions, and settings.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportAllCsv(filtered)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
          >
            <Download className="size-4" />
            Export all (CSV)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/70 bg-white/90 px-4 text-sm font-semibold text-slate-700 shadow-sm shadow-blue-900/5 transition hover:bg-blue-50"
          >
            <FileText className="size-4" />
            Print page
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-4 shadow-sm shadow-blue-900/5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {['All', 'Draft', 'Live', 'Completed'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setStatus(t)}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  status === t ? 'bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 text-white shadow' : 'border border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or session id..."
              className="h-11 w-72 rounded-2xl border border-blue-200/70 bg-white/90 pl-9 pr-3 text-sm text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-11 rounded-2xl border border-blue-200/70 bg-white/90 px-3 text-sm text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              aria-label="From date"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-11 rounded-2xl border border-blue-200/70 bg-white/90 px-3 text-sm text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              aria-label="To date"
            />
          </div>
        </div>
      </div>

      <div className="relative z-0 overflow-visible  rounded-2xl border border-blue-200/70 bg-white/85 shadow-sm shadow-blue-900/5 backdrop-blur">
        <div className="grid min-w-[900px] grid-cols-[minmax(240px,1.6fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(140px,0.8fr)_96px] gap-3 border-b border-blue-100 bg-white pl-5 pr-8 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <div>Session</div>
          <div>Status</div>
          <div>Participants</div>
          <div>Join</div>
          <div className="text-right">Actions</div>
        </div>

        {filtered.map((s) => (
          <div
            key={s.id}
            className="grid min-w-[900px] grid-cols-[minmax(240px,1.6fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(140px,0.8fr)_96px] gap-3 border-b border-blue-50 pl-5 pr-8 py-4 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy-900">{s.title}</p>
              <p className="mt-1 text-xs text-slate-600">
                {s.id} • {s.date ?? '—'} • {(s.tags ?? []).join(', ')}
              </p>
            </div>
            <div>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  s.status === 'Live'
                    ? 'bg-red-50 text-red-700'
                    : s.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-700'
                }`}
              >
                {s.status}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-700">{(s.participants ?? 0).toLocaleString()}</div>
            <div className="text-sm text-slate-700">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-blue-700" />
                {s.joinRequirement ?? 'name'}
              </span>
            </div>

            <div className="flex justify-end pr-1">
              <KebabMenu
                items={[
                  { id: 'view', label: 'View (Analytics)', icon: ExternalLink, onClick: () => navigate(`/analytics?session=${encodeURIComponent(s.id)}`) },
                  { id: 'csv', label: 'Download CSV', icon: Download, onClick: () => exportSessionCsv(s) },
                  {
                    id: 'pdf',
                    label: 'Download PDF',
                    icon: FileText,
                    onClick: () => {
                      navigate(`/analytics?session=${encodeURIComponent(s.id)}`)
                      setTimeout(() => window.print(), 50)
                    },
                  },
                  { id: 'builder', label: 'Open Builder', onClick: () => navigate(`/builder?session=${encodeURIComponent(s.id)}`) },
                  { id: 'live', label: 'Open Live Mode', onClick: () => navigate(`/live?session=${encodeURIComponent(s.id)}`) },
                ]}
              />
            </div>
          </div>
        ))}

        {!filtered.length && (
          <div className="p-10 text-center text-sm text-slate-600">No sessions match these filters.</div>
        )}
      </div>
    </section>
  )
}

export default ReportsPage

