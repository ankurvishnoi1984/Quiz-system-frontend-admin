import { Download, FileText, Loader2, Printer, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { AnalyticsQuestionChartSection } from '../components/analytics/AnalyticsQuestionChartSection'
import { AnalyticsQuestionInsights } from '../components/analytics/AnalyticsQuestionInsights'
import Modal from '../components/ui/Modal'
import { wordCountsFromApiResults, wordCountsFromResponses } from '../utils/wordCloud'
import { useShell } from '../context/ShellContext'
import { useDepartmentSessionsList } from '../hooks/useHostNavSessions'
import { getSessionReportApi } from '../services/analyticsApi'
import { getSessionDetailApi, listSessionQuestionsApi } from '../services/builderApi'
import { getQuestionResultsApi, getSessionResponsesApi } from '../services/liveApi'
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

function isBackendSessionId(id) {
  const n = Number(id)
  return Number.isFinite(n) && n > 0 && String(n) === String(id).trim()
}

function formatStatus(status) {
  const map = {
    draft: 'Draft',
    live: 'Live',
    paused: 'Paused',
    completed: 'Completed',
    archived: 'Archived',
  }
  return map[status] || status || '—'
}

function apiQuestionTypeToUi(type) {
  const mapping = {
    mcq: 'MCQ',
    word_cloud: 'Word Cloud',
    rating: 'Rating',
    open_text: 'Text',
    true_false: 'True/False',
    ranking: 'Ranking',
    fill_blank: 'Text',
  }
  return mapping[type] || type || 'Text'
}

function formatSessionDuration(startedAt, endedAt) {
  if (!startedAt) return '—'
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  const mins = Math.max(0, Math.round((end - start) / 60000))
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function buildLeaderboard(responses) {
  const byParticipant = new Map()
  for (const row of responses || []) {
    const id = row.participant_id
    if (id == null) continue
    const name = row.participant?.nickname || `Participant ${id}`
    const entry = byParticipant.get(id) || { name, score: 0 }
    entry.score += Number(row.points_earned || 0)
    byParticipant.set(id, entry)
  }
  return [...byParticipant.values()].sort((a, b) => b.score - a.score).slice(0, 10)
}

function chartFromQuestionResults(results, question) {
  const type = question.question_type
  const total = results?.total_responses || 0
  const options = question.question_options || []

  if ((type === 'mcq' || type === 'true_false') && options.length) {
    const byOption = results?.by_option || {}
    return options.map((opt) => {
      const count = Number(byOption[String(opt.option_id)] || 0)
      return {
        name: opt.option_text,
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        count,
      }
    })
  }

  if (type === 'rating' && results?.average_rating != null) {
    return [{ name: `Avg ${results.average_rating}`, value: 100, count: total }]
  }

  return []
}

function correctRateForQuestion(question, responses) {
  if (!question?.is_quiz_mode) return null
  const qid = Number(question.question_id)
  const qResponses = (responses || []).filter((r) => Number(r.question_id) === qid)
  if (!qResponses.length) return null
  const correct = qResponses.filter((r) => r.is_correct).length
  return Math.round((correct / qResponses.length) * 100)
}

function AnalyticsPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const navigate = useNavigate()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { departmentId } = useShell()
  const { sessions } = useDepartmentSessionsList()

  const [pdfOpen, setPdfOpen] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [chartView, setChartView] = useState('bar')

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
  }, [sessionId, defaultSessionId, navigate])

  useEffect(() => {
    if (!departmentId || !sessions.length) return
    if (!sessionId) return
    const inDept = sessions.some((s) => String(s.id) === String(sessionId))
    if (inDept) return
    const next =
      sessions.find((s) => s.status === 'Completed')?.id ||
      sessions.find((s) => s.status === 'Live')?.id ||
      sessions[0]?.id
    if (next) {
      navigate(`/analytics?session=${encodeURIComponent(next)}`, { replace: true })
    }
  }, [departmentId, sessions, sessionId, navigate])

  const activeSessionId = sessionId || defaultSessionId
  const numericSessionId = isBackendSessionId(activeSessionId) ? activeSessionId : null

  const reportQuery = useQuery({
    queryKey: ['analytics-session-report', numericSessionId],
    queryFn: () => getSessionReportApi(accessToken, numericSessionId),
    enabled: Boolean(accessToken && numericSessionId),
  })

  const sessionDetailQuery = useQuery({
    queryKey: ['analytics-session-detail', numericSessionId],
    queryFn: () => getSessionDetailApi(accessToken, numericSessionId),
    enabled: Boolean(accessToken && numericSessionId),
  })

  const questionsQuery = useQuery({
    queryKey: ['analytics-session-questions', numericSessionId],
    queryFn: () => listSessionQuestionsApi(accessToken, numericSessionId),
    enabled: Boolean(accessToken && numericSessionId),
  })

  const responsesQuery = useQuery({
    queryKey: ['analytics-session-responses', numericSessionId],
    queryFn: () => getSessionResponsesApi(accessToken, numericSessionId),
    enabled: Boolean(accessToken && numericSessionId),
  })

  const sortedQuestions = useMemo(() => {
    return [...(questionsQuery.data || [])].sort(
      (a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0),
    )
  }, [questionsQuery.data])

  const questionResultsQueries = useQueries({
    queries: sortedQuestions.map((q) => ({
      queryKey: ['analytics-question-results', q.question_id],
      queryFn: () => getQuestionResultsApi(accessToken, q.question_id),
      enabled: Boolean(accessToken && numericSessionId),
      staleTime: 30_000,
    })),
  })

  const resultsByQuestionId = useMemo(() => {
    const map = {}
    sortedQuestions.forEach((q, idx) => {
      map[q.question_id] = questionResultsQueries[idx]?.data ?? null
    })
    return map
  }, [sortedQuestions, questionResultsQueries])

  const breakdownByQuestionId = useMemo(() => {
    const map = {}
    for (const row of reportQuery.data?.question_breakdown || []) {
      map[row.question_id] = row
    }
    return map
  }, [reportQuery.data?.question_breakdown])

  const report = reportQuery.data
  const sessionDetail = sessionDetailQuery.data
  const allResponses = responsesQuery.data || []

  const listSession = activeSessionId ? sessions.find((s) => String(s.id) === String(activeSessionId)) : null

  const sessionMeta = useMemo(() => {
    if (report?.session) {
      return {
        id: String(report.session.session_id),
        title: report.session.title,
        status: formatStatus(report.session.status),
        startedAt: report.session.started_at,
        endedAt: report.session.ended_at,
      }
    }
    if (listSession) {
      return {
        id: listSession.id,
        title: listSession.title,
        status: listSession.status,
        startedAt: null,
        endedAt: null,
      }
    }
    return null
  }, [report?.session, listSession])

  const summary = useMemo(() => {
    if (report?.stats) {
      const { participant_count, active_responders, response_rate_percent } = report.stats
      return {
        joined: participant_count ?? 0,
        responded: active_responders ?? 0,
        avg: response_rate_percent ?? 0,
        duration: formatSessionDuration(sessionMeta?.startedAt, sessionMeta?.endedAt),
      }
    }
    return {
      joined: listSession?.participants ?? 0,
      responded: 0,
      avg: 0,
      duration: '—',
    }
  }, [report?.stats, sessionMeta?.startedAt, sessionMeta?.endedAt, listSession?.participants])

  const perQuestion = useMemo(() => {
    return sortedQuestions.map((q, idx) => {
      const breakdown = breakdownByQuestionId[q.question_id]
      const results = resultsByQuestionId[q.question_id]
      const uiType = apiQuestionTypeToUi(q.question_type)
      const responseCount = breakdown?.response_count ?? results?.total_responses ?? 0
      const chart = chartFromQuestionResults(results, q)
      const correctRate = correctRateForQuestion(q, allResponses)
      const questionResponses = (allResponses || []).filter(
        (r) => Number(r.question_id) === Number(q.question_id),
      )
      const apiWordCounts = wordCountsFromApiResults(results)
      const wordCloud =
        q.question_type === 'word_cloud'
          ? apiWordCounts.length
            ? apiWordCounts
            : wordCountsFromResponses(questionResponses)
          : []

      return {
        id: String(q.question_id),
        index: idx + 1,
        type: uiType,
        text: q.question_text || breakdown?.question_text || '',
        responseCount,
        correctRate,
        chart,
        wordCloud,
        rawType: q.question_type,
        rankingAnalytics: results?.ranking_analytics || null,
      }
    })
  }, [sortedQuestions, breakdownByQuestionId, resultsByQuestionId, allResponses])

  useEffect(() => {
    setSelectedQuestionId(null)
    setChartView('bar')
  }, [numericSessionId])

  useEffect(() => {
    setChartView('bar')
  }, [selectedQuestionId])

  useEffect(() => {
    if (!perQuestion.length) {
      setSelectedQuestionId(null)
      return
    }
    const isValid = selectedQuestionId && perQuestion.some((q) => q.id === selectedQuestionId)
    if (!isValid) {
      setSelectedQuestionId(perQuestion[0].id)
    }
  }, [perQuestion, selectedQuestionId])

  const selectedQuestion = useMemo(() => {
    if (!perQuestion.length) return null
    return perQuestion.find((q) => q.id === selectedQuestionId) ?? perQuestion[0]
  }, [perQuestion, selectedQuestionId])

  const leaderboard = useMemo(() => buildLeaderboard(allResponses), [allResponses])

  const settingsSnapshot = useMemo(() => {
    const d = sessionDetail
    if (!d) {
      return {
        joinRequirement: listSession?.joinRequirement ?? 'name',
        timeLimitLabel: 'Off',
        quizMode: false,
        maxParticipants: 0,
        anonymous: listSession?.joinRequirement === 'anonymous',
        password: false,
        leaderboard: true,
      }
    }
    const timed = sortedQuestions.some((q) => Number(q.time_limit_seconds) > 0)
    const maxTime = sortedQuestions.reduce(
      (max, q) => Math.max(max, Number(q.time_limit_seconds) || 0),
      0,
    )
    return {
      joinRequirement: d.join_type ?? 'name',
      timeLimitLabel: timed ? (maxTime ? `${maxTime}s (max per question)` : 'Varies') : 'Off',
      quizMode: sortedQuestions.some((q) => q.is_quiz_mode),
      maxParticipants: d.max_participants ?? 0,
      anonymous: d.join_type === 'anonymous',
      password: Boolean(d.password_hash),
      leaderboard: Boolean(d.leaderboard_enabled),
    }
  }, [sessionDetail, listSession, sortedQuestions])

  const exportCsv = () => {
    if (!sessionMeta) return
    const headers = [
      'sessionId',
      'sessionTitle',
      'questionIndex',
      'questionType',
      'questionText',
      'participant',
      'response',
      'points',
      'isCorrect',
    ]
    const questionOrder = new Map(sortedQuestions.map((q, i) => [Number(q.question_id), i + 1]))

    const rows = allResponses.map((r) => {
      const qIdx = questionOrder.get(Number(r.question_id)) ?? ''
      const responseText =
        r.question_option?.option_text ||
        r.text_response ||
        (r.rating_value != null ? String(r.rating_value) : '')
      return [
        sessionMeta.id,
        sessionMeta.title,
        String(qIdx),
        apiQuestionTypeToUi(r.question?.question_type),
        (r.question?.question_text ?? '').replaceAll('"', '""'),
        r.participant?.nickname ?? '',
        responseText,
        String(r.points_earned ?? 0),
        r.is_correct == null ? '' : r.is_correct ? 'yes' : 'no',
      ]
    })

    if (!rows.length) {
      perQuestion.forEach((q) => {
        rows.push([sessionMeta.id, sessionMeta.title, String(q.index), q.type, q.text?.replaceAll('"', '""') ?? '', '', '', '', ''])
      })
    }

    const csv = [headers.join(','), ...rows.map((r) => r.map((x) => `"${String(x ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    downloadText(`session-${sessionMeta.id}-responses.csv`, csv, 'text/csv')
  }

  const printPdf = () => {
    setPdfOpen(true)
    setTimeout(() => window.print(), 50)
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

  const isLoading =
    Boolean(numericSessionId) &&
    (reportQuery.isLoading ||
      sessionDetailQuery.isLoading ||
      questionsQuery.isLoading ||
      responsesQuery.isLoading)

  const loadError = reportQuery.error || questionsQuery.error

  if (!activeSessionId || !sessionMeta) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600 shadow-sm">
        No session selected. Go to <strong>Dashboard</strong> and choose a session.
      </div>
    )
  }

  if (!numericSessionId) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/80 p-10 text-center text-slate-700 shadow-sm">
        <p className="font-semibold text-navy-900">Session analytics requires a saved session</p>
        <p className="mt-2 text-sm">Select a session from your department list on the dashboard.</p>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Session Analytics</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">{sessionMeta.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Session {sessionMeta.id} • {sessionMeta.status}
            {isLoading && (
              <span className="ml-2 inline-flex items-center gap-1 text-navy-600">
                <Loader2 className="size-3.5 animate-spin" />
                Loading…
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeSessionId}
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
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/70 bg-white/90 px-4 text-sm font-semibold text-slate-700 shadow-sm shadow-blue-900/5 transition hover:bg-blue-50 disabled:opacity-50"
          >
            <Download className="size-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={printPdf}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
          >
            <Printer className="size-4" />
            PDF report
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {loadError.message || 'Failed to load analytics'}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total joined', summary.joined.toLocaleString(), 'Participants entered the session'],
          ['Total responded', summary.responded.toLocaleString(), 'Submitted at least one response'],
          ['Avg response rate', `${summary.avg}%`, 'Unique responders / participants'],
          ['Session duration', summary.duration, 'From session start to end'],
        ].map(([label, value, hint]) => (
          <div
            key={label}
            className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5 backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-navy-900">{value}</p>
            <p className="mt-2 text-sm text-slate-600">{hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-navy-900">Per-question breakdown</p>
            <p className="text-xs text-slate-600">
              {perQuestion.length} question{perQuestion.length === 1 ? '' : 's'} • select a question to view its chart
            </p>
          </div>
        </div>

        {!perQuestion.length && !isLoading ? (
          <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-white/80 p-8 text-center text-sm text-slate-600">
            No questions in this session yet.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="max-h-[min(520px,70vh)] space-y-2 overflow-y-auto pr-1">
              {perQuestion.map((q) => {
                const isSelected = selectedQuestion?.id === q.id
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedQuestionId(q.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-navy-600 bg-linear-to-r from-navy-900 via-navy-800 to-navy-700 text-white shadow-md shadow-navy-900/20'
                        : 'border-blue-200/70 bg-white hover:border-blue-300 hover:bg-blue-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Q{q.index}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isSelected ? 'bg-white/15 text-white' : 'bg-blue-50 text-navy-700'
                          }`}
                        >
                          {q.type}
                        </span>
                      </div>
                      <span className={`text-xs font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {q.responseCount} resp.
                      </span>
                    </div>
                    <p
                      className={`mt-2 line-clamp-2 text-sm font-semibold ${
                        isSelected ? 'text-white' : 'text-navy-900'
                      }`}
                    >
                      {q.text || 'Untitled question'}
                    </p>
                  </button>
                )
              })}
            </div>

            {selectedQuestion ? (
              <div className="min-h-[320px] rounded-2xl border border-blue-200/70 bg-white/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-blue-100 pb-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        Q{selectedQuestion.index}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-navy-700">
                        {selectedQuestion.type}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-navy-900">
                      {selectedQuestion.text || 'Untitled question'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Responses</p>
                    <p className="mt-1 text-2xl font-bold text-navy-900">{selectedQuestion.responseCount}</p>
                  </div>
                </div>

                <AnalyticsQuestionChartSection
                  question={selectedQuestion}
                  participantsJoined={summary.joined}
                  chartView={chartView}
                  onChartViewChange={setChartView}
                />

                <AnalyticsQuestionInsights question={selectedQuestion} />
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-amber-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Leaderboard</p>
              <h3 className="mt-1 text-lg font-bold text-navy-900">Top participants</h3>
            </div>
            <Trophy className="size-5 text-amber-600" />
          </div>
          <div className="mt-4 space-y-2">
            {leaderboard.length ? (
              leaderboard.map((row, idx) => (
                <div
                  key={`${row.name}-${idx}`}
                  className="flex items-center justify-between rounded-2xl border border-amber-200/60 bg-amber-50/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white">
                      {idx + 1}
                    </div>
                    <p className="font-semibold text-navy-900">{row.name}</p>
                  </div>
                  <p className="text-sm font-bold text-navy-900">{row.score}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">No scored responses yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Session settings</p>
              <h3 className="mt-1 text-lg font-bold text-navy-900">Snapshot</h3>
            </div>
            <FileText className="size-5 text-navy-700" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Join requirement</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{settingsSnapshot.joinRequirement}</p>
              <p className="mt-1 text-xs text-slate-600">Controls what participants must enter</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Time limit</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{settingsSnapshot.timeLimitLabel}</p>
              <p className="mt-1 text-xs text-slate-600">Per question</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quiz mode</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{settingsSnapshot.quizMode ? 'Enabled' : 'Disabled'}</p>
              <p className="mt-1 text-xs text-slate-600">Correct answers + points</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Max participants</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{settingsSnapshot.maxParticipants}</p>
              <p className="mt-1 text-xs text-slate-600">Capacity control</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Anonymous</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{settingsSnapshot.anonymous ? 'Yes' : 'No'}</p>
              <p className="mt-1 text-xs text-slate-600">Identity hidden in reports</p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Leaderboard</p>
              <p className="mt-1 text-sm font-bold text-navy-900">{settingsSnapshot.leaderboard ? 'Enabled' : 'Disabled'}</p>
              <p className="mt-1 text-xs text-slate-600">Shown to participants</p>
            </div>
          </div>
        </div>
      </div>

      <Modal open={pdfOpen} title="PDF Report (Print)" onClose={() => setPdfOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Report</p>
            <h3 className="mt-2 text-lg font-bold text-navy-900">{sessionMeta.title}</h3>
            <p className="mt-1 text-sm text-slate-600">Session {sessionMeta.id}</p>
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
                <div
                  key={q.id}
                  className="flex items-start justify-between gap-3 border-b border-blue-50 py-2 last:border-b-0"
                >
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
              className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
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
