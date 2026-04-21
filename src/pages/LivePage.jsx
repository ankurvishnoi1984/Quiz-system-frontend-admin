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
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  MessageSquare,
  Pin,
  Play,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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

function makeParticipantList(count) {
  const first = ['Aarav', 'Priya', 'Isha', 'Kabir', 'Neha', 'Rohan', 'Anaya', 'Vihaan', 'Meera', 'Arjun', 'Sana', 'Dev', 'Irfan', 'Riya', 'Karan']
  const last = ['Sharma', 'Patel', 'Singh', 'Gupta', 'Khan', 'Das', 'Nair', 'Iyer', 'Jain', 'Mehta', 'Roy', 'Kapoor']
  const out = []
  for (let i = 0; i < count; i++) {
    const fn = first[i % first.length]
    const ln = last[i % last.length]
    const name = `${fn} ${ln}`
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${(i % 9) + 1}@example.com`
    out.push({ id: `P-${String(i + 1).padStart(3, '0')}`, name, email })
  }
  return out
}

function makeResponse(question) {
  if (!question) return ''
  if (question.type === 'MCQ') {
    const opts = question.options ?? []
    return opts.length ? opts[Math.floor(Math.random() * opts.length)].text : '—'
  }
  if (question.type === 'Rating') return String(1 + Math.floor(Math.random() * 5))
  if (question.type === 'Text') {
    const samples = ['Aligned', 'Need clarity on scope', 'Shipping soon', 'Blocked by dependency', 'All good', 'Working on fixes']
    return samples[Math.floor(Math.random() * samples.length)]
  }
  if (question.type === 'True/False') return Math.random() < 0.5 ? 'True' : 'False'
  if (question.type === 'Ranking') return 'Rank submitted'
  if (question.type === 'Word Cloud') return 'Word submitted'
  return 'Submitted'
}

function LivePage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const navigate = useNavigate()
  const { sessions, getSession, updateSession } = useSessions()

  const defaultSessionId =
    sessionId ||
    sessions.find((s) => s.status === 'Live')?.id ||
    sessions[0]?.id ||
    null

  useEffect(() => {
    if (!sessionId && defaultSessionId) {
      navigate(`/live?session=${encodeURIComponent(defaultSessionId)}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, defaultSessionId])

  const session = defaultSessionId ? getSession(defaultSessionId) : null

  const [questionIndex, setQuestionIndex] = useState(0)
  const [active, setActive] = useState(true)
  const [chartMode, setChartMode] = useState('Bar') // Bar | Pie
  const [qaOpen, setQaOpen] = useState(true)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [participants, setParticipants] = useState(session?.participants ?? 0)
  const [responded, setResponded] = useState(Math.min(session?.participants ?? 0, Math.round((session?.participants ?? 0) * 0.62)))
  const respondedRef = useRef(responded)
  respondedRef.current = responded

  const question = useMemo(() => session?.questions?.[questionIndex] ?? null, [session?.questions, questionIndex])
  const optionData = useMemo(() => makeOptionData(question), [question?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const joinRequirement = session?.joinRequirement ?? 'name'
  const showEmail = joinRequirement === 'name_email'
  const showIdentity = joinRequirement !== 'anonymous'

  const [participantList, setParticipantList] = useState(() => makeParticipantList(Math.min(24, session?.participants ?? 12)))
  const [responsesByQuestion, setResponsesByQuestion] = useState({})

  useEffect(() => {
    if (!session) return
    setParticipantList(makeParticipantList(Math.min(24, session.participants ? Math.max(12, Math.min(24, session.participants)) : 12)))
    setResponsesByQuestion({})
    setQuestionIndex(0)
  }, [session?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const qaItems = session?.qaItems ?? []

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

  useEffect(() => {
    if (!session) return
    setParticipants(session.participants ?? 0)
  }, [session?.participants, session?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-update responded count + chart values while active.
  useEffect(() => {
    if (!session || !active) return
    const id = setInterval(() => {
      setParticipants((p) => p + (Math.random() < 0.05 ? 1 : 0))
      setResponded((r) => clamp(r + (Math.random() < 0.7 ? 1 : 0), 0, participants || 1))

      setResponsesByQuestion((prev) => {
        if (!question) return prev
        const qid = question.id
        const existing = prev[qid] ?? {}
        const pending = participantList.filter((p) => !existing[p.id])
        if (!pending.length) return prev
        if (Math.random() < 0.55) return prev
        const pick = pending[Math.floor(Math.random() * pending.length)]
        const next = {
          ...existing,
          [pick.id]: { response: makeResponse(question), at: Date.now() },
        }
        return { ...prev, [qid]: next }
      })
    }, 900)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, active])

  const responseRate = participants ? Math.round((responded / participants) * 100) : 0

  const goPrev = () => setQuestionIndex((i) => clamp(i - 1, 0, (session?.questions?.length ?? 1) - 1))
  const goNext = () => setQuestionIndex((i) => clamp(i + 1, 0, (session?.questions?.length ?? 1) - 1))

  const endSession = () => {
    if (!session) return
    updateSession(session.id, { status: 'Completed', progress: 100 })
    setActive(false)
  }

  const onQaAction = (id, action) => {
    if (!session) return
    const next = qaItems.map((q) => {
      if (q.id !== id) return q
      if (action === 'approve') return { ...q, moderationStatus: 'approved' }
      if (action === 'reject') return { ...q, moderationStatus: 'rejected' }
      if (action === 'pin') return { ...q, pinned: !q.pinned }
      if (action === 'answered') return { ...q, answerStatus: 'answered' }
      if (action === 'pending') return { ...q, answerStatus: 'pending' }
      return q
    })
    updateSession(session.id, { qaItems: next })
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600 shadow-sm">
        No session selected. Go to <strong>Dashboard</strong> and click <strong>Launch</strong>.
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
    <section className="min-h-[calc(100vh-6rem)] space-y-4">
      {/* Top strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white/70 p-4 shadow-sm shadow-blue-900/5 backdrop-blur">
        <div className="min-w-[240px]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-800">Live Present Mode</p>
          <p className="mt-1 text-lg font-bold text-navy-900">{session.title}</p>
          <p className="mt-1 text-xs text-slate-600">
            Session {session.id} • {session.status}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={session.id}
            onChange={(e) => navigate(`/live?session=${encodeURIComponent(e.target.value)}`)}
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
            onClick={() => setLeaderboardOpen((p) => !p)}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
              leaderboardOpen ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200/70 bg-white/90 text-slate-700 hover:bg-blue-50'
            }`}
          >
            <Trophy className="size-4" />
            Leaderboard
          </button>

          <button
            type="button"
            onClick={() => setNotesOpen((p) => !p)}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
              notesOpen ? 'border-indigo-200 bg-indigo-50 text-indigo-900' : 'border-blue-200/70 bg-white/90 text-slate-700 hover:bg-blue-50'
            }`}
          >
            <MessageSquare className="size-4" />
            Notes
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/70 bg-white/90 px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
          >
            <Eye className="size-4" />
            Preview
          </button>

          <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25">
            <Users className="size-4" />
            {participants} live
          </span>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.05fr_1fr]">
        {/* Left controls + question */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200/70 bg-white/85 p-6 shadow-sm shadow-blue-900/5 backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Current question</p>
                <h3 className="mt-2 text-xl font-bold leading-snug text-navy-900">
                  {question?.text?.trim() ? question.text : 'Untitled question'}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {questionIndex + 1} / {session.questions?.length ?? 0} • {question?.type ?? '—'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-50"
                  disabled={questionIndex === 0}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setActive((p) => !p)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition ${
                    active ? 'bg-linear-to-r from-emerald-600 to-teal-600 shadow-emerald-900/15' : 'bg-linear-to-r from-slate-700 to-navy-900 shadow-blue-900/10'
                  }`}
                >
                  {active ? <Square className="size-4" /> : <Play className="size-4" />}
                  {active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-50"
                  disabled={questionIndex >= (session.questions?.length ?? 1) - 1}
                >
                  Next
                  <ChevronRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={endSession}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  End Session
                </button>
              </div>
            </div>

            {question?.media?.url && question.media.kind === 'image' && (
              <img
                src={question.media.url}
                alt="Question media"
                className="mt-5 max-h-[420px] w-full rounded-2xl border border-blue-100 bg-slate-50 object-contain"
              />
            )}
            {question?.media?.url && question.media.kind === 'video' && (
              <video
                src={question.media.url}
                controls
                className="mt-5 max-h-[420px] w-full rounded-2xl border border-blue-100 bg-slate-50"
              />
            )}

            <div className="mt-5 rounded-2xl border border-blue-200/70 bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-navy-900">Response rate</p>
                <p className="text-sm font-semibold text-slate-700">
                  {responded} / {participants} ({responseRate}%)
                </p>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-linear-to-r from-blue-600 to-indigo-600" style={{ width: `${responseRate}%` }} />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-200/70 bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-navy-900">Attempts & responses</p>
                  <p className="text-xs text-slate-600">
                    Showing latest responses for this question {showIdentity ? '' : '(anonymous mode)'}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {Object.keys(responsesByQuestion[question?.id] ?? {}).length} responded
                </span>
              </div>

              <div className="mt-4 max-h-[320px] overflow-auto rounded-2xl border border-blue-200/70 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-blue-100">
                      {showIdentity && <th className="px-4 py-3 font-semibold text-slate-700">Name</th>}
                      {showEmail && <th className="px-4 py-3 font-semibold text-slate-700">Email</th>}
                      <th className="px-4 py-3 font-semibold text-slate-700">Response</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantList.map((p) => {
                      const entry = (responsesByQuestion[question?.id] ?? {})[p.id]
                      return (
                        <tr key={p.id} className="border-b border-blue-50 last:border-b-0">
                          {showIdentity && <td className="px-4 py-3 text-slate-700">{p.name}</td>}
                          {showEmail && <td className="px-4 py-3 text-slate-600">{p.email}</td>}
                          <td className="px-4 py-3 text-slate-700">
                            {entry ? (
                              <span className="font-semibold text-navy-900">{entry.response}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {entry ? new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Presenter notes */}
          {notesOpen && (
            <div className="rounded-2xl border border-indigo-200/70 bg-white/85 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-navy-900">Presenter notes</p>
                <button
                  type="button"
                  onClick={() => setNotesOpen(false)}
                  className="rounded-xl border border-indigo-200/70 p-2 text-slate-600 transition hover:bg-indigo-50"
                  aria-label="Close notes"
                >
                  <X className="size-4" />
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes only you can see..."
                className="mt-3 h-28 w-full resize-none rounded-2xl border border-indigo-200/70 bg-white p-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>
          )}
        </div>

        {/* Right: live chart + QA */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200/70 bg-white/85 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Live chart</p>
                <p className="mt-1 text-sm text-slate-600">Auto-updates while active</p>
              </div>
              <div className="flex items-center gap-2">
                {['Bar', 'Pie'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setChartMode(m)}
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                      chartMode === m ? 'bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 text-white shadow' : 'border border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="h-[340px] rounded-2xl border border-blue-200/70 bg-white/85 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === 'Pie' ? (
                    <PieChart>
                      <Tooltip />
                      <Pie data={optionData} dataKey="value" nameKey="name" outerRadius={120} innerRadius={60}>
                        {optionData.map((entry, idx) => (
                          <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  ) : (
                    <BarChart data={optionData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                        {optionData.map((entry, idx) => (
                          <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Floating Q&A panel */}
          <div className="rounded-2xl border border-blue-200/70 bg-white/85 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-navy-900">Q&A panel</p>
                <p className="text-xs text-slate-600">Approve / reject / pin incoming questions</p>
              </div>
              <button
                type="button"
                onClick={() => setQaOpen((p) => !p)}
                className="rounded-2xl border border-blue-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
              >
                {qaOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {qaOpen && (
              <div className="mt-4 space-y-2">
                {qaItems
                  .slice()
                  .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                  .map((q) => (
                    <div key={q.id} className="rounded-2xl border border-blue-200/70 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {q.pinned && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                <Pin className="size-3" /> Pinned
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                q.moderationStatus === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : q.moderationStatus === 'rejected'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {q.moderationStatus}
                            </span>
                            {q.moderationStatus === 'approved' && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  q.answerStatus === 'answered' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'
                                }`}
                              >
                                {q.answerStatus}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-semibold text-navy-900">{q.text}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onQaAction(q.id, 'approve')}
                            className="rounded-xl border border-emerald-200 bg-white p-2 text-emerald-700 transition hover:bg-emerald-50"
                            aria-label="Approve"
                          >
                            <ThumbsUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onQaAction(q.id, 'reject')}
                            className="rounded-xl border border-red-200 bg-white p-2 text-red-700 transition hover:bg-red-50"
                            aria-label="Reject"
                          >
                            <ThumbsDown className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onQaAction(q.id, 'pin')}
                            className="rounded-xl border border-amber-200 bg-white p-2 text-amber-800 transition hover:bg-amber-50"
                            aria-label="Pin"
                          >
                            <Pin className="size-4" />
                          </button>
                          {q.moderationStatus === 'approved' && (
                            <button
                              type="button"
                              onClick={() => onQaAction(q.id, q.answerStatus === 'answered' ? 'pending' : 'answered')}
                              className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-50"
                            >
                              {q.answerStatus === 'answered' ? 'Mark pending' : 'Mark answered'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard overlay */}
      {leaderboardOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-navy-950/20 backdrop-blur-sm"
            onClick={() => setLeaderboardOpen(false)}
            aria-label="Close leaderboard"
          />
          <div className="relative mx-auto mt-20 w-[min(92vw,520px)] rounded-2xl border border-amber-200/70 bg-white p-5 shadow-2xl shadow-blue-900/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Leaderboard</p>
                <h3 className="mt-1 text-xl font-bold text-navy-900">Top 10</h3>
              </div>
              <button
                type="button"
                onClick={() => setLeaderboardOpen(false)}
                className="rounded-xl border border-amber-200/70 p-2 text-slate-600 transition hover:bg-amber-50"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {leaderboard.map((row, idx) => (
                <div key={row.name} className="flex items-center justify-between rounded-2xl border border-amber-200/60 bg-amber-50/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white">
                      {idx === 0 ? <Crown className="size-4" /> : idx + 1}
                    </div>
                    <p className="font-semibold text-navy-900">{row.name}</p>
                  </div>
                  <p className="text-sm font-bold text-navy-900">{row.score}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal open={previewOpen} title="Preview Participant View" onClose={() => setPreviewOpen(false)}>
        <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Participant View</p>
          <h3 className="mt-2 text-lg font-bold text-navy-900">{question?.text?.trim() ? question.text : 'Untitled question'}</h3>
          <p className="mt-1 text-sm text-slate-600">Type: {question?.type ?? '—'}</p>
        </div>
      </Modal>
    </section>
  )
}

export default LivePage

