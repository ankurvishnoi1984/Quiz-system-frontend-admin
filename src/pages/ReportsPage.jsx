import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KebabMenu from '../components/ui/KebabMenu'
import { useSessions } from '../context/SessionsContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { listSessionQuestionsApi } from '../services/builderApi'
import { useAuthStore } from '../store/authStore'

function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const REPORT_CSV_HEADERS = [
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

function csvEscapeCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function buildReportCsv(rows) {
  const lines = [REPORT_CSV_HEADERS.join(','), ...rows.map((r) => r.map(csvEscapeCell).join(','))]
  return lines.join('\n')
}

function isBackendSessionId(id) {
  const n = Number(id)
  return Number.isFinite(n) && n > 0 && String(n) === String(id).trim()
}

function apiQuestionTypeToLabel(questionType) {
  const mapping = {
    mcq: 'MCQ',
    word_cloud: 'Word Cloud',
    rating: 'Rating',
    open_text: 'Text',
    true_false: 'True/False',
    ranking: 'Ranking',
    fill_blank: 'Text',
  }
  return mapping[questionType] || questionType || ''
}

function sortApiQuestions(questions) {
  return [...questions].sort(
    (a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0),
  )
}

function sampleResponseFromApiQuestion(q) {
  const opts = q.question_options || []
  const t = q.question_type
  if (t === 'mcq' || t === 'true_false') {
    return opts[0]?.option_text ?? ''
  }
  if (t === 'rating') {
    const lo = q.rating_min ?? 1
    const hi = q.rating_max ?? 5
    return `${lo}–${hi} (rating)`
  }
  if (t === 'word_cloud') {
    return '(words / tags)'
  }
  if (t === 'open_text' || t === 'ranking' || t === 'fill_blank') {
    return '(free text)'
  }
  return ''
}

async function loadQuestionsForReport(accessToken, session) {
  if (!accessToken || !isBackendSessionId(session.id)) return null
  try {
    const list = await listSessionQuestionsApi(accessToken, session.id)
    return sortApiQuestions(Array.isArray(list) ? list : [])
  } catch (err) {
    console.error('Failed to load questions for report', session.id, err)
    return null
  }
}

function rowsFromApiQuestions(session, apiQuestions) {
  return apiQuestions.map((q, idx) => [
    session.id,
    session.title,
    session.status,
    session.department ?? '',
    session.joinRequirement ?? 'name',
    String(idx + 1),
    apiQuestionTypeToLabel(q.question_type),
    q.question_text ?? '',
    sampleResponseFromApiQuestion(q),
  ])
}

function rowsFromFallbackQuestions(session) {
  return (session.questions ?? []).map((q, idx) => {
    const sample =
      q.type === 'MCQ' || q.type === 'True/False'
        ? (q.options?.[0]?.text ?? '')
        : q.type === 'Word Cloud'
          ? '(words / tags)'
          : q.type === 'Rating'
            ? '(rating)'
            : '(free text)'
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
}

async function exportSessionCsvAsync(accessToken, session) {
  const apiQs = await loadQuestionsForReport(accessToken, session)
  const rows =
    apiQs && apiQs.length > 0 ? rowsFromApiQuestions(session, apiQs) : rowsFromFallbackQuestions(session)
  downloadText(`report-${session.id}.csv`, buildReportCsv(rows), 'text/csv')
}

async function exportAllCsvAsync(accessToken, sessions) {
  const rowLists = await Promise.all(
    sessions.map(async (session) => {
      const apiQs = await loadQuestionsForReport(accessToken, session)
      if (apiQs && apiQs.length > 0) return rowsFromApiQuestions(session, apiQs)
      return rowsFromFallbackQuestions(session)
    }),
  )
  const rows = rowLists.flat()
  downloadText('reports-all-sessions.csv', buildReportCsv(rows), 'text/csv')
}

const PAGE_SIZE = 10

function ReportsPage() {
  const { sessions } = useSessions()
  const accessToken = useAuthStore((s) => s.accessToken)
  const navigate = useNavigate()
  const [status, setStatus] = useState('All')
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [exportAllLoading, setExportAllLoading] = useState(false)
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

  const totalCount = filtered.length
  const totalPages = totalCount === 0 ? 1 : Math.ceil(totalCount / PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [status, debounced, fromDate, toDate])

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = totalCount === 0 ? 0 : Math.min(page * PAGE_SIZE, totalCount)

  const handleExportAll = async () => {
    if (!filtered.length) return
    setExportAllLoading(true)
    try {
      await exportAllCsvAsync(accessToken, filtered)
    } catch (err) {
      console.error('Export all failed', err)
    } finally {
      setExportAllLoading(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Reports</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">Download & view session reports</h2>
          <p className="mt-1 text-sm text-slate-600">Exports are based on your sessions, questions, and settings.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!filtered.length || exportAllLoading}
            onClick={() => void handleExportAll()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="size-4" />
            {exportAllLoading ? 'Exporting…' : 'Export all (CSV)'}
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
                  status === t ? 'bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-white shadow' : 'border border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
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

      <div className="relative z-0 overflow-visible  rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5 backdrop-blur">
        <div className="grid min-w-[900px] grid-cols-[minmax(240px,1.6fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(140px,0.8fr)_96px] gap-3 border-b border-blue-100 bg-white pl-5 pr-8 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <div>Session</div>
          <div>Status</div>
          <div>Participants</div>
          <div>Join</div>
          <div className="text-right">Actions</div>
        </div>

        {paginated.map((s) => (
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
                <ShieldCheck className="size-4 text-navy-700" />
                {s.joinRequirement ?? 'name'}
              </span>
            </div>

            <div className="flex justify-end pr-1">
              <KebabMenu
                items={[
                  { id: 'view', label: 'View (Analytics)', icon: ExternalLink, onClick: () => navigate(`/analytics?session=${encodeURIComponent(s.id)}`) },
                  { id: 'csv', label: 'Download CSV', icon: Download, onClick: () => void exportSessionCsvAsync(accessToken, s) },
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

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 bg-white/95 px-5 py-3">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-navy-900">{rangeStart}</span>–
              <span className="font-semibold text-navy-900">{rangeEnd}</span> of{' '}
              <span className="font-semibold text-navy-900">{totalCount.toLocaleString()}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>
              <span className="rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-semibold text-navy-900">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ReportsPage

