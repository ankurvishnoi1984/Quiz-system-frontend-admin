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
  BarChart3,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Info,
  PieChart as PieChartIcon,
  Play,
  Presentation,
  RotateCcw,
  Share2,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import WordCloudChart from '../components/charts/WordCloudChart'
import { renderPieLabel } from '../components/charts/renderPieLabel'
import { CHART_COLORS, CHART_TOOLTIP_STYLE, getChartColor } from '../utils/chartColors'
import ShareSessionPanel from '../components/dashboard/ShareSessionPanel'
import Modal from '../components/ui/Modal'
import { wordCountsFromApiResults, wordCountsFromResponses } from '../utils/wordCloud'
import { useAuthStore } from '../store/authStore'
import {
  getQuestionResultsApi,
  getSessionDetailApi,
  getSessionResponsesApi,
  listDepartmentSessionsApi,
  listQaQuestionsApi,
  listSessionQuestionsApi,
  qaModerateApi,
  openQuestionForReattemptApi,
  setQuestionAnswerRevealedApi,
  setQuestionLeaderboardVisibleApi,
  setQuestionLiveStateApi,
  transitionSessionApi,
} from '../services/liveApi'
import { questionSupportsAnswerReveal } from '../utils/answerReveal'
import { formatQuizSubmitTime } from '../utils/quizResponseTime'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'


const HOST_ACTION_TONES = {
  emerald: {
    active:
      'border-emerald-500 bg-emerald-100 text-emerald-950 shadow-sm shadow-emerald-200/60 ring-1 ring-emerald-300/70',
    activeIcon: 'bg-emerald-600 text-white',
    idle: 'border-emerald-200/90 bg-emerald-50/90 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100',
    idleIcon: 'bg-emerald-200/80 text-emerald-700',
    dot: 'bg-emerald-600',
  },
  rose: {
    active: 'border-rose-500 bg-rose-100 text-rose-950 shadow-sm shadow-rose-200/60 ring-1 ring-rose-300/70',
    activeIcon: 'bg-rose-600 text-white',
    idle: 'border-rose-200/90 bg-rose-50/90 text-rose-800 hover:border-rose-400 hover:bg-rose-100',
    idleIcon: 'bg-rose-200/80 text-rose-700',
    dot: 'bg-rose-600',
  },
  violet: {
    active:
      'border-violet-500 bg-violet-100 text-violet-950 shadow-sm shadow-violet-200/60 ring-1 ring-violet-300/70',
    activeIcon: 'bg-violet-600 text-white',
    idle: 'border-violet-200/90 bg-violet-50/90 text-violet-800 hover:border-violet-400 hover:bg-violet-100',
    idleIcon: 'bg-violet-200/80 text-violet-700',
    dot: 'bg-violet-600',
  },
  amber: {
    active: 'border-amber-500 bg-amber-100 text-amber-950 shadow-sm shadow-amber-200/60 ring-1 ring-amber-300/70',
    activeIcon: 'bg-amber-600 text-white',
    idle: 'border-amber-200/90 bg-amber-50/90 text-amber-900 hover:border-amber-400 hover:bg-amber-100',
    idleIcon: 'bg-amber-200/80 text-amber-800',
    dot: 'bg-amber-600',
  },
  sky: {
    active: 'border-sky-500 bg-sky-100 text-sky-950 shadow-sm shadow-sky-200/60 ring-1 ring-sky-300/70',
    activeIcon: 'bg-sky-600 text-white',
    idle: 'border-sky-200/90 bg-sky-50/90 text-sky-800 hover:border-sky-400 hover:bg-sky-100',
    idleIcon: 'bg-sky-200/80 text-sky-700',
    dot: 'bg-sky-600',
  },
}

function HostQuestionActionButton({
  disabled,
  onClick,
  icon: Icon,
  label,
  active = false,
  tone = 'emerald',
  title,
}) {
  const styles = HOST_ACTION_TONES[tone] || HOST_ACTION_TONES.emerald
  const tooltip = title || label

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={tooltip}
      aria-pressed={active}
      className={`group inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? styles.active : styles.idle
      }`}
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-md transition-colors ${
          active ? styles.activeIcon : styles.idleIcon
        }`}
      >
        <Icon className="size-3.5" strokeWidth={2.25} aria-hidden />
      </span>
      <span className="whitespace-nowrap">{label}</span>
      {active ? (
        <span className={`size-1.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
      ) : null}
    </button>
  )
}

function HostAlertModal({ open, variant = 'success', title, message, confirmLabel, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const styles = {
    success: {
      panel: 'border-emerald-200/80 bg-linear-to-b from-emerald-50 to-white shadow-emerald-900/15',
      bar: 'bg-linear-to-r from-emerald-500 to-teal-500',
      iconWrap: 'bg-emerald-100 text-emerald-600 ring-emerald-50',
      title: 'text-emerald-900',
      message: 'text-emerald-800/90',
      button: 'bg-linear-to-r from-emerald-600 to-teal-600 focus:ring-emerald-500',
      Icon: CheckCircle2,
    },
    error: {
      panel: 'border-red-200/80 bg-linear-to-b from-red-50 to-white shadow-red-900/15',
      bar: 'bg-linear-to-r from-red-500 to-rose-500',
      iconWrap: 'bg-red-100 text-red-600 ring-red-50',
      title: 'text-red-900',
      message: 'text-red-800/90',
      button: 'bg-linear-to-r from-red-600 to-rose-600 focus:ring-red-500',
      Icon: XCircle,
    },
    info: {
      panel: 'border-emerald-200/80 bg-linear-to-b from-emerald-50 to-white shadow-emerald-900/15',
      bar: 'bg-linear-to-r from-emerald-400 to-teal-500',
      iconWrap: 'bg-emerald-100 text-emerald-600 ring-emerald-50',
      title: 'text-emerald-900',
      message: 'text-emerald-800/90',
      button: 'bg-linear-to-r from-emerald-600 to-teal-600 focus:ring-emerald-500',
      Icon: Info,
    },
  }

  const theme = styles[variant] || styles.success
  const Icon = theme.Icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-navy-950/30 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-labelledby="host-alert-title"
        aria-describedby="host-alert-message"
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl ${theme.panel}`}
      >
        <div className={`h-1.5 w-full ${theme.bar}`} aria-hidden />
        <div className="p-6 text-center">
          <div className={`mx-auto grid size-16 place-items-center rounded-full ring-4 ${theme.iconWrap}`}>
            <Icon className="size-9" strokeWidth={2.25} aria-hidden />
          </div>
          <p id="host-alert-title" className={`mt-5 text-xl font-bold ${theme.title}`}>
            {title}
          </p>
          <p
            id="host-alert-message"
            className={`mt-2 whitespace-pre-line text-sm leading-relaxed ${theme.message}`}
          >
            {message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className={`mt-6 h-11 w-full rounded-xl text-sm font-semibold text-white shadow-md transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function mapQuestionType(type) {
  const map = {
    mcq: 'MCQ',
    word_cloud: 'Word Cloud',
    rating: 'Rating',
    open_text: 'Text',
    true_false: 'True/False',
    ranking: 'Ranking',
  }
  return map[type] || type
}

function questionUsesOptionChart(rawType) {
  return rawType === 'mcq' || rawType === 'true_false'
}

function sortTrueFalseOptionData(data) {
  return [...data].sort((a, b) => {
    const rank = (name) => (String(name).trim().toLowerCase() === 'true' ? 0 : 1)
    return rank(a.name) - rank(b.name)
  })
}

function LivePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const sessionId = searchParams.get('session') || ''


  const [questionIndex, setQuestionIndex] = useState(0)
  const [qaOpen, setQaOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [socketStatus, setSocketStatus] = useState('disconnected')
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [chartView, setChartView] = useState('bar')
  const [hostAlert, setHostAlert] = useState(null)
  const [endSessionConfirmOpen, setEndSessionConfirmOpen] = useState(false)


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


  const deptSessionsQuery = useQuery({
    queryKey: ['live-dept-sessions', sessionQuery.data?.dept_id],
    queryFn: () => listDepartmentSessionsApi(accessToken, sessionQuery.data?.dept_id),
    enabled: Boolean(accessToken && sessionQuery.data?.dept_id),
  })


  const mappedQuestions = useMemo(
    () =>
      (questionsQuery.data || []).map((q) => ({
        id: q.question_id,
        text: q.question_text,
        type: mapQuestionType(q.question_type),
        rawType: q.question_type,
        isLive: Boolean(q.is_live),
        isQuizMode: Boolean(q.is_quiz_mode),
        answerRevealed: Boolean(q.answer_revealed),
        showLeaderboard: Boolean(q.show_leaderboard),
        timeLimit: Number(q.time_limit_seconds) || 0,
        options: q.question_options || q.QuestionOptions || [],
      })),
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


  const questionLiveMutation = useMutation({
    mutationFn: ({ questionId, isLive }) => setQuestionLiveStateApi(accessToken, questionId, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-question-results'] })
    },
    onError: (error) => setErrorMessage(error.message || 'Unable to update question live state'),
  })

  const questionLeaderboardMutation = useMutation({
    mutationFn: ({ questionId, visible }) =>
      setQuestionLeaderboardVisibleApi(accessToken, questionId, visible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    },
    onError: (error) => setErrorMessage(error.message || 'Unable to update question leaderboard'),
  })

  const answerRevealMutation = useMutation({
    mutationFn: ({ questionId, revealed }) =>
      setQuestionAnswerRevealedApi(accessToken, questionId, revealed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    },
    onError: (error) => setErrorMessage(error.message || 'Unable to update answer visibility'),
  })

  const reattemptMutation = useMutation({
    mutationFn: ({ questionId }) => openQuestionForReattemptApi(accessToken, questionId),
    onSuccess: (_data, { questionText }) => {
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-question-results'] })
      setErrorMessage('')
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
    onError: (error) => {
      setHostAlert({
        variant: 'error',
        title: 'Could not open for reattempt',
        message: error.message || 'Something went wrong. Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const handleOpenForReattempt = () => {
    if (!activeQuestion?.id || !canEditLive) return
    reattemptMutation.mutate({
      questionId: activeQuestion.id,
      questionText: activeQuestion.text,
    })
  }


  const qaMutation = useMutation({
    mutationFn: ({ qaId, action, body }) => qaModerateApi(accessToken, qaId, action, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['live-qa', sessionId] }),
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


  const optionData = useMemo(() => {
    if (!activeQuestion) return []
    const byOption = questionResultsQuery.data?.by_option || {}
    const opts = activeQuestion.options || []

    if (opts.length > 0) {
      let rows = opts.map((option) => ({
        name: option.option_text,
        value: Number(byOption[String(option.option_id)] || 0),
      }))
      if (activeQuestion.rawType === 'true_false') {
        rows = sortTrueFalseOptionData(rows)
      }
      return rows
    }

    if (activeQuestion.rawType === 'true_false') {
      const counts = { True: 0, False: 0 }
      currentResponses.forEach((row) => {
        const label = (row.question_option?.option_text || '').trim()
        if (label.toLowerCase() === 'true') counts.True += 1
        else if (label.toLowerCase() === 'false') counts.False += 1
      })
      return [
        { name: 'True', value: counts.True },
        { name: 'False', value: counts.False },
      ]
    }

    return []
  }, [questionResultsQuery.data, activeQuestion, currentResponses])

  const wordCloudWords = useMemo(() => {
    if (activeQuestion?.rawType !== 'word_cloud') return []
    const fromApi = wordCountsFromApiResults(questionResultsQuery.data)
    if (fromApi.length) return fromApi
    return wordCountsFromResponses(currentResponses)
  }, [activeQuestion?.rawType, questionResultsQuery.data, currentResponses])

  const usesOptionChart = questionUsesOptionChart(activeQuestion?.rawType)
  const showWordCloud = activeQuestion?.rawType === 'word_cloud'
  const showOptionBreakdown = usesOptionChart && optionData.length > 0
  const optionTotal = optionData.reduce((sum, row) => sum + row.value, 0)
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
          row.text_response ||
          (row.rating_value !== null && row.rating_value !== undefined
            ? String(row.rating_value)
            : '—'),
        responseTimeMs,
        quizTimeLabel: formatQuizSubmitTime(responseTimeMs),
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


  const leaderboard = useMemo(() => {
    const scoreByParticipant = new Map()
    ;(responsesQuery.data || []).forEach((row) => {
      const key = row.participant_id
      const existing = scoreByParticipant.get(key) || {
        participant_id: row.participant_id,
        name: row.participant?.nickname || `Participant ${row.participant_id}`,
        score: 0,
        attempts: 0,
      }
      existing.score += Number(row.points_earned || 0)
      existing.attempts += 1
      scoreByParticipant.set(key, existing)
    })
    return Array.from(scoreByParticipant.values())
      .sort((a, b) => b.score - a.score || b.attempts - a.attempts)
      .slice(0, 10)
  }, [responsesQuery.data])


  const session = sessionQuery.data
  const statusLabel = session?.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : '—'
  const canEditLive = session?.status === 'live'
  const showSessionControls = session?.status === 'live' || session?.status === 'paused'

  if (!sessionId) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600 shadow-sm">
        No session selected. Open Dashboard and click <strong>Launch</strong>.
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
          <button
            type="button"
            onClick={() => {
              setShareOpen(true)
            }}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/70 bg-white/90 px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
          >
            <Share2 className="size-4" />
            Share
          </button>
        </div>
      </div>


      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}


      <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5">
        <div>
          <p className="text-sm font-semibold text-navy-900">Session questions</p>
          <p className="text-xs text-slate-600">
            {mappedQuestions.length} question{mappedQuestions.length === 1 ? '' : 's'} • select a question to control and view results
          </p>
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
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Host controls</p>
              <div className="flex flex-wrap gap-2">
                <HostQuestionActionButton
                  disabled={!canEditLive || questionLiveMutation.isPending}
                  onClick={() =>
                    questionLiveMutation.mutate({
                      questionId: activeQuestion.id,
                      isLive: !activeQuestion.isLive,
                    })
                  }
                  icon={activeQuestion.isLive ? Square : Play}
                  label={activeQuestion.isLive ? 'Deactivate' : 'Activate'}
                  title={
                    activeQuestion.isLive
                      ? 'Stop accepting new responses'
                      : 'Let participants answer this question'
                  }
                  active={activeQuestion.isLive}
                  tone={activeQuestion.isLive ? 'rose' : 'emerald'}
                />
                {questionSupportsAnswerReveal(activeQuestion.type, activeQuestion.isQuizMode) ? (
                  <HostQuestionActionButton
                    disabled={!canEditLive || answerRevealMutation.isPending}
                    onClick={() =>
                      answerRevealMutation.mutate({
                        questionId: activeQuestion.id,
                        revealed: !activeQuestion.answerRevealed,
                      })
                    }
                    icon={activeQuestion.answerRevealed ? EyeOff : Eye}
                    label={activeQuestion.answerRevealed ? 'Hide answer' : 'Reveal answer'}
                    title={
                      activeQuestion.answerRevealed
                        ? 'Correct answer is visible to participants'
                        : 'Show the correct answer on participant screens'
                    }
                    active={activeQuestion.answerRevealed}
                    tone="violet"
                  />
                ) : null}
                {canEditLive && activeQuestion.isQuizMode ? (
                  <HostQuestionActionButton
                    disabled={questionLeaderboardMutation.isPending}
                    onClick={() =>
                      questionLeaderboardMutation.mutate({
                        questionId: activeQuestion.id,
                        visible: !activeQuestion.showLeaderboard,
                      })
                    }
                    icon={Trophy}
                    label="Leaderboard"
                    title={
                      activeQuestion.showLeaderboard
                        ? 'Hide ranking for this question'
                        : 'Show ranking for this question only'
                    }
                    active={activeQuestion.showLeaderboard}
                    tone="amber"
                  />
                ) : null}
                <HostQuestionActionButton
                  disabled={!canEditLive || reattemptMutation.isPending}
                  onClick={handleOpenForReattempt}
                  icon={RotateCcw}
                  label={reattemptMutation.isPending ? 'Opening…' : 'Reattempt'}
                  title={
                    !activeQuestion.isLive
                      ? 'Activates the question and opens another attempt'
                      : 'Allow another attempt on this question'
                  }
                  tone="sky"
                />
              </div>
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
                    <th className="px-3 py-2 font-semibold text-slate-700">Response time</th>
                  </tr>
                </thead>
                <tbody>
                  {attemptsRows.map((row) => (
                    <tr key={row.id} className="border-b border-blue-50 last:border-b-0">
                      <td className="px-3 py-2 text-slate-700">{row.participant}</td>
                      <td className="px-3 py-2 text-slate-700">{row.response}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">
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
                {showOptionBreakdown && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {optionTotal} response{optionTotal === 1 ? '' : 's'} by answer
                  </p>
                )}
              </div>
              {showOptionBreakdown && (
                <div className="inline-flex rounded-xl border border-blue-200/70 bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setChartView('bar')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      chartView === 'bar'
                        ? 'bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-white shadow'
                        : 'text-slate-600 hover:bg-blue-50'
                    }`}
                    aria-pressed={chartView === 'bar'}
                  >
                    <BarChart3 className="size-3.5" />
                    Bar
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('pie')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      chartView === 'pie'
                        ? 'bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-white shadow'
                        : 'text-slate-600 hover:bg-blue-50'
                    }`}
                    aria-pressed={chartView === 'pie'}
                  >
                    <PieChartIcon className="size-3.5" />
                    Pie
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3 h-[300px] rounded-2xl border border-blue-200 bg-white p-3">
              {showWordCloud ? (
                <WordCloudChart words={wordCloudWords} className="h-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {showOptionBreakdown ? (
                    chartView === 'bar' ? (
                      <BarChart data={optionData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(79, 70, 229, 0.06)' }}
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value) => [`${value} responses`, 'Count']}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
                          {optionData.map((entry, idx) => (
                            <Cell
                              key={entry.name}
                              fill={getChartColor(entry.name, idx, activeQuestion?.rawType)}
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
                          data={optionData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={92}
                          innerRadius={activeQuestion?.rawType === 'true_false' ? 44 : 0}
                          paddingAngle={2}
                          stroke="#ffffff"
                          strokeWidth={2}
                          label={renderPieLabel}
                          labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                        >
                          {optionData.map((entry, idx) => (
                            <Cell
                              key={entry.name}
                              fill={getChartColor(entry.name, idx, activeQuestion?.rawType)}
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
              )}
            </div>
            {showWordCloud && !wordCloudWords.length && (
              <p className="mt-2 text-center text-xs text-slate-500">Waiting for participants to submit words…</p>
            )}
            {showOptionBreakdown && !optionTotal && (
              <p className="mt-2 text-center text-xs text-slate-500">Waiting for participants to answer…</p>
            )}
          </div>

          <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-900">Q&A panel</p>
              <button type="button" onClick={() => setQaOpen((p) => !p)} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm">
                {qaOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {qaOpen ? (
              <div className="mt-3 space-y-2">
                {(qaQuery.data || []).map((q) => (
                  <div key={q.qa_id} className="rounded-xl border border-blue-200 bg-white p-3">
                    <p className="text-sm font-semibold text-navy-900">{q.question_text}</p>
                    <p className="mt-1 text-xs text-slate-600">Status: {q.status}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => qaMutation.mutate({ qaId: q.qa_id, action: 'approve' })} className="rounded-lg border border-emerald-200 px-2 py-1 text-emerald-700">
                        <ThumbsUp className="size-4" />
                      </button>
                      <button type="button" onClick={() => qaMutation.mutate({ qaId: q.qa_id, action: 'reject' })} className="rounded-lg border border-red-200 px-2 py-1 text-red-700">
                        <ThumbsDown className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
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
                <div key={row.participant_id} className="flex items-center justify-between rounded-2xl border border-amber-200/60 bg-amber-50/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white">
                      {idx === 0 ? <Crown className="size-4" /> : idx + 1}
                    </div>
                    <p className="font-semibold text-navy-900">{row.name}</p>
                  </div>
                  <p className="text-sm font-bold text-navy-900">{row.score}</p>
                </div>
              ))}
              {!leaderboard.length ? (
                <p className="text-sm text-slate-500 text-center py-4">Leaderboard will appear once responses start coming in.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

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