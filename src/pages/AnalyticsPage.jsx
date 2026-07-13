import { Download, Loader2, Printer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { AnalyticsExportModal } from '../components/analytics/AnalyticsExportModal'
import { AnalyticsQuestionChartSection } from '../components/analytics/AnalyticsQuestionChartSection'
import { AnalyticsQuestionInsights } from '../components/analytics/AnalyticsQuestionInsights'
import { AnalyticsPrintReport } from '../components/analytics/AnalyticsPrintReport'
import { SessionSummaryPrintReport } from '../components/analytics/SessionSummaryPrintReport'
import { SessionSummaryReportCard } from '../components/analytics/SessionSummaryReportCard'
import { QaAnalyticsPrintReport } from '../components/analytics/QaAnalyticsPrintReport'
import { QaAnalyticsReportCard } from '../components/analytics/QaAnalyticsReportCard'
import { ParticipantLeaderboardTable } from '../components/analytics/ParticipantLeaderboardTable'
import { PerQuestionReportDetails } from '../components/analytics/PerQuestionReportDetails'
import { SESSION_REPORT_VIEWS } from '../constants/sessionReportTypes'
import { buildAnalyticsCsvRows, mapAnalyticsPerQuestion } from '../utils/analyticsQuestions'
import { buildEmojiBarData } from '../utils/emojiReaction'
import { exportQaAnalyticsExcel } from '../utils/qaAnalyticsExcelExport'
import { exportPerParticipantExcel } from '../utils/perParticipantExcelExport'
import { exportPerQuestionBreakdownExcel } from '../utils/perQuestionBreakdownExcelExport'
import { exportSessionSummaryExcel } from '../utils/sessionSummaryExcelExport'
import { useShell } from '../context/ShellContext'
import { useDepartmentSessionsList, getPreferredAnalyticsSessionId } from '../hooks/useHostNavSessions'
import {
  getSessionParticipantsReportApi,
  getSessionQuestionsReportApi,
  getSessionQaReportApi,
  getSessionReportApi,
  getSessionSummaryReportApi,
} from '../services/analyticsApi'
import { listSessionQuestionsApi } from '../services/builderApi'
import { getQuestionResultsApi, getSessionResponsesApi } from '../services/liveApi'
import { ReportPreviewModal } from '../components/reports/ReportPreviewModal'
import { useAuthStore } from '../store/authStore'

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

function AnalyticsPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const navigate = useNavigate()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { departmentId } = useShell()
  const { sessions, isFetching: sessionsFetching } = useDepartmentSessionsList()
  const prevDepartmentIdRef = useRef(departmentId)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [chartView, setChartView] = useState('bar')
  const [activeReportView, setActiveReportView] = useState('summary')
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportingReportId, setExportingReportId] = useState(null)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)

  const defaultSessionId = getPreferredAnalyticsSessionId(sessions)

  useEffect(() => {
    if (!sessionId && defaultSessionId) {
      navigate(`/analytics?session=${encodeURIComponent(defaultSessionId)}`, { replace: true })
    }
  }, [sessionId, defaultSessionId, navigate])

  useEffect(() => {
    if (!departmentId) return
    if (sessionsFetching) return

    const departmentChanged = prevDepartmentIdRef.current !== departmentId

    if (departmentChanged) {
      prevDepartmentIdRef.current = departmentId
      setSelectedQuestionId(null)
      setActiveReportView('summary')

      const next = getPreferredAnalyticsSessionId(sessions)
      if (next && String(sessionId) !== String(next)) {
        navigate(`/analytics?session=${encodeURIComponent(next)}`, { replace: true })
        return
      }
      if (!next && sessionId) {
        navigate('/analytics', { replace: true })
      }
      return
    }

    if (!sessions.length) return
    if (!sessionId) return
    const inDept = sessions.some((s) => String(s.id) === String(sessionId))
    if (inDept) return
    const next = getPreferredAnalyticsSessionId(sessions)
    if (next) {
      navigate(`/analytics?session=${encodeURIComponent(next)}`, { replace: true })
    }
  }, [departmentId, sessions, sessionId, sessionsFetching, navigate])

  const activeSessionId = sessionId || defaultSessionId
  const sessionInCurrentDepartment = useMemo(
    () =>
      !activeSessionId || !sessions.length
        ? true
        : sessions.some((s) => String(s.id) === String(activeSessionId)),
    [activeSessionId, sessions],
  )
  const numericSessionId =
    sessionInCurrentDepartment && isBackendSessionId(activeSessionId) ? activeSessionId : null

  const reportQuery = useQuery({
    queryKey: ['analytics-session-report', numericSessionId],
    queryFn: () => getSessionReportApi(accessToken, numericSessionId),
    enabled: Boolean(accessToken && numericSessionId),
  })

  const summaryReportQuery = useQuery({
    queryKey: ['session-summary-report', numericSessionId],
    queryFn: () => getSessionSummaryReportApi(accessToken, numericSessionId),
    enabled: Boolean(accessToken && numericSessionId),
  })

  const questionsReportQuery = useQuery({
    queryKey: ['session-questions-report', numericSessionId],
    queryFn: () => getSessionQuestionsReportApi(accessToken, numericSessionId),
    enabled: Boolean(accessToken && numericSessionId),
  })

  const participantsReportQuery = useQuery({
    queryKey: ['session-participants-report', numericSessionId],
    queryFn: () => getSessionParticipantsReportApi(accessToken, numericSessionId),
    enabled: Boolean(accessToken && numericSessionId),
  })

  const qaReportQuery = useQuery({
    queryKey: ['session-qa-report', numericSessionId],
    queryFn: () => getSessionQaReportApi(accessToken, numericSessionId),
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
      return mapAnalyticsPerQuestion(q, idx, breakdown, results, allResponses)
    })
  }, [sortedQuestions, breakdownByQuestionId, resultsByQuestionId, allResponses])

  useEffect(() => {
    setSelectedQuestionId(null)
    setChartView('bar')
    setActiveReportView('summary')
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

  const questionsReport = questionsReportQuery.data
  const questionsReportById = useMemo(() => {
    const map = {}
    for (const question of questionsReport?.questions || []) {
      map[question.question_id] = question
    }
    return map
  }, [questionsReport?.questions])

  const selectedQuestionReport = useMemo(() => {
    if (!selectedQuestion) return null
    const report = questionsReportById[Number(selectedQuestion.id)]
    if (!report) return null
    return {
      ...report,
      total_participants: questionsReport?.total_participants ?? summary.joined,
    }
  }, [selectedQuestion, questionsReportById, questionsReport?.total_participants, summary.joined])

  const leaderboard = useMemo(() => buildLeaderboard(allResponses), [allResponses])

  const isPollOrSurveySession = useMemo(() => {
    if (!sortedQuestions.length) return false
    return sortedQuestions.every(
      (q) => q.question_type === 'poll' || q.question_type === 'survey',
    )
  }, [sortedQuestions])

  const buildRawResponseExportRows = () => {
    if (!sessionMeta) {
      return { rawResponseRows: [], emojiSummaryRows: [] }
    }

    let rawResponseRows = buildAnalyticsCsvRows({
      sessionMeta,
      sortedQuestions,
      allResponses,
    })

    if (!rawResponseRows.length) {
      rawResponseRows = perQuestion.map((q) => [
        sessionMeta.id,
        sessionMeta.title,
        String(q.index),
        q.type,
        q.surveySubType || '',
        q.text?.replaceAll('"', '""') ?? '',
        '',
        '',
        '',
        '',
      ])
    }

    const emojiSummaryRows = []
    const emojiQuestions = (sortedQuestions || []).filter((q) => q.question_type === 'emoji_reaction')
    for (const question of emojiQuestions) {
      const questionResponses = (allResponses || []).filter(
        (row) => Number(row.question_id) === Number(question.question_id),
      )
      const { rows: emojiRows } = buildEmojiBarData(question, null, questionResponses)
      const emojiCols = Array.from({ length: 5 }, (_, index) => emojiRows[index]?.emoji ?? '')
      const countCols = Array.from({ length: 5 }, (_, index) => String(emojiRows[index]?.count ?? 0))
      emojiSummaryRows.push([
        sessionMeta.id,
        sessionMeta.title,
        String(question.display_order ?? ''),
        (question.question_text || '').replaceAll('"', '""'),
        ...emojiCols,
        ...countCols,
      ])
    }

    return { rawResponseRows, emojiSummaryRows }
  }

  const exportParticipantReport = async () => {
    const report =
      participantsReportQuery.data ||
      (await getSessionParticipantsReportApi(accessToken, numericSessionId))
    const { rawResponseRows, emojiSummaryRows } = buildRawResponseExportRows()
    await exportPerParticipantExcel(report, {
      showScore: !isPollOrSurveySession,
      rawResponseRows,
      emojiSummaryRows,
    })
  }

  const handleExportReport = async (reportId) => {
    try {
      setExportingReportId(reportId)
      if (reportId === 'summary') {
        const report =
          summaryReportQuery.data ||
          (await getSessionSummaryReportApi(accessToken, numericSessionId))
        await exportSessionSummaryExcel(report)
      } else if (reportId === 'question-breakdown') {
        const report =
          questionsReportQuery.data ||
          (await getSessionQuestionsReportApi(accessToken, numericSessionId))
        await exportPerQuestionBreakdownExcel(report)
      } else if (reportId === 'participants') {
        await exportParticipantReport()
      } else if (reportId === 'qa') {
        const report =
          qaReportQuery.data || (await getSessionQaReportApi(accessToken, numericSessionId))
        await exportQaAnalyticsExcel(report)
      }
      setExportModalOpen(false)
    } catch (error) {
      console.error(error)
      window.alert(error?.message || 'Export failed')
    } finally {
      setExportingReportId(null)
    }
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
      questionsQuery.isLoading ||
      responsesQuery.isLoading)

  const summaryReportLoading = summaryReportQuery.isLoading
  const summaryReport = summaryReportQuery.data
  const questionsReportLoading = questionsReportQuery.isLoading
  const participantsReport = participantsReportQuery.data
  const participantsReportLoading = participantsReportQuery.isLoading
  const qaReport = qaReportQuery.data
  const qaReportLoading = qaReportQuery.isLoading

  const openPdfPreview = async () => {
    if (activeReportView === 'summary' && !summaryReport && accessToken && numericSessionId) {
      await summaryReportQuery.refetch()
    }
    if (activeReportView === 'question-breakdown' && !questionsReport && accessToken && numericSessionId) {
      await questionsReportQuery.refetch()
    }
    if (activeReportView === 'qa-analytics' && !qaReport && accessToken && numericSessionId) {
      await qaReportQuery.refetch()
    }

    setPdfPreviewOpen(true)
  }

  const reportSlug =
    activeReportView === 'summary'
      ? 'summary'
      : activeReportView === 'qa-analytics'
        ? 'qa-analytics'
        : 'analytics'

  const pdfFilename = `session-${sessionMeta?.id || numericSessionId}-${reportSlug}-report.pdf`

  const pdfPreviewTitle =
    activeReportView === 'summary'
      ? 'Session summary report'
      : activeReportView === 'qa-analytics'
        ? 'Q&A analytics report'
        : 'Session analytics report'

  const pdfPreviewContent =
    activeReportView === 'summary' ? (
      <SessionSummaryPrintReport report={summaryReport} />
    ) : activeReportView === 'qa-analytics' ? (
      <QaAnalyticsPrintReport report={qaReport} />
    ) : (
      <AnalyticsPrintReport
        sessionMeta={sessionMeta}
        summary={summary}
        perQuestion={perQuestion}
        leaderboard={leaderboard}
      />
    )

  const loadError =
    reportQuery.error ||
    questionsQuery.error ||
    summaryReportQuery.error ||
    questionsReportQuery.error ||
    participantsReportQuery.error ||
    qaReportQuery.error

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
    <>
      <ReportPreviewModal
        open={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        title={pdfPreviewTitle}
        filename={pdfFilename}
      >
        {pdfPreviewContent}
      </ReportPreviewModal>

      <section className="host-screen-only analytics-screen-only space-y-6">
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
            onClick={() => setExportModalOpen(true)}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/70 bg-white/90 px-4 text-sm font-semibold text-slate-700 shadow-sm shadow-blue-900/5 transition hover:bg-blue-50 disabled:opacity-50"
          >
            <Download className="size-4" />
             Download Report
          </button>
          <button
            type="button"
            onClick={openPdfPreview}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110 disabled:opacity-50"
          >
            <Printer className="size-4" />
            PDF Report
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

      <div className="flex flex-wrap gap-2">
        {SESSION_REPORT_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => setActiveReportView(view.id)}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeReportView === view.id
                ? 'bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-white shadow-md shadow-navy-900/20'
                : 'border border-blue-200/70 bg-white/90 text-slate-700 hover:bg-blue-50'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {activeReportView === 'summary' ? (
        <SessionSummaryReportCard report={summaryReport} isLoading={summaryReportLoading} />
      ) : activeReportView === 'qa-analytics' ? (
        // Q&A analytics: Anonymous vs named pie chart disabled in QaAnalyticsReportCard
        <QaAnalyticsReportCard report={qaReport} isLoading={qaReportLoading} />
      ) : (
      <>
      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-navy-900">Per-question breakdown</p>
            <p className="text-xs text-slate-600">
              {perQuestion.length} question{perQuestion.length === 1 ? '' : 's'} • select a question for charts and report metrics
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
                const questionReport = questionsReportById[Number(q.id)]
                const responseRate = questionReport?.response_rate_percent
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
                          {q.typeLabel || q.type}
                        </span>
                      </div>
                      <span className={`text-xs font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {q.responseCount} resp.
                        {responseRate != null ? ` · ${responseRate}%` : ''}
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
                        {selectedQuestion.typeLabel || selectedQuestion.type}
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

                <PerQuestionReportDetails questionReport={selectedQuestionReport} />

                {questionsReportLoading && !selectedQuestionReport ? (
                  <p className="mt-4 text-sm text-slate-600">Loading per-question report metrics…</p>
                ) : null}

                <AnalyticsQuestionInsights question={selectedQuestion} />
              </div>
            ) : null}
          </div>
        )}
      </div>

      <ParticipantLeaderboardTable
        leaderboard={participantsReport?.leaderboard}
        isLoading={participantsReportLoading}
        showScore={!isPollOrSurveySession}
        onExport={async () => {
          try {
            setExportingReportId('participants')
            await exportParticipantReport()
          } catch (error) {
            console.error(error)
            window.alert(error?.message || 'Export failed')
          } finally {
            setExportingReportId(null)
          }
        }}
        isExporting={exportingReportId === 'participants'}
      />
      </>
      )}

      <AnalyticsExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportReport}
        exportingId={exportingReportId}
      />

    </section>
    </>
  )
}

export default AnalyticsPage
