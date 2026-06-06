import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Eye,
  Layers,
  Play,
  Presentation,
  Rocket,
  Share2,
  Square,
  Trophy,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WordCloudChart from '../components/charts/WordCloudChart'
import { renderPieLabel } from '../components/charts/renderPieLabel'
import { CHART_COLORS, CHART_TOOLTIP_STYLE, getChartColor } from '../utils/chartColors'
import ShareSessionPanel from '../components/dashboard/ShareSessionPanel'
import Modal from '../components/ui/Modal'
import { HostAlertModal } from '../components/live/HostAlertModal'
import { HostQuestionActionButton } from '../components/live/HostQuestionActionButton'
import { canHostActivateAllQuestions, canHostCloseAllQuestions } from '../utils/hostQuestionControls'
import { HostNoSessionsEmpty } from '../components/layout/HostNoSessionsEmpty'
import { useHostNavSessions } from '../hooks/useHostNavSessions'
import { HostQuestionControls } from '../components/live/HostQuestionControls'
import { LiveChartViewToggle } from '../components/live/LiveChartViewToggle'
import { RankingLiveChartPanel } from '../components/live/RankingLiveChartPanel'
import { useHostQuestionMutations } from '../hooks/useHostQuestionMutations'
import { LiveQaPanel } from '../components/leaderboard/LiveQaPanel'
import { QuestionLeaderboardModal } from '../components/leaderboard/QuestionLeaderboardModal'
import { QuestionLeaderboardPanel } from '../components/leaderboard/QuestionLeaderboardPanel'
import { SessionLeaderboardModal } from '../components/leaderboard/SessionLeaderboardModal'
import {
  buildQuestionLeaderboardForQuestion,
  buildSessionLeaderboardFromResponses,
} from '../utils/leaderboard'
import { exportQaAnalyticsExcel } from '../utils/qaAnalyticsExcelExport'
import { getSessionQaReportApi } from '../services/analyticsApi'
import { useAuthStore } from '../store/authStore'
import {
  getQuestionResultsApi,
  getSessionDetailApi,
  getSessionResponsesApi,
  listDepartmentSessionsApi,
  listQaQuestionsApi,
  listSessionQuestionsApi,
  qaModerateApi,
  transitionSessionApi,
} from '../services/liveApi'
import { formatQuizSubmitTimeCompact } from '../utils/quizResponseTime'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'
import {
  buildOptionChartData,
  buildRatingChartData,
  buildWordCloudData,
  mapLiveQuestions,
  questionUsesOptionChart,
} from '../utils/livePresentation'

function buildRankingResponseLabel(row, optionsById) {
  const order = Array.isArray(row?.ranking_order) ? row.ranking_order.map(Number).filter(Boolean) : []
  if (!order.length) return null
  return order
    .map((optionId, idx) => `${idx + 1}. ${optionsById.get(optionId) || `Option ${optionId}`}`)
    .join(' | ')
}

function LivePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const sessionId = searchParams.get('session') || ''
  const navSessionsQuery = useHostNavSessions()


  const [questionIndex, setQuestionIndex] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [socketStatus, setSocketStatus] = useState('disconnected')
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [questionLeaderboardOpen, setQuestionLeaderboardOpen] = useState(false)
  const [leaderboardLimit, setLeaderboardLimit] = useState(10)
  const [shareOpen, setShareOpen] = useState(false)
  const [chartView, setChartView] = useState('bar')
  const [hostAlert, setHostAlert] = useState(null)
  const [endSessionConfirmOpen, setEndSessionConfirmOpen] = useState(false)
  const [qaExporting, setQaExporting] = useState(false)


  const sessionQuery = useQuery({
    queryKey: ['live-session', sessionId],
    queryFn: () => getSessionDetailApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && status !== 'live' ? 2000 : false
    },
  })


  const questionsQuery = useQuery({
    queryKey: ['live-questions', sessionId],
    queryFn: () => listSessionQuestionsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
  })


  const responsesQuery = useQuery({
    queryKey: ['live-responses', sessionId],
    queryFn: () => getSessionResponsesApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
    refetchInterval: 10000,
  })


  const qaQuery = useQuery({
    queryKey: ['live-qa', sessionId],
    queryFn: () => listQaQuestionsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
  })

  const qaReportQuery = useQuery({
    queryKey: ['session-qa-report', sessionId],
    queryFn: () => getSessionQaReportApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
  })


  const deptSessionsQuery = useQuery({
    queryKey: ['live-dept-sessions', sessionQuery.data?.dept_id],
    queryFn: () => listDepartmentSessionsApi(accessToken, sessionQuery.data?.dept_id),
    enabled: Boolean(accessToken && sessionQuery.data?.dept_id),
  })


  const mappedQuestions = useMemo(
    () => mapLiveQuestions(questionsQuery.data),
    [questionsQuery.data],
  )


  const activeQuestion = mappedQuestions[questionIndex] || null


  const questionResultsQuery = useQuery({
    queryKey: ['live-question-results', activeQuestion?.id],
    queryFn: () => getQuestionResultsApi(accessToken, activeQuestion.id),
    enabled: Boolean(accessToken && activeQuestion?.id),
    refetchInterval: activeQuestion?.isLive ? 5000 : false,
  })


  useEffect(() => {
    setQuestionIndex(0)
  }, [sessionId])

  useEffect(() => {
    setChartView('bar')
  }, [activeQuestion?.id])

  useEffect(() => {
    const sessionCode = sessionQuery.data?.session_code
    if (!sessionCode || !accessToken) return


    const client = createRealtimeClient(
      '',
      { session: sessionCode, token: accessToken, role: 'host' },
      'host',
    )
    const offOpen = client.on('open', () => {
      setSocketStatus('connected')
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    })
    const offConnected = client.on(RealtimeEvent.CONNECTED, () => {
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    })
    const offClose = client.on('close', () => setSocketStatus('disconnected'))
    const offError = client.on('error', (data) => {
      console.warn('[WS host]', data?.message)
    })
    const offResp = client.on('response_received', () => {
      queryClient.invalidateQueries({ queryKey: ['live-question-results'] })
      queryClient.invalidateQueries({ queryKey: ['live-responses', sessionId] })
    })
    const offRankingResp = client.on(RealtimeEvent.RANKING_RESPONSE_SUBMITTED, () => {
      queryClient.invalidateQueries({ queryKey: ['live-question-results'] })
      queryClient.invalidateQueries({ queryKey: ['live-responses', sessionId] })
    })
    const offSession = client.on('session_updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-dept-sessions'] })
      if (data?.status) {
        queryClient.setQueryData(['live-session', sessionId], (old) =>
          old ? { ...old, status: data.status } : old,
        )
      }
    })
    const offQuestion = client.on('question_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    })
    const offAnswerReveal = client.on(RealtimeEvent.ANSWER_REVEALED, () => {
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    })
    const offQuestionLb = client.on(RealtimeEvent.QUESTION_LEADERBOARD_VISIBILITY, () => {
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    })


    client.connect()
    return () => {
      offOpen()
      offConnected()
      offClose()
      offError()
      offResp()
      offRankingResp()
      offSession()
      offQuestion()
      offAnswerReveal()
      offQuestionLb()
      client.disconnect()
    }
  }, [sessionQuery.data?.session_code, accessToken, queryClient, sessionId])


  const transitionMutation = useMutation({
    mutationFn: ({ action }) => transitionSessionApi(accessToken, sessionId, action),
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData(['live-session', sessionId], (old) =>
          old ? { ...old, ...updated, status: updated.status } : updated,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-dept-sessions'] })
    },
    onError: (error) => setErrorMessage(error.message || 'Unable to update session state'),
  })


  const {
    questionLiveMutation,
    questionLeaderboardMutation,
    answerRevealMutation,
    closeQuestionMutation,
    closeAllQuestionsMutation,
    activateAllQuestionsMutation,
    reattemptMutation,
    openForReattempt,
    closeQuestion,
    closeAllQuestions,
    activateAllQuestions,
  } = useHostQuestionMutations(accessToken, sessionId, {
    onMutationError: (message) => setErrorMessage(message),
    onCloseQuestionSuccess: (questionText) => {
      setErrorMessage('')
      const preview = String(questionText || '').trim()
      setHostAlert({
        variant: 'success',
        title: 'Question closed',
        message: preview
          ? `Participants can still see this question but can no longer submit answers:\n\n“${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}”`
          : 'Participants can still see this question but can no longer submit answers.',
        confirmLabel: 'OK',
      })
    },
    onCloseQuestionError: (error) => {
      setHostAlert({
        variant: 'error',
        title: 'Could not close question',
        message: error.message || 'Something went wrong. Please try again.',
        confirmLabel: 'Close',
      })
    },
    onCloseAllQuestionsSuccess: (closedCount) => {
      setErrorMessage('')
      setHostAlert({
        variant: 'success',
        title: 'All questions closed',
        message:
          closedCount > 0
            ? `All ${closedCount} live question${closedCount === 1 ? '' : 's'} ${closedCount === 1 ? 'was' : 'were'} successfully closed. Participants can still view them but cannot submit responses.`
            : 'All questions were successfully closed. Participants can still view them but cannot submit responses.',
        confirmLabel: 'OK',
      })
    },
    onCloseAllQuestionsError: (error) => {
      setHostAlert({
        variant: 'error',
        title: 'Could not close all questions',
        message: error.message || 'Something went wrong. Please try again.',
        confirmLabel: 'Close',
      })
    },
    onActivateAllQuestionsSuccess: (activatedCount) => {
      setErrorMessage('')
      setHostAlert({
        variant: 'success',
        title: 'All questions activated',
        message:
          activatedCount > 0
            ? `${activatedCount} question${activatedCount === 1 ? '' : 's'} ${activatedCount === 1 ? 'is' : 'are'} now live. Participants can answer and navigate between them.`
            : 'All questions are now live. Participants can answer and navigate between them.',
        confirmLabel: 'OK',
      })
    },
    onActivateAllQuestionsError: (error) => {
      setHostAlert({
        variant: 'error',
        title: 'Could not activate all questions',
        message: error.message || 'Something went wrong. Please try again.',
        confirmLabel: 'Close',
      })
    },
    onReattemptSuccess: (questionText) => {
      setErrorMessage('')
      setQuestionLeaderboardOpen(false)
      const preview = String(questionText || '').trim()
      setHostAlert({
        variant: 'success',
        title: 'Opened for reattempt',
        message: preview
          ? `Participants are being notified and can answer again:\n\n“${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}”`
          : 'Participants are being notified and can answer this question again.',
        confirmLabel: 'OK',
      })
    },
    onReattemptError: (error) => {
      setHostAlert({
        variant: 'error',
        title: 'Could not open for reattempt',
        message: error.message || 'Something went wrong. Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const qaMutation = useMutation({
    mutationFn: ({ qaId, action, body }) => qaModerateApi(accessToken, qaId, action, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-qa', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session-qa-report', sessionId] })
    },
    onError: (error) => setErrorMessage(error.message || 'Unable to update Q&A state'),
  })


  const participants = useMemo(() => {
    const unique = new Set((responsesQuery.data || []).map((r) => r.participant_id))
    return unique.size
  }, [responsesQuery.data])


  const responseCountByQuestionId = useMemo(() => {
    const counts = {}
    for (const row of responsesQuery.data || []) {
      const qid = Number(row.question_id)
      if (!qid) continue
      counts[qid] = (counts[qid] || 0) + 1
    }
    return counts
  }, [responsesQuery.data])

  const currentResponses = useMemo(
    () => (responsesQuery.data || []).filter((r) => Number(r.question_id) === Number(activeQuestion?.id)),
    [responsesQuery.data, activeQuestion?.id],
  )
  const responded = currentResponses.length
  const responseRate = participants ? Math.round((responded / participants) * 100) : 0


  const chartRawType = activeQuestion?.chartRawType ?? activeQuestion?.rawType

  const optionData = useMemo(
    () => buildOptionChartData(activeQuestion, questionResultsQuery.data, currentResponses),
    [activeQuestion, questionResultsQuery.data, currentResponses],
  )

  const ratingData = useMemo(
    () => buildRatingChartData(currentResponses, activeQuestion),
    [currentResponses, activeQuestion],
  )

  const wordCloudWords = useMemo(
    () => buildWordCloudData(activeQuestion, questionResultsQuery.data, currentResponses),
    [activeQuestion, questionResultsQuery.data, currentResponses],
  )

  const usesOptionChart = questionUsesOptionChart(chartRawType)
  const rankingAnalytics = questionResultsQuery.data?.ranking_analytics || null
  const showRankingBreakdown =
    chartRawType === 'ranking' &&
    Array.isArray(rankingAnalytics?.rankings) &&
    rankingAnalytics.rankings.length > 0
  const showWordCloud = chartRawType === 'word_cloud'
  const showRating = chartRawType === 'rating'
  const showOptionBreakdown = usesOptionChart && optionData.length > 0
  const showRatingBreakdown = showRating && ratingData.length > 0
  const chartBreakdownData = showRatingBreakdown ? ratingData : optionData
  const optionTotal = chartBreakdownData.reduce((sum, row) => sum + row.value, 0)
  const wordCloudTotal = wordCloudWords.reduce((sum, row) => sum + row.count, 0)


  const attemptsRows = useMemo(() => {
    const rows = currentResponses.map((row) => {
      const responseTimeMs =
        row.response_time_ms != null ? Number(row.response_time_ms) : null
      return {
        id: row.response_id,
        participant: row.participant?.nickname || `Participant ${row.participant_id}`,
        response:
          row.question_option?.option_text ||
          (chartRawType === 'ranking'
            ? buildRankingResponseLabel(
                row,
                new Map((activeQuestion?.options || []).map((opt) => [Number(opt.option_id), opt.option_text])),
              )
            : null) ||
          row.text_response ||
          (row.rating_value !== null && row.rating_value !== undefined
            ? String(row.rating_value)
            : '—'),
        responseTimeMs,
        quizTimeLabel: formatQuizSubmitTimeCompact(responseTimeMs),
      }
    })

    rows.sort((a, b) => {
      if (a.responseTimeMs == null && b.responseTimeMs == null) return 0
      if (a.responseTimeMs == null) return 1
      if (b.responseTimeMs == null) return -1
      return a.responseTimeMs - b.responseTimeMs
    })

    return rows.slice(0, 100)
  }, [currentResponses])


  const sessionResponses = responsesQuery.data || []

  const leaderboard = useMemo(
    () => buildSessionLeaderboardFromResponses(sessionResponses, leaderboardLimit),
    [sessionResponses, leaderboardLimit],
  )

  const activeQuestionLeaderboard = useMemo(() => {
    if (!activeQuestion?.id || !activeQuestion.isQuizMode) return []
    return buildQuestionLeaderboardForQuestion(
      sessionResponses,
      activeQuestion.id,
      leaderboardLimit,
    )
  }, [activeQuestion?.id, activeQuestion?.isQuizMode, sessionResponses, leaderboardLimit])


  const session = sessionQuery.data
  const statusLabel = session?.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : '—'
  const canEditLive = session?.status === 'live'
  const canLaunchSession =
    session?.status === 'draft' || session?.status === 'paused'
  const canShareSession =
    Boolean(session) && session.status !== 'completed' && session.status !== 'archived'
  const singleActiveQuestionMode = session?.participant_navigation_enabled === false
  const showSessionControls = session?.status === 'live' || session?.status === 'paused'
  const showCloseAllQuestionsButton = useMemo(
    () =>
      canHostCloseAllQuestions(mappedQuestions, {
        canEditLive,
        singleActiveQuestionMode,
      }),
    [mappedQuestions, canEditLive, singleActiveQuestionMode],
  )

  const showActivateAllQuestionsButton = useMemo(
    () =>
      canHostActivateAllQuestions(mappedQuestions, {
        canEditLive,
        singleActiveQuestionMode,
      }),
    [mappedQuestions, canEditLive, singleActiveQuestionMode],
  )

  if (!sessionId) {
    if (navSessionsQuery.isLoading) {
      return (
        <div className="rounded-2xl border border-blue-200 bg-white p-8 text-center text-slate-600">
          Loading sessions...
        </div>
      )
    }
    if (!navSessionsQuery.data?.length) {
      return <HostNoSessionsEmpty pageLabel="Live Present Mode" />
    }
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600 shadow-sm">
        No session selected. Open <strong>Dashboard</strong> and click <strong>Launch</strong>.
      </div>
    )
  }


  if (sessionQuery.isLoading || questionsQuery.isLoading) {
    return <div className="rounded-2xl border border-blue-200 bg-white p-8 text-center text-slate-600">Loading live session...</div>
  }


  if (!session) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">Session not found.</div>
  }


  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white/70 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Live session</p>
          <p className="mt-1 text-lg font-bold text-navy-900">{session.title}</p>
          <p className="mt-1 text-xs text-slate-600">
            Session {session.session_id} • {statusLabel} • Socket: {socketStatus}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={String(session.session_id)}
            onChange={(e) => navigate(`/live?session=${encodeURIComponent(e.target.value)}`)}
            className="h-11 rounded-2xl border border-blue-200/70 bg-white px-3 text-sm"
          >
            {(deptSessionsQuery.data || []).map((s) => (
              <option key={s.session_id} value={s.session_id}>
                {s.title} ({s.session_id})
              </option>
            ))}
          </select>
          {showSessionControls ? (
            <>
              <button
                type="button"
                onClick={() =>
                  transitionMutation.mutate({
                    action: session.status === 'live' ? 'pause' : 'resume',
                  })
                }
                disabled={transitionMutation.isPending}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-60"
              >
                {session.status === 'live' ? <Square className="size-4" /> : <Play className="size-4" />}
                {session.status === 'live' ? 'Pause' : 'Resume'}
              </button>
              <button
                type="button"
                onClick={() => setEndSessionConfirmOpen(true)}
                disabled={transitionMutation.isPending}
                className="h-11 rounded-2xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 disabled:opacity-60"
              >
                End Session
              </button>
            </>
          ) : null}
          <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white">
            <Users className="size-4" />
            {participants} participants
          </span>
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
          {canLaunchSession ? (
            <button
              type="button"
              disabled={transitionMutation.isPending}
              onClick={() =>
                transitionMutation.mutate(
                  { action: 'start' },
                  {
                    onSuccess: () => {
                      setHostAlert({
                        variant: 'success',
                        title: 'Session is live',
                        message: 'The session has been launched successfully.',
                        confirmLabel: 'OK',
                      })
                    },
                    onError: (error) => {
                      setHostAlert({
                        variant: 'error',
                        title: 'Could not launch session',
                        message: error?.message || 'Unable to launch this session. Please try again.',
                        confirmLabel: 'Close',
                      })
                    },
                  },
                )
              }
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/70 bg-white/90 px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
            >
              <Rocket className="size-4" />
              {transitionMutation.isPending ? 'Launching…' : 'Launch'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/present?session=${encodeURIComponent(sessionId)}`
              window.open(url, '_blank', 'noopener,noreferrer')
            }}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-navy-900/20 transition hover:brightness-110"
          >
            <Presentation className="size-4" />
            Present
          </button>
          {canShareSession ? (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/70 bg-white/90 px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              <Share2 className="size-4" />
              Share
            </button>
          ) : null}
        </div>
      </div>


      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}


      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-900">Session questions</p>
            <p className="text-xs text-slate-600">
              {mappedQuestions.length} question{mappedQuestions.length === 1 ? '' : 's'} • select a question to control and view results
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showActivateAllQuestionsButton ? (
              <HostQuestionActionButton
                disabled={activateAllQuestionsMutation.isPending}
                icon={Play}
                label={
                  activateAllQuestionsMutation.isPending ? 'Activating…' : 'Activate all questions'
                }
                title="Make all questions live at once (timed questions share the same start time)"
                tone="emerald"
                onClick={activateAllQuestions}
              />
            ) : null}
            {showCloseAllQuestionsButton ? (
              <HostQuestionActionButton
                disabled={closeAllQuestionsMutation.isPending}
                icon={Layers}
                label={closeAllQuestionsMutation.isPending ? 'Closing…' : 'Close all questions'}
                title="Stop accepting responses on all live untimed questions"
                tone="rose"
                onClick={closeAllQuestions}
              />
            ) : null}
          </div>
        </div>

        {!mappedQuestions.length ? (
          <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-white/80 p-8 text-center text-sm text-slate-600">
            Add questions in Builder first.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="max-h-[min(75vh,900px)] space-y-2 overflow-y-auto pr-1">
              {mappedQuestions.map((q, idx) => {
                const isSelected = questionIndex === idx
                const respCount = responseCountByQuestionId[Number(q.id)] || 0
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setQuestionIndex(idx)}
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
                          Q{idx + 1}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isSelected ? 'bg-white/15 text-white' : 'bg-blue-50 text-navy-700'
                          }`}
                        >
                          {q.type}
                        </span>
                        {q.isLive ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isSelected ? 'bg-emerald-400/30 text-emerald-100' : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            Live
                          </span>
                        ) : null}
                      </div>
                      <span className={`text-xs font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {respCount} resp.
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

            <div className="space-y-4">
              <div className="space-y-4 rounded-2xl border border-blue-200/70 bg-white/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Current question</p>
              <h3 className="mt-1 text-xl font-bold text-navy-900">{activeQuestion?.text || 'No question selected'}</h3>
              <p className="text-sm text-slate-600">
                {activeQuestion ? `${questionIndex + 1} / ${mappedQuestions.length} • ${activeQuestion.type}` : '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={!activeQuestion}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-navy-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <Eye className="size-3.5" />
              Preview
            </button>
          </div>


          {activeQuestion ? (
            <div className="mt-3 border-t border-slate-200/80 pt-3">
              {canEditLive && singleActiveQuestionMode ? (
                <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                  Single-question mode: activating this question will automatically deactivate any
                  other live question.
                </p>
              ) : null}
              <HostQuestionControls
                question={activeQuestion}
                canEditLive={canEditLive}
                singleActiveQuestionMode={singleActiveQuestionMode}
                questionLiveMutation={questionLiveMutation}
                answerRevealMutation={answerRevealMutation}
                questionLeaderboardMutation={questionLeaderboardMutation}
                closeQuestionMutation={closeQuestionMutation}
                reattemptMutation={reattemptMutation}
                onCloseQuestion={() => {
                  if (!canEditLive) return
                  closeQuestion(activeQuestion)
                }}
                onOpenForReattempt={() => {
                  if (!canEditLive) return
                  openForReattempt(activeQuestion)
                }}
              />
            </div>
          ) : null}

          <div className="rounded-2xl border border-blue-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>Response rate</span>
              <span>
                {responded} / {participants} ({responseRate}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-linear-to-r from-navy-600 to-navy-500" style={{ width: `${responseRate}%` }} />
            </div>
          </div>


          <div className="rounded-2xl border border-blue-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-900">Attempts & responses</p>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-navy-700">{attemptsRows.length}</span>
            </div>
            <div className="mt-3 max-h-[280px] overflow-auto rounded-xl border border-blue-100">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-blue-100">
                    <th className="px-3 py-2 font-semibold text-slate-700">Participant</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Response</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Time taken{' '}
                      <span className="font-normal text-slate-500">(seconds.milliseconds)</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attemptsRows.map((row) => (
                    <tr key={row.id} className="border-b border-blue-50 last:border-b-0">
                      <td className="px-3 py-2 text-slate-700">{row.participant}</td>
                      <td className="px-3 py-2 text-slate-700">{row.response}</td>
                      <td className="px-3 py-2 font-mono text-xs tabular-nums text-slate-600">
                        {row.quizTimeLabel}
                      </td>
                    </tr>
                  ))}
                  {!attemptsRows.length ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-500" colSpan={3}>
                        No responses yet for this question.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
              </div>

          <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Live chart</p>
                {showWordCloud && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {wordCloudWords.length} unique word{wordCloudWords.length === 1 ? '' : 's'} ·{' '}
                    {wordCloudTotal} submission{wordCloudTotal === 1 ? '' : 's'}
                  </p>
                )}
                {(showOptionBreakdown || showRatingBreakdown) && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {optionTotal} response{optionTotal === 1 ? '' : 's'}
                    {showRatingBreakdown ? ' by rating' : ' by answer'}
                  </p>
                )}
                {showRankingBreakdown && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {rankingAnalytics.totalResponses || 0} ranked submission
                    {(rankingAnalytics.totalResponses || 0) === 1 ? '' : 's'} · avg score shown per option
                  </p>
                )}
              </div>
              {(showOptionBreakdown || showRatingBreakdown || showRankingBreakdown) && (
                <LiveChartViewToggle
                  view={chartView}
                  onChange={setChartView}
                  modes={showRankingBreakdown ? ['table', 'bar', 'pie'] : ['bar', 'pie']}
                />
              )}
            </div>
            <div className="mt-3 h-[300px] rounded-2xl border border-blue-200 bg-white p-3">
              {showWordCloud ? (
                <WordCloudChart words={wordCloudWords} className="h-full" />
              ) : (
                showRankingBreakdown ? (
                  <RankingLiveChartPanel
                    rankings={rankingAnalytics.rankings}
                    chartView={chartView}
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {showOptionBreakdown || showRatingBreakdown ? (
                    chartView === 'bar' ? (
                      <BarChart data={chartBreakdownData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }}
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value) => [`${value} responses`, 'Count']}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
                          {chartBreakdownData.map((entry, idx) => (
                            <Cell
                              key={entry.name}
                              fill={getChartColor(entry.name, idx, chartRawType)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <PieChart>
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value, name) => [
                            `${value} (${optionTotal ? Math.round((Number(value) / optionTotal) * 100) : 0}%)`,
                            name,
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={28}
                          formatter={(value) => <span className="text-xs font-medium text-slate-600">{value}</span>}
                        />
                        <Pie
                          data={chartBreakdownData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={92}
                          innerRadius={chartRawType === 'true_false' ? 44 : 0}
                          paddingAngle={2}
                          stroke="#ffffff"
                          strokeWidth={2}
                          label={renderPieLabel}
                          labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                        >
                          {chartBreakdownData.map((entry, idx) => (
                            <Cell
                              key={entry.name}
                              fill={getChartColor(entry.name, idx, chartRawType)}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    )
                    ) : (
                    <PieChart>
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Pie
                        data={[{ name: 'Responses', value: responded || 0 }]}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        fill={CHART_COLORS[0]}
                      >
                        <Cell fill={CHART_COLORS[0]} />
                      </Pie>
                    </PieChart>
                    )}
                  </ResponsiveContainer>
                )
              )}
            </div>
            {showWordCloud && !wordCloudWords.length && (
              <p className="mt-2 text-center text-xs text-slate-500">Waiting for participants to submit words…</p>
            )}
            {(showOptionBreakdown || showRatingBreakdown) && !optionTotal && (
              <p className="mt-2 text-center text-xs text-slate-500">Waiting for participants to answer…</p>
            )}
            {chartRawType === 'ranking' && !showRankingBreakdown && (
              <p className="mt-2 text-center text-xs text-slate-500">
                Waiting for participants to submit rankings…
              </p>
            )}
          </div>

          <LiveQaPanel
            questions={qaQuery.data}
            report={qaReportQuery.data}
            isReportLoading={qaReportQuery.isLoading}
            isExporting={qaExporting}
            onExportExcel={async () => {
              try {
                setQaExporting(true)
                const report =
                  qaReportQuery.data || (await getSessionQaReportApi(accessToken, sessionId))
                await exportQaAnalyticsExcel(report)
              } catch (error) {
                setErrorMessage(error.message || 'Q&A export failed')
              } finally {
                setQaExporting(false)
              }
            }}
            onModerate={(qaId, action) => qaMutation.mutate({ qaId, action })}
          />

          <QuestionLeaderboardPanel
            activeQuestion={activeQuestion}
            questionNumber={activeQuestion ? questionIndex + 1 : null}
            canShowLeaderboard={Boolean(activeQuestion?.isQuizMode && activeQuestion?.isLive)}
            onShowLeaderboard={() => setQuestionLeaderboardOpen(true)}
          />
            </div>
          </div>
        )}
      </div>


      <Modal open={previewOpen} title="Preview Participant View" onClose={() => setPreviewOpen(false)}>
        <div className="rounded-xl border border-blue-200 bg-white p-4">
          <h3 className="text-lg font-bold text-navy-900">{activeQuestion?.text || 'No question selected'}</h3>
          <p className="mt-1 text-sm text-slate-600">Type: {activeQuestion?.type || '—'}</p>
        </div>
      </Modal>

      <Modal
        open={endSessionConfirmOpen}
        title="End session?"
        onClose={() => {
          if (!transitionMutation.isPending) setEndSessionConfirmOpen(false)
        }}
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Are you sure you want to end this session? Participants will be notified and will no longer
          be able to submit new responses.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={transitionMutation.isPending}
            onClick={() => setEndSessionConfirmOpen(false)}
            className="h-11 rounded-2xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={transitionMutation.isPending}
            onClick={() =>
              transitionMutation.mutate(
                { action: 'end' },
                {
                  onSuccess: () => setEndSessionConfirmOpen(false),
                },
              )
            }
            className="h-11 rounded-2xl border border-red-200 bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {transitionMutation.isPending ? 'Ending…' : 'End session'}
          </button>
        </div>
      </Modal>

      <Modal
        open={shareOpen}
        title="Share Session"
        onClose={() => setShareOpen(false)}
      >
        {session ? (
          <ShareSessionPanel
            session={session}
            accessToken={accessToken}
            sessionDbId={session.session_id}
          />
        ) : null}
      </Modal>

      <SessionLeaderboardModal
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        entries={leaderboard}
        limit={leaderboardLimit}
        onLimitChange={setLeaderboardLimit}
      />

      <QuestionLeaderboardModal
        open={questionLeaderboardOpen}
        onClose={() => setQuestionLeaderboardOpen(false)}
        questionLabel={activeQuestion ? `Q${questionIndex + 1}` : ''}
        questionText={activeQuestion?.text || ''}
        entries={activeQuestionLeaderboard}
        isQuizQuestion={Boolean(activeQuestion?.isQuizMode)}
        limit={leaderboardLimit}
        onLimitChange={setLeaderboardLimit}
      />

      <HostAlertModal
        open={Boolean(hostAlert)}
        variant={hostAlert?.variant ?? 'success'}
        title={hostAlert?.title ?? ''}
        message={hostAlert?.message ?? ''}
        confirmLabel={hostAlert?.confirmLabel ?? 'OK'}
        onClose={() => setHostAlert(null)}
      />
    </section>
  )
}


export default LivePage