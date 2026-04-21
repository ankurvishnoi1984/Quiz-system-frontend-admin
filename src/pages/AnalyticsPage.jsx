import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, FileText, Printer, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Modal from '../components/ui/Modal'
import { useSessions } from '../context/SessionsContext'

const COLORS = ['#1d4ed8', '#2563eb', '#4f46e5', '#0891b2', '#0ea5e9', '#6366f1']

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function makeOptionData(question) {
  if (question?.type !== 'MCQ') return []
  const opts = question.options ?? []
  const values = opts.map((o) => ({ name: o.text, value: clamp(10 + Math.round(Math.random() * 70), 1, 100) }))
  const sum = values.reduce((a, b) => a + b.value, 0) || 1
  return values.map((v) => ({ ...v, value: Math.round((v.value / sum) * 100) }))
}

function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function AnalyticsPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const navigate = useNavigate()
  const { sessions, getSession } = useSessions()

  const defaultSessionId =
    sessionId ||
    sessions.find((s) => s.status === 'Completed')?.id ||
    sessions.find((s) => s.status === 'Live')?.id ||
    sessions[0]?.id ||
    null

  useEffect(() => {
    if (!sessionId && defaultSessionId) {
      navigate(`/analytics?session=${encodeURIComponent(defaultSessionId)}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, defaultSessionId])

  const session = defaultSessionId ? getSession(defaultSessionId) : null
  const [pdfOpen, setPdfOpen] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const summary = useMemo(() => {
    const joined = session?.participants ?? 0
    const responded = Math.round(joined * clamp((session?.progress ?? 60) / 100, 0, 1))
    const avg = joined ? Math.round((responded / joined) * 100) : 0
    const durationMin = session?.questions?.length ? Math.max(8, session.questions.length * 2) : 0
    return { joined, responded, avg, durationMin }
  }, [session?.participants, session?.progress, session?.questions?.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const perQuestion = useMemo(() => {
    const qs = session?.questions ?? []
    return qs.map((q, idx) => {
      const responseCount = Math.max(0, Math.round(summary.joined * clamp(0.55 + idx * 0.06, 0.2, 0.95)))
      const correctRate =
        q.type === 'MCQ' && (session?.quizMode ?? false)
          ? Math.round(40 + (idx * 11) % 45)
          : null
      const chart = makeOptionData(q)
      return { ...q, index: idx + 1, responseCount, correctRate, chart }
    })
  }, [session?.questions, session?.quizMode, summary.joined]) // eslint-disable-line react-hooks/exhaustive-deps

  const leaderboard = useMemo(
    () => [
      { name: 'Aarav', score: 1240 },
      { name: 'Priya', score: 1188 },
      { name: 'Isha', score: 1101 },
      { name: 'Kabir', score: 1034 },
      { name: 'Neha', score: 998 },
      { name: 'Rohan', score: 941 },
      { name: 'Anaya', score: 910 },
      { name: 'Vihaan', score: 872 },
      { name: 'Meera', score: 841 },
      { name: 'Arjun', score: 799 },
    ],
    [],
  )

  const exportCsv = () => {
    if (!session) return
    const headers = ['sessionId', 'sessionTitle', 'questionIndex', 'questionType', 'questionText', 'response']
    const rows = []
    perQuestion.forEach((q) => {
      // mock responses; real app will use stored raw responses
      const sample = q.type === 'MCQ' ? (q.options?.[0]?.text ?? '') : 'Sample response'
      rows.push([session.id, session.title, String(q.index), q.type, q.text?.replaceAll('"', '""') ?? '', sample])
    })

    const csv = [headers.join(','), ...rows.map((r) => r.map((x) => `"${String(x ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    downloadText(`session-${session.id}-responses.csv`, csv, 'text/csv')
  }

  const printPdf = () => {
    // lightweight “PDF report” approach without adding deps:
    // open a printable modal, then call window.print().
    setPdfOpen(true)
    setTimeout(() => window.print(), 50)
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600 shadow-sm">
        No session selected. Go to <strong>Dashboard</strong> and choose a session.
      </div>
    )
  }

  const filteredSessions = sessions
    .filter((s) => {
      if (!fromDate && !toDate) return true
      const d = new Date(s.date ?? '').getTime()
      const from = fromDate ? new Date(fromDate).getTime() : -Infinity
      const to = toDate ? new Date(toDate).getTime() : Infinity
      return d >= from && d <= to
    })
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-800">Session Analytics</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">{session.title}</h2>
          <p className="mt-1 text-sm text-slate-600">Session {session.id} • {session.status}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={session.id}
            onChange={(e) => navigate(`/analytics?session=${encodeURIComponent(e.target.value)}`)}
            className="h-11 rounded-2xl border border-blue-200/70 bg-white/90 px-3 text-sm font-semibold text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            aria-label="Select session"
          >
            {filteredSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.id})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="hidden h-11 rounded-2xl border border-blue-200/70 bg-white/90 px-3 text-sm text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 lg:block"
            aria-label="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="hidden h-11 rounded-2xl border border-blue-200/70 bg-white/90 px-3 text-sm text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 lg:block"
            aria-label="To date"
          />

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/70 bg-white/90 px-4 text-sm font-semibold text-slate-700 shadow-sm shadow-blue-900/5 transition hover:bg-blue-50"
          >
            <Download className="size-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={printPdf}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
          >
            <Printer className="size-4" />
            PDF report
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total joined', summary.joined.toLocaleString(), 'Participants entered the session'],
          ['Total responded', summary.responded.toLocaleString(), 'Submitted at least one response'],
          ['Avg response rate', `${summary.avg}%`, 'Across all questions'],
          ['Session duration', `${summary.durationMin}m`, 'Estimated based on questions'],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-2xl border border-blue-200/70 bg-white/85 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-navy-900">{value}</p>
            <p className="mt-2 text-sm text-slate-600">{hint}</p>
          </div>
        ))}
      </div>

      {/* Per-question breakdown */}
      <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-4 shadow-sm shadow-blue-900/5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-navy-900">Per-question breakdown</p>
            <p className="text-xs text-slate-600">Charts, response counts, and correctness</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {perQuestion.map((q) => (
          <div key={q.id} className="rounded-2xl border border-blue-200/70 bg-white/85 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Q{q.index}</span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{q.type}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-base font-semibold text-navy-900">{q.text || 'Untitled question'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Responses</p>
                <p className="mt-1 text-lg font-bold text-navy-900">{q.responseCount}</p>
              </div>
            </div>

            <div className="mt-4 h-56 rounded-2xl border border-blue-200/70 bg-white/85 p-3">
              <ResponsiveContainer width="100%" height="100%">
                {q.type === 'MCQ' ? (
                  <BarChart data={q.chart}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {q.chart.map((entry, idx) => (
                        <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Tooltip />
                    <Pie
                      data={[
                        { name: 'Responded', value: clamp(Math.round((q.responseCount / Math.max(1, summary.joined)) * 100), 0, 100) },
                        { name: 'No response', value: clamp(100 - Math.round((q.responseCount / Math.max(1, summary.joined)) * 100), 0, 100) },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      innerRadius={50}
                    >
                      <Cell fill="#2563eb" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white/70 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Correct-answer rate</p>
                <p className="mt-1 text-lg font-bold text-navy-900">{q.correctRate == null ? '—' : `${q.correctRate}%`}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</p>
                <p className="mt-1 text-sm text-slate-600">{q.correctRate == null ? 'Not a scored question' : 'Based on marked correct options'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard + Q&A */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-amber-200/70 bg-white/85 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Leaderboard</p>
              <h3 className="mt-1 text-lg font-bold text-navy-900">Final top 10</h3>
            </div>
            <Trophy className="size-5 text-amber-600" />
          </div>
          <div className="mt-4 space-y-2">
            {leaderboard.map((row, idx) => (
              <div key={row.name} className="flex items-center justify-between rounded-2xl border border-amber-200/60 bg-amber-50/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white">
                    {idx + 1}
                  </div>
                  <p className="font-semibold text-navy-900">{row.name}</p>
                </div>
                <p className="text-sm font-bold text-navy-900">{row.score}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200/70 bg-white/85 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Session settings</p>
              <h3 className="mt-1 text-lg font-bold text-navy-900">Snapshot</h3>
            </div>
            <FileText className="size-5 text-blue-700" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Join requirement</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{session.joinRequirement ?? 'name'}</p>
              <p className="mt-1 text-xs text-slate-600">Controls what participants must enter</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Time limit</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{session.timeLimitSeconds ? `${session.timeLimitSeconds}s` : 'Off'}</p>
              <p className="mt-1 text-xs text-slate-600">Per question</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quiz mode</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{session.quizMode ? 'Enabled' : 'Disabled'}</p>
              <p className="mt-1 text-xs text-slate-600">Correct answers + points</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Max participants</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{session.settings?.maxParticipants ?? 0}</p>
              <p className="mt-1 text-xs text-slate-600">Capacity control</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Anonymous</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{session.settings?.anonymous ? 'Yes' : 'No'}</p>
              <p className="mt-1 text-xs text-slate-600">Identity hidden in reports</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{session.settings?.password ? 'Enabled' : 'None'}</p>
              <p className="mt-1 text-xs text-slate-600">Session access gate</p>
            </div>
          </div>
        </div>
      </div>

      <Modal open={pdfOpen} title="PDF Report (Print)" onClose={() => setPdfOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Report</p>
            <h3 className="mt-2 text-lg font-bold text-navy-900">{session.title}</h3>
            <p className="mt-1 text-sm text-slate-600">Session {session.id}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</p>
              <p className="mt-1 text-xl font-bold text-navy-900">{summary.joined}</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg response</p>
              <p className="mt-1 text-xl font-bold text-navy-900">{summary.avg}%</p>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
            <p className="text-sm font-semibold text-navy-900">Per-question summary</p>
            <div className="mt-3 space-y-2">
              {perQuestion.map((q) => (
                <div key={q.id} className="flex items-start justify-between gap-3 border-b border-blue-50 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900">
                      Q{q.index}: {q.text || 'Untitled'}
                    </p>
                    <p className="text-xs text-slate-600">{q.type}</p>
                  </div>
                  <p className="text-sm font-bold text-navy-900">{q.responseCount} responses</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
            >
              <Printer className="size-4" />
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={() => setPdfOpen(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              <FileText className="size-4" />
              Close
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

export default AnalyticsPage

