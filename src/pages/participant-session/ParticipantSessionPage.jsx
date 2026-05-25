import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useShallow } from 'zustand/shallow'
import {
  askQaQuestionApi,
  getSessionLeaderboardApi,
  joinSessionApi,
  listQaQuestionsApi,
  listSessionQuestionsApi,
  lookupSessionApi,
  submitResponseApi,
  upvoteQaApi,
} from '../../services/participantApi'
import { createRealtimeClient, RealtimeEvent } from '../../services/realtimeClient'
import { useParticipantStore } from '../../store/participantStore'
import { hasSessionCodeInJoinPath, normalizeSessionCode } from '../../utils/joinUrl'
import { computeResponseTimeMs } from '../../utils/quizResponseTime'
import { ActiveQuestionPanel } from './components/ActiveQuestionPanel'
import { JoinFormView } from './components/JoinFormView'
import { LeaderboardModal } from './components/LeaderboardModal'
import { PageCenteredShell } from './components/PageCenteredShell'
import { ParticipantAlertModal } from './components/ParticipantAlertModal'
import { QaPanel } from './components/QaPanel'
import { SessionHeader } from './components/SessionHeader'
import { WaitingForQuestion } from './components/WaitingForQuestion'
import { WaitingView } from './components/WaitingView'
import { isParticipantChoiceCorrect } from '../../utils/answerReveal'
import {
  buildResponsePayloadForQuestion,
  canAutoNavigateToActivatedQuestion,
  clamp,
  findNextUnsubmittedActiveQuestion,
  getLockedNavigationQuestion,
  isParticipantAttemptingQuestion,
  mapQuestionType,
  participantCanUpdateSubmittedResponse,
  participantQuestionHasAnswer,
  shouldIncludeQuestionInFinalize,
} from './utils/questionUtils'

function ParticipantSessionPage() {
  const { sessionId } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { participantToken, joinedUser, joinedSessionCode, setParticipant } = useParticipantStore()

  const hasSessionCodeInUrl = hasSessionCodeInJoinPath(location.pathname, sessionId)
  const [sessionCodeInput, setSessionCodeInput] = useState('')
  const effectiveSessionCode = normalizeSessionCode(
    hasSessionCodeInUrl ? sessionId : sessionCodeInput,
  )

  const {
    responses,
    questionIndex,
    liveQuestionId,
    submitted,
    quizCountdownByQuestion,
    quizQuestionOpenedAt,
    quizSubmittedQuestionIds,
    setResponses,
    setQuestionIndex,
    setLiveQuestionId,
    setSubmitted,
    setQuizCountdown,
    resetQuizProgress,
    freezeCountdownAfterSubmit,
    freezeAllCountdowns,
    markQuestionsSubmitted,
    unlockQuestionForReattempt,
    markQuestionOpened,
  } = useParticipantStore(
    useShallow((s) => ({
      responses: s.quizResponses,
      questionIndex: s.quizQuestionIndex,
      liveQuestionId: s.quizLiveQuestionId,
      submitted: s.quizSubmitted,
      quizCountdownByQuestion: s.quizCountdownByQuestion,
      quizQuestionOpenedAt: s.quizQuestionOpenedAt,
      quizSubmittedQuestionIds: s.quizSubmittedQuestionIds,
      setResponses: s.setQuizResponses,
      setQuestionIndex: s.setQuizQuestionIndex,
      setLiveQuestionId: s.setQuizLiveQuestionId,
      setSubmitted: s.setQuizSubmitted,
      setQuizCountdown: s.setQuizCountdown,
      resetQuizProgress: s.resetQuizProgress,
      freezeCountdownAfterSubmit: s.freezeCountdownAfterSubmit,
      freezeAllCountdowns: s.freezeAllCountdowns,
      markQuestionsSubmitted: s.markQuestionsSubmitted,
      unlockQuestionForReattempt: s.unlockQuestionForReattempt,
      markQuestionOpened: s.markQuestionOpened,
    })),
  )

  const [participantHydrated, setParticipantHydrated] = useState(() =>
    useParticipantStore.persist.hasHydrated(),
  )
  const [countdownTick, setCountdownTick] = useState(0)
  const [step, setStep] = useState('join')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [joinError, setJoinError] = useState('')
  const [transitioningLive, setTransitioningLive] = useState(false)
  const [tagsInput, setTagsInput] = useState('')
  const [askText, setAskText] = useState('')
  const [askAnonymous, setAskAnonymous] = useState(false)
  const [upvotes, setUpvotes] = useState({})
  const [ownQuestions, setOwnQuestions] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitModal, setSubmitModal] = useState(null)
  const [reattemptModal, setReattemptModal] = useState(null)
  const [sessionEndedModal, setSessionEndedModal] = useState(false)
  const sessionEndedNotifiedRef = useRef(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [questionLeaderboardByQuestion, setQuestionLeaderboardByQuestion] = useState({})
  const [questionLbVisibleByQuestion, setQuestionLbVisibleByQuestion] = useState({})
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [answerRevealByQuestion, setAnswerRevealByQuestion] = useState({})

  const sessionQuery = useQuery({
    queryKey: ['participant-session', effectiveSessionCode],
    queryFn: () => lookupSessionApi(effectiveSessionCode),
    enabled: Boolean(effectiveSessionCode),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (step === 'waiting' || status === 'draft') return 3000
      if (participantToken && (status === 'live' || status === 'paused')) return 5000
      return false
    },
  })

  const questionsQuery = useQuery({
    queryKey: ['participant-questions', sessionQuery.data?.session_id, participantToken],
    queryFn: () => listSessionQuestionsApi(participantToken, sessionQuery.data?.session_id),
    enabled: Boolean(participantToken && sessionQuery.data?.session_id),
    refetchInterval: step === 'active' || step === 'waiting' ? 5000 : false,
  })

  const qaQuery = useQuery({
    queryKey: ['participant-qa', sessionQuery.data?.session_id, participantToken],
    queryFn: () => listQaQuestionsApi(participantToken, sessionQuery.data?.session_id),
    enabled: Boolean(participantToken && sessionQuery.data?.session_id),
    refetchInterval: 10000,
  })

  const mappedQuestions = useMemo(
    () =>
      (questionsQuery.data || []).map((q) => ({
        id: q.question_id,
        text: q.question_text,
        type: mapQuestionType(q.question_type),
        rawType: q.question_type,
        isLive: Boolean(q.is_live),
        answerRevealed: Boolean(q.answer_revealed),
        correctOptionIds: (q.correct_option_ids || []).map(Number),
        showLeaderboard: Boolean(q.show_leaderboard),
        options: q.question_options || [],
        timeLimit: q.time_limit_seconds || 0,
      })),
    [questionsQuery.data],
  )

  useEffect(() => {
    setQuestionLbVisibleByQuestion((prev) => {
      const next = { ...prev }
      mappedQuestions.forEach((q) => {
        next[String(q.id)] = Boolean(q.showLeaderboard)
      })
      return next
    })
  }, [mappedQuestions])

  useEffect(() => {
    setAnswerRevealByQuestion((prev) => {
      const merged = { ...prev }
      mappedQuestions.forEach((q) => {
        const key = String(q.id)
        if (q.answerRevealed) {
          merged[key] = {
            revealed: true,
            correctOptionIds: q.correctOptionIds || [],
          }
        } else if (merged[key]) {
          merged[key] = { revealed: false, correctOptionIds: [] }
        }
      })
      return merged
    })
  }, [mappedQuestions])

  const activeQuestions = useMemo(
    () => mappedQuestions.filter((q) => q.isLive),
    [mappedQuestions],
  )

  const session = sessionQuery.data
  const isSessionEnded =
    session?.status === 'completed' || session?.status === 'archived'
  const showOverallLeaderboard = Boolean(session?.leaderboard_enabled)
  const navigationEnabled = session?.participant_navigation_enabled !== false

  const question = useMemo(() => {
    if (!activeQuestions.length) return null
    if (!navigationEnabled) {
      return getLockedNavigationQuestion(
        activeQuestions,
        liveQuestionId,
        quizSubmittedQuestionIds,
      )
    }
    if (liveQuestionId) {
      const live = activeQuestions.find((q) => q.id === liveQuestionId)
      if (live) return live
    }
    const idx = clamp(questionIndex, 0, activeQuestions.length - 1)
    return activeQuestions[idx] ?? null
  }, [
    activeQuestions,
    liveQuestionId,
    questionIndex,
    navigationEnabled,
    quizSubmittedQuestionIds,
  ])

  const joinRequirement = session?.join_type || 'name'
  const timeLimit = question?.timeLimit ?? 0
  const hasCountdown = Number(timeLimit) > 0
  const questionLockedBySubmission = Boolean((quizSubmittedQuestionIds || {})[String(question?.id)])
  const dbSessionId = session?.session_id

  const questionCountdown = question?.id
    ? (quizCountdownByQuestion || {})[String(question.id)]
    : null
  const countdownEndsAt = questionCountdown?.endsAt ?? null
  const countdownFrozen = questionCountdown?.frozen ?? null

  const timer = useMemo(() => {
    if (isSessionEnded && hasCountdown) {
      if (countdownFrozen != null) return countdownFrozen
      return 0
    }
    if (!hasCountdown || !countdownEndsAt) return 0
    return Math.max(0, Math.ceil((countdownEndsAt - Date.now()) / 1000))
  }, [isSessionEnded, hasCountdown, countdownFrozen, countdownEndsAt, countdownTick])

  const submittedAtSeconds =
    questionLockedBySubmission && countdownFrozen != null ? countdownFrozen : null

  const inputsLocked =
    isSessionEnded || (hasCountdown && (questionLockedBySubmission || timer === 0))

  const activeQuestionsRef = useRef(activeQuestions)
  activeQuestionsRef.current = activeQuestions

  /** Host activated a question while participant was mid-timed-attempt — apply when idle. */
  const pendingActivatedQuestionIdRef = useRef(null)

  const tryApplyPendingActivatedQuestion = useCallback(() => {
    const pendingId = pendingActivatedQuestionIdRef.current
    if (pendingId == null) return false

    const visibleActiveQuestions = activeQuestionsRef.current
    if (!visibleActiveQuestions.some((q) => q.id === pendingId)) return false

    const store = useParticipantStore.getState()

    if (store.quizLiveQuestionId === pendingId) {
      pendingActivatedQuestionIdRef.current = null
      return false
    }

    const canNavigate = navigationEnabled
      ? canAutoNavigateToActivatedQuestion({
          activeQuestions: visibleActiveQuestions,
          liveQuestionId: store.quizLiveQuestionId,
          questionIndex: store.quizQuestionIndex,
          quizSubmittedQuestionIds: store.quizSubmittedQuestionIds,
        })
      : !isParticipantAttemptingQuestion(
          getLockedNavigationQuestion(
            visibleActiveQuestions,
            store.quizLiveQuestionId,
            store.quizSubmittedQuestionIds,
          ),
          store.quizSubmittedQuestionIds,
        )
    if (!canNavigate) return false

    pendingActivatedQuestionIdRef.current = null
    setStep('active')
    setLiveQuestionId(pendingId)
    setSubmitted(false)
    return true
  }, [navigationEnabled, setLiveQuestionId, setSubmitted])

  const advanceToNextUnsubmittedActiveQuestion = useCallback(() => {
    if (navigationEnabled) return false
    const store = useParticipantStore.getState()
    const submittedIds = store.quizSubmittedQuestionIds || {}
    const visible = activeQuestionsRef.current
    const currentId = store.quizLiveQuestionId ?? question?.id ?? null
    const next = findNextUnsubmittedActiveQuestion(visible, submittedIds, currentId)
    if (!next) return false
    setLiveQuestionId(next.id)
    setSubmitted(false)
    return true
  }, [navigationEnabled, question?.id, setLiveQuestionId, setSubmitted])

  const handleHostQuestionActivated = useCallback(
    (questionId) => {
      pendingActivatedQuestionIdRef.current = questionId
      tryApplyPendingActivatedQuestion()
    },
    [tryApplyPendingActivatedQuestion],
  )

  useEffect(() => {
    tryApplyPendingActivatedQuestion()
  }, [tryApplyPendingActivatedQuestion, activeQuestions, quizSubmittedQuestionIds, step])

  useEffect(() => {
    setSubmitted(questionLockedBySubmission)
  }, [questionLockedBySubmission, setSubmitted])

  const client = useMemo(() => {
    if (!effectiveSessionCode || !participantToken) return null
    return createRealtimeClient(
      '',
      { session: effectiveSessionCode, token: participantToken, role: 'participant' },
      'participant',
    )
  }, [effectiveSessionCode, participantToken])

  useEffect(() => {
    const unsub = useParticipantStore.persist.onFinishHydration(() => {
      setParticipantHydrated(true)
    })
    if (useParticipantStore.persist.hasHydrated()) {
      setParticipantHydrated(true)
    }
    return unsub
  }, [])

  useEffect(() => {
    if (!participantHydrated || hasSessionCodeInUrl || sessionCodeInput) return
    const { joinedSessionCode: storedCode } = useParticipantStore.getState()
    if (storedCode) {
      setSessionCodeInput(storedCode)
    }
  }, [participantHydrated, hasSessionCodeInUrl, sessionCodeInput])

  useEffect(() => {
    if (!participantHydrated || !effectiveSessionCode) return
    const { participantToken: token, joinedSessionCode, clearParticipant } =
      useParticipantStore.getState()
    if (token && joinedSessionCode && joinedSessionCode !== effectiveSessionCode) {
      clearParticipant()
      setStep('join')
    }
  }, [participantHydrated, effectiveSessionCode])

  useEffect(() => {
    if (!participantHydrated || !session || !effectiveSessionCode) return
    const { participantToken: token, joinedSessionCode } = useParticipantStore.getState()
    if (!token || joinedSessionCode !== effectiveSessionCode) return
    setStep((current) => {
      if (current !== 'join') return current
      const s = session.status
      if (s === 'completed' || s === 'archived') return 'active'
      if (s === 'live' || s === 'paused') return 'active'
      return 'waiting'
    })
  }, [participantHydrated, session, effectiveSessionCode])

  useEffect(() => {
    sessionEndedNotifiedRef.current = false
    setSessionEndedModal(false)
  }, [effectiveSessionCode])

  useEffect(() => {
    if (!participantToken || !session) return
    if (session.status !== 'completed' && session.status !== 'archived') return
    freezeAllCountdowns()
    if (sessionEndedNotifiedRef.current) return
    sessionEndedNotifiedRef.current = true
    setSessionEndedModal(true)
  }, [participantToken, session?.status, freezeAllCountdowns])

  useEffect(() => {
    if (!isSessionEnded) return
    freezeAllCountdowns()
  }, [isSessionEnded, freezeAllCountdowns])

  useEffect(() => {
    if (!client || !effectiveSessionCode || !participantToken || !dbSessionId) return

    const offConnected = client.on(RealtimeEvent.CONNECTED, () => {
      queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
    })

    const offSession = client.on('session_updated', (data) => {
      if (data?.status) {
        queryClient.setQueryData(['participant-session', effectiveSessionCode], (old) =>
          old ? { ...old, status: data.status } : old,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
      if (data.status === 'completed' || data.status === 'live') {
        queryClient.invalidateQueries({ queryKey: ['participant-leaderboard', dbSessionId] })
      }
      if (data.status === 'completed' || data.status === 'archived') {
        freezeAllCountdowns()
        if (!sessionEndedNotifiedRef.current) {
          sessionEndedNotifiedRef.current = true
          setSessionEndedModal(true)
        }
      }
      if (Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard)
      }
    })

    const handleReattemptOpened = (data) => {
      const qid = Number(data?.question_id)
      if (!qid) return

      unlockQuestionForReattempt(qid)
      setStep('active')
      setLiveQuestionId(qid)
      const preview = String(data?.question_text || '').trim()
      setReattemptModal({
        variant: 'info',
        title: 'Question reopened',
        message: preview
          ? `The host has reopened this question for another attempt:\n\n“${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}”\n\nYou can change your answer and submit again.`
          : 'The host has reopened a question for another attempt. You can change your answer and submit again.',
        confirmLabel: 'Go to question',
      })
      queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      if (dbSessionId) {
        queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
      }
    }

    const offQuestion = client.on('question_changed', (data) => {
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })

      if (!data.question_id) return

      if (data.is_live) {
        handleHostQuestionActivated(data.question_id)
      } else {
        if (pendingActivatedQuestionIdRef.current === data.question_id) {
          pendingActivatedQuestionIdRef.current = null
        }
        setLiveQuestionId((current) => (current === data.question_id ? null : current))
      }
    })

    const offReattempt = client.on(RealtimeEvent.QUESTION_REATTEMPT_OPENED, handleReattemptOpened)

    const offAnswerReveal = client.on(RealtimeEvent.ANSWER_REVEALED, (data) => {
      const qid = String(data?.question_id ?? '')
      if (!qid) return
      setAnswerRevealByQuestion((prev) => ({
        ...prev,
        [qid]: {
          revealed: Boolean(data.answer_revealed),
          correctOptionIds: (data.correct_option_ids || []).map(Number),
        },
      }))
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
    })

    const offResp = client.on('response_received', () => {
      queryClient.invalidateQueries({ queryKey: ['participant-qa', dbSessionId] })
    })

    const offLeaderboard = client.on(RealtimeEvent.LEADERBOARD_UPDATE, (data) => {
      if (Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard)
      }
      if (data.question_id != null && data.question_leaderboard) {
        setQuestionLeaderboardByQuestion((prev) => ({
          ...prev,
          [String(data.question_id)]: data.question_leaderboard,
        }))
      }
    })

    const offSessionSettings = client.on(RealtimeEvent.SESSION_SETTINGS_UPDATED, (data) => {
      queryClient.setQueryData(['participant-session', effectiveSessionCode], (old) =>
        old
          ? {
              ...old,
              leaderboard_enabled: data.leaderboard_enabled ?? old.leaderboard_enabled,
              participant_navigation_enabled:
                data.participant_navigation_enabled ?? old.participant_navigation_enabled,
            }
          : old,
      )
    })

    const offQuestionLbVisibility = client.on(
      RealtimeEvent.QUESTION_LEADERBOARD_VISIBILITY,
      (data) => {
        const qid = String(data?.question_id ?? '')
        if (!qid) return
        setQuestionLbVisibleByQuestion((prev) => ({
          ...prev,
          [qid]: Boolean(data.show_leaderboard),
        }))
        if (!data.show_leaderboard) {
          setQuestionLeaderboardByQuestion((prev) => {
            const next = { ...prev }
            delete next[qid]
            return next
          })
        }
        queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
      },
    )

    client.connect()

    return () => {
      offConnected()
      offSession()
      offQuestion()
      offReattempt()
      offAnswerReveal()
      offResp()
      offLeaderboard()
      offSessionSettings()
      offQuestionLbVisibility()
      client.disconnect()
    }
  }, [
    client,
    effectiveSessionCode,
    participantToken,
    queryClient,
    dbSessionId,
    unlockQuestionForReattempt,
    setLiveQuestionId,
    handleHostQuestionActivated,
    freezeAllCountdowns,
  ])

  useEffect(() => {
    if (step === 'qa' && showOverallLeaderboard && dbSessionId) {
      queryClient.invalidateQueries({ queryKey: ['participant-leaderboard', dbSessionId] })
    }
  }, [step, showOverallLeaderboard, dbSessionId, queryClient])

  useEffect(() => {
    if (!activeQuestions.length) {
      setLiveQuestionId(null)
      setQuestionIndex(0)
      return
    }

    if (!navigationEnabled) {
      const locked = getLockedNavigationQuestion(
        activeQuestions,
        liveQuestionId,
        quizSubmittedQuestionIds,
      )
      if (locked) {
        const idx = activeQuestions.findIndex((q) => q.id === locked.id)
        if (idx !== -1) setQuestionIndex(idx)
        if (liveQuestionId !== locked.id) {
          setLiveQuestionId(locked.id)
        }
      }
      return
    }

    if (liveQuestionId) {
      const idx = activeQuestions.findIndex((q) => q.id === liveQuestionId)
      if (idx !== -1) {
        setQuestionIndex(idx)
        return
      }
      setLiveQuestionId(null)
    }

    setQuestionIndex((prev) => clamp(prev, 0, activeQuestions.length - 1))
  }, [
    activeQuestions,
    liveQuestionId,
    navigationEnabled,
    quizSubmittedQuestionIds,
    setLiveQuestionId,
    setQuestionIndex,
  ])

  useEffect(() => {
    if (navigationEnabled || step !== 'active' || !activeQuestions.length) return
    const submittedIds = quizSubmittedQuestionIds || {}
    const currentId = question?.id
    if (!currentId || !submittedIds[String(currentId)]) return
    if (tryApplyPendingActivatedQuestion()) return
    advanceToNextUnsubmittedActiveQuestion()
  }, [
    navigationEnabled,
    step,
    activeQuestions,
    question?.id,
    quizSubmittedQuestionIds,
    tryApplyPendingActivatedQuestion,
    advanceToNextUnsubmittedActiveQuestion,
  ])

  const displayQuestionIndex = useMemo(() => {
    if (!question?.id || !activeQuestions.length) return 0
    const idx = activeQuestions.findIndex((q) => q.id === question.id)
    return idx !== -1 ? idx : clamp(questionIndex, 0, activeQuestions.length - 1)
  }, [question?.id, activeQuestions, questionIndex])

  const isLastDisplayedQuestion = navigationEnabled
    ? activeQuestions.length > 0 && displayQuestionIndex === activeQuestions.length - 1
    : true

  const canSubmitCurrentQuestion = useMemo(() => {
    if (!question?.id) return false
    if ((quizSubmittedQuestionIds || {})[String(question.id)]) return false
    return participantQuestionHasAnswer(question, responses[question.id])
  }, [question, responses, quizSubmittedQuestionIds])

  const hasFinalizePayload = useMemo(
    () =>
      activeQuestions.some((q) =>
        shouldIncludeQuestionInFinalize(
          q,
          quizSubmittedQuestionIds,
          navigationEnabled,
          responses,
        ),
      ),
    [activeQuestions, responses, quizSubmittedQuestionIds, navigationEnabled],
  )

  const currentQuestionAnswered = useMemo(
    () => participantQuestionHasAnswer(question, responses[question?.id]),
    [question, responses],
  )

  const canGoToNextQuestion = useMemo(() => {
    if (!hasCountdown) return true
    if (questionLockedBySubmission) return true
    if (timer === 0) return true
    return currentQuestionAnswered
  }, [hasCountdown, questionLockedBySubmission, timer, currentQuestionAnswered])

  const goToQuestionIndex = useCallback(
    (nextIndex) => {
      if (!navigationEnabled || !activeQuestions.length) return
      const n = clamp(nextIndex, 0, activeQuestions.length - 1)
      if (hasCountdown && n > displayQuestionIndex && !canGoToNextQuestion) return
      setLiveQuestionId(null)
      setQuestionIndex(n)
    },
    [
      activeQuestions.length,
      hasCountdown,
      displayQuestionIndex,
      canGoToNextQuestion,
      navigationEnabled,
      setLiveQuestionId,
      setQuestionIndex,
    ],
  )

  useEffect(() => {
    if (isSessionEnded) return
    if (step !== 'active' || !hasCountdown) return
    const id = setInterval(() => setCountdownTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isSessionEnded, step, hasCountdown, question?.id])

  useEffect(() => {
    if (isSessionEnded) return
    if (step !== 'active' || !question?.id) return
    if (!hasCountdown) {
      setQuizCountdown({ questionId: null, endsAt: null })
      return
    }
    const qid = question.id
    const s = useParticipantStore.getState()
    const submittedIds = s.quizSubmittedQuestionIds || {}
    const qidStr = String(qid)
    const byQuestion = s.quizCountdownByQuestion || {}
    if (submittedIds[qidStr]) {
      if (!byQuestion[qidStr]) {
        setQuizCountdown({ questionId: qid, endsAt: Date.now() })
        useParticipantStore.getState().freezeCountdownAfterSubmit(qid)
      }
      return
    }
    if (byQuestion[qidStr]?.endsAt != null) return
    setQuizCountdown({ questionId: qid, endsAt: Date.now() + timeLimit * 1000 })
  }, [
    isSessionEnded,
    step,
    question?.id,
    hasCountdown,
    timeLimit,
    setQuizCountdown,
    quizSubmittedQuestionIds,
  ])

  useEffect(() => {
    if (step !== 'active' || !question?.id || hasCountdown) return
    markQuestionOpened(question.id)
  }, [step, question?.id, hasCountdown, markQuestionOpened])

  useEffect(() => {
    if (!session) return
    if (session.status === 'live' && step === 'waiting') {
      setTransitioningLive(true)
      const id = setTimeout(() => {
        setTransitioningLive(false)
        setStep('active')
      }, 900)
      return () => clearTimeout(id)
    }
  }, [session, step])

  const approvedQa = useMemo(
    () => (qaQuery.data || []).filter((q) => q.moderation_status === 'approved'),
    [qaQuery.data],
  )

  const hasAnyQuestionSaved = useMemo(
    () => Object.keys(quizSubmittedQuestionIds || {}).length > 0,
    [quizSubmittedQuestionIds],
  )

  const leaderboardQuery = useQuery({
    queryKey: ['participant-leaderboard', dbSessionId, participantToken],
    queryFn: () => getSessionLeaderboardApi(participantToken, dbSessionId),
    enabled: Boolean(
      participantToken &&
        dbSessionId &&
        showOverallLeaderboard &&
        (step === 'qa' || hasAnyQuestionSaved || session?.status === 'completed'),
    ),
    staleTime: 5000,
  })

  useEffect(() => {
    if (leaderboardQuery.data != null) {
      setLeaderboard(leaderboardQuery.data)
    }
  }, [leaderboardQuery.data])

  const currentResponse = responses[question?.id] || {}
  const answerRevealMeta =
    answerRevealByQuestion[String(question?.id)] ||
    (question?.answerRevealed
      ? {
          revealed: true,
          correctOptionIds: question.correctOptionIds || [],
        }
      : null)
  const isAnswerRevealed = Boolean(answerRevealMeta?.revealed)
  const hasAttemptedQuestion = Boolean(questionLockedBySubmission || (hasCountdown && timer === 0))
  const canSeeAnswerReveal = isAnswerRevealed && hasAttemptedQuestion
  const participantAnswerIsCorrect = useMemo(() => {
    if (!canSeeAnswerReveal || !question) return null
    return isParticipantChoiceCorrect(question, currentResponse, answerRevealMeta)
  }, [canSeeAnswerReveal, question, currentResponse, answerRevealMeta])
  const currentQuestionLeaderboard = question?.id
    ? questionLeaderboardByQuestion[String(question.id)] || []
    : []
  const isCurrentQuestionLeaderboardVisible = question?.id
    ? Boolean(questionLbVisibleByQuestion[String(question.id)])
    : false
  const showCurrentQuestionLeaderboard =
    isCurrentQuestionLeaderboardVisible &&
    step === 'active' &&
    Boolean(questionLockedBySubmission || submitted)

  const buildFinalPayload = useCallback(() => {
    const { quizCountdownByQuestion: countdowns, quizQuestionOpenedAt: openedAt } =
      useParticipantStore.getState()
    const submittedIds = quizSubmittedQuestionIds || {}
    return activeQuestions
      .filter((q) =>
        shouldIncludeQuestionInFinalize(q, submittedIds, navigationEnabled, responses),
      )
      .map((q) => {
        const payload = buildResponsePayloadForQuestion(q, responses[q.id])
        if (!payload) return null
        const responseTimeMs = computeResponseTimeMs(q, countdowns, openedAt)
        if (responseTimeMs != null) {
          payload.response_time_ms = responseTimeMs
        }
        return payload
      })
      .filter(Boolean)
  }, [activeQuestions, responses, quizSubmittedQuestionIds, navigationEnabled])

  const submitQuestionById = useCallback(
    async (questionId) => {
      if (isSessionEnded) return false
      if (!participantToken || !questionId) return false
      const q = activeQuestions.find((item) => item.id === questionId)
      if (!q) return false
      const payload = buildResponsePayloadForQuestion(q, responses[questionId])
      if (!payload) return false
      const alreadySubmitted = Boolean((quizSubmittedQuestionIds || {})[String(questionId)])
      if (
        alreadySubmitted &&
        !participantCanUpdateSubmittedResponse(q, navigationEnabled)
      ) {
        return true
      }

      const responseTimeMs = computeResponseTimeMs(
        q,
        useParticipantStore.getState().quizCountdownByQuestion,
        useParticipantStore.getState().quizQuestionOpenedAt,
      )
      if (responseTimeMs != null) {
        payload.response_time_ms = responseTimeMs
      }

      try {
        await submitResponseApi(participantToken, payload)
        markQuestionsSubmitted([questionId])
        if (Number(q.timeLimit) > 0) {
          freezeCountdownAfterSubmit(questionId)
        }
        return true
      } catch (err) {
        console.error(err)
        return false
      }
    },
    [
      isSessionEnded,
      participantToken,
      activeQuestions,
      responses,
      quizSubmittedQuestionIds,
      markQuestionsSubmitted,
      freezeCountdownAfterSubmit,
      navigationEnabled,
    ],
  )

  const handleSubmitResponse = async () => {
    if (isSessionEnded) return false
    const payloads = buildFinalPayload()
    if (!payloads.length || !participantToken) return false

    setIsSubmitting(true)
    const hadCountdown = hasCountdown
    try {
      await Promise.all(payloads.map((p) => submitResponseApi(participantToken, p)))
      markQuestionsSubmitted(payloads.map((p) => p.question_id))
      if (hadCountdown && question?.id) freezeCountdownAfterSubmit(question.id)
      if (dbSessionId) {
        queryClient.invalidateQueries({ queryKey: ['participant-leaderboard', dbSessionId] })
      }
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitCurrentQuestion = async () => {
    if (isSessionEnded || !question?.id) return
    if ((quizSubmittedQuestionIds || {})[String(question.id)]) {
      const moved = tryApplyPendingActivatedQuestion() || advanceToNextUnsubmittedActiveQuestion()
      if (!moved) {
        setSubmitModal({
          variant: 'success',
          title: 'Already submitted',
          message: 'Please wait for the host to open the next question.',
          confirmLabel: 'OK',
        })
      }
      return
    }
    setIsSubmitting(true)
    try {
      const ok = await submitQuestionById(question.id)
      if (ok) {
        setSubmitted(true)
        const moved =
          tryApplyPendingActivatedQuestion() || advanceToNextUnsubmittedActiveQuestion()
        if (moved) {
          setSubmitted(false)
        }
        setSubmitModal({
          variant: 'success',
          title: 'Submission successful',
          message: moved
            ? 'Your answer was submitted. Continue with the next question when you are ready.'
            : 'Your answer was submitted. Please wait for the host to open the next question.',
          confirmLabel: 'Continue',
        })
      } else {
        setSubmitModal({
          variant: 'error',
          title: 'Submission failed',
          message: 'We could not submit your answer. Check your connection and try again.',
          confirmLabel: 'Try again',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = async () => {
    if (isSessionEnded || !navigationEnabled) return
    if (!question?.id || isLastDisplayedQuestion) return
    if (participantQuestionHasAnswer(question, responses[question.id])) {
      await submitQuestionById(question.id)
    }
    if (tryApplyPendingActivatedQuestion()) {
      setSubmitted(false)
      return
    }
    goToQuestionIndex(displayQuestionIndex + 1)
    setSubmitted(false)
  }

  const handlePrevious = () => {
    if (!navigationEnabled || displayQuestionIndex <= 0) return
    goToQuestionIndex(displayQuestionIndex - 1)
  }

  const handleSubmit = async () => {
    if (isSessionEnded) return
    if (!isLastDisplayedQuestion) return
    const ok = await handleSubmitResponse()
    if (ok) {
      setSubmitModal({
        variant: 'success',
        title: 'Submission successful',
        message:
          'Your answers were submitted successfully. You can keep browsing questions or open Q&A when ready.',
        confirmLabel: 'Continue',
      })
    } else {
      setSubmitModal({
        variant: 'error',
        title: 'Submission failed',
        message: 'We could not submit your answers. Check your connection and try again.',
        confirmLabel: 'Try again',
      })
    }
  }

  const handleNextOrSubmit = async () => {
    if (isSessionEnded) return
    if (!navigationEnabled) {
      await handleSubmitCurrentQuestion()
      return
    }
    if (isLastDisplayedQuestion) {
      await handleSubmit()
      return
    }
    await handleNext()
  }

  const handleTimerFinalize = async () => {
    if (!question?.id) return
    if (isLastDisplayedQuestion) {
      await handleSubmitResponse()
      tryApplyPendingActivatedQuestion()
      return
    }
    await handleNext()
  }

  useEffect(() => {
    if (isSessionEnded) return
    if (step !== 'active') return
    if (!hasCountdown) return
    if (timer > 0) return
    if (questionLockedBySubmission) return

    const qid = question?.id

    if (!navigationEnabled) {
      const timeout = setTimeout(async () => {
        if (qid != null) {
          await submitQuestionById(qid)
        }
        setSubmitted(true)
        const moved =
          tryApplyPendingActivatedQuestion() || advanceToNextUnsubmittedActiveQuestion()
        if (moved) {
          setSubmitted(false)
        }
      }, 800)
      return () => clearTimeout(timeout)
    }

    const isLast = isLastDisplayedQuestion

    if (!isLast) {
      const nextIdx = displayQuestionIndex + 1
      const timeout = setTimeout(async () => {
        if (qid != null) {
          await submitQuestionById(qid)
        }
        if (tryApplyPendingActivatedQuestion()) return
        setLiveQuestionId(null)
        setQuestionIndex(nextIdx)
      }, 800)

      return () => clearTimeout(timeout)
    }

    if (!questionLockedBySubmission) {
      const timeout = setTimeout(() => {
        handleTimerFinalize()
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [
    isSessionEnded,
    navigationEnabled,
    timer,
    step,
    displayQuestionIndex,
    activeQuestions.length,
    questionLockedBySubmission,
    hasCountdown,
    question?.id,
    isLastDisplayedQuestion,
    submitQuestionById,
    tryApplyPendingActivatedQuestion,
    advanceToNextUnsubmittedActiveQuestion,
    setLiveQuestionId,
    setQuestionIndex,
  ])

  const sessionLookupFailed =
    Boolean(effectiveSessionCode) &&
    sessionQuery.isFetched &&
    !sessionQuery.isLoading &&
    (!session || sessionQuery.isError)

  const handleJoin = async (event) => {
    event.preventDefault()
    setJoinError('')

    if (!effectiveSessionCode) {
      setJoinError('Please enter a session code')
      return
    }

    if (!session) {
      setJoinError('Session not found. Check the code and try again.')
      return
    }

    try {
      let nickname, checkEmail, isAnonymous

      if (joinRequirement === 'anonymous') {
        nickname = 'Anonymous'
        checkEmail = null
        isAnonymous = true
      } else if (joinRequirement === 'name') {
        if (!name?.trim()) {
          setJoinError('Please enter your name')
          return
        }
        nickname = name.trim()
        checkEmail = null
        isAnonymous = false
      } else if (joinRequirement === 'name_email') {
        if (!name?.trim()) {
          setJoinError('Please enter your name')
          return
        }
        if (!email?.trim()) {
          setJoinError('Please enter your email')
          return
        }
        nickname = name.trim()
        checkEmail = email.trim()
        isAnonymous = false
      }

      const result = await joinSessionApi(effectiveSessionCode, {
        nickname,
        email: checkEmail,
        is_anonymous: isAnonymous,
      })
      resetQuizProgress()
      setParticipant({
        token: result.token,
        participant: {
          name: result.participant.nickname || 'Anonymous',
          email: result.participant.email,
          anonymous: result.participant.is_anonymous,
        },
        sessionCode: effectiveSessionCode,
      })
      if (session.status === 'completed' || session.status === 'archived') {
        setStep('active')
      } else if (session.status === 'live' || session.status === 'paused') {
        setStep('active')
      } else {
        setStep('waiting')
      }
      setJoinError('')
    } catch (err) {
      setJoinError(err.message || 'Failed to join session')
    }
  }

  const allowAnonymousQa = session?.allow_anonymous_qa || false

  const handleAskQuestion = async () => {
    if (!dbSessionId || !askText.trim() || !participantToken) return

    try {
      const newQ = await askQaQuestionApi(participantToken, dbSessionId, {
        question_text: askText.trim(),
        is_anonymous: allowAnonymousQa ? askAnonymous : false,
      })
      if (newQ) {
        setOwnQuestions((prev) => [
          { id: newQ.qa_question_id, text: newQ.question_text, status: newQ.moderation_status },
          ...prev,
        ])
      }
      setAskText('')
      setAskAnonymous(false)
    } catch (err) {
      console.error('Failed to ask question:', err)
    }
  }

  const handleUpvote = async (qaId) => {
    if (!participantToken) return
    try {
      await upvoteQaApi(participantToken, qaId)
      setUpvotes((prev) => ({ ...prev, [qaId]: (prev[qaId] || 0) + 1 }))
    } catch (err) {
      console.error('Failed to upvote:', err)
    }
  }

  const updateResponse = useCallback(
    (questionId, patch) => {
      if (isSessionEnded) return
      setResponses((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], ...patch },
      }))
    },
    [isSessionEnded, setResponses],
  )

  const handleAddWordCloudTag = useCallback(
    (questionId) => {
      if (isSessionEnded) return
      const t = tagsInput.trim()
      if (!t) return
      setResponses((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          tags: [...(prev[questionId]?.tags || []), t].slice(0, 10),
        },
      }))
      setTagsInput('')
    },
    [isSessionEnded, tagsInput, setResponses],
  )

  if (!participantHydrated) {
    return (
      <PageCenteredShell>
        <p className="text-slate-600">Restoring session...</p>
      </PageCenteredShell>
    )
  }

  const canUseStoredJoin =
    Boolean(participantToken) &&
    Boolean(joinedSessionCode) &&
    Boolean(effectiveSessionCode) &&
    joinedSessionCode === effectiveSessionCode

  const showJoinForm = !canUseStoredJoin && step === 'join'

  if (showJoinForm) {
    return (
      <JoinFormView
        hasSessionCodeInUrl={hasSessionCodeInUrl}
        sessionCodeInput={sessionCodeInput}
        onSessionCodeChange={setSessionCodeInput}
        sessionLookupFailed={sessionLookupFailed}
        effectiveSessionCode={effectiveSessionCode}
        sessionQueryLoading={sessionQuery.isLoading}
        showJoinDetails={Boolean(session)}
        session={session}
        joinRequirement={joinRequirement}
        name={name}
        onNameChange={setName}
        email={email}
        onEmailChange={setEmail}
        joinError={joinError}
        onSubmit={handleJoin}
      />
    )
  }

  if (effectiveSessionCode && sessionQuery.isLoading) {
    return (
      <PageCenteredShell>
        <p className="text-slate-600">Loading session...</p>
      </PageCenteredShell>
    )
  }

  if (effectiveSessionCode && sessionLookupFailed) {
    return (
      <PageCenteredShell>
        <h1 className="text-2xl font-bold text-navy-900">Session not found</h1>
        <p className="mt-2 text-slate-600">The join link is invalid or this session was removed.</p>
      </PageCenteredShell>
    )
  }

  if (!session) {
    return (
      <PageCenteredShell>
        <p className="text-slate-600">Loading session...</p>
      </PageCenteredShell>
    )
  }

  if (step === 'waiting') {
    return <WaitingView session={session} transitioningLive={transitioningLive} />
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-sky-50 via-white to-indigo-50 p-4 md:p-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <SessionHeader
          session={session}
          joinedUser={joinedUser}
          step={step}
          onStepChange={setStep}
        />

        {step === 'active' && !activeQuestions.length && <WaitingForQuestion />}

        {step === 'active' && question && (
          <ActiveQuestionPanel
            question={question}
            activeQuestions={activeQuestions}
            displayQuestionIndex={displayQuestionIndex}
            hasCountdown={hasCountdown}
            canGoToNextQuestion={canGoToNextQuestion}
            inputsLocked={inputsLocked}
            hasAnyQuestionSaved={hasAnyQuestionSaved}
            timeLimit={timeLimit}
            timer={timer}
            submittedAtSeconds={submittedAtSeconds}
            currentResponse={currentResponse}
            answerRevealMeta={answerRevealMeta}
            isAnswerRevealed={isAnswerRevealed}
            hasAttemptedQuestion={hasAttemptedQuestion}
            canSeeAnswerReveal={canSeeAnswerReveal}
            participantAnswerIsCorrect={participantAnswerIsCorrect}
            sessionEnded={isSessionEnded}
            tagsInput={tagsInput}
            submitted={submitted}
            navigationEnabled={navigationEnabled}
            isLastDisplayedQuestion={isLastDisplayedQuestion}
            isSubmitting={isSubmitting}
            hasFinalizePayload={navigationEnabled ? hasFinalizePayload : canSubmitCurrentQuestion}
            showCurrentQuestionLeaderboard={showCurrentQuestionLeaderboard}
            currentQuestionLeaderboard={currentQuestionLeaderboard}
            onTagsInputChange={setTagsInput}
            onAddTag={handleAddWordCloudTag}
            onSelectOption={(questionId, optionText) =>
              updateResponse(questionId, { selectedOption: optionText })
            }
            onSelectRating={(questionId, rating) => updateResponse(questionId, { rating })}
            onTextChange={(questionId, text) => updateResponse(questionId, { textResponse: text })}
            onPrevious={handlePrevious}
            onNextOrSubmit={handleNextOrSubmit}
            onGoToQa={() => setStep('qa')}
          />
        )}

        {step === 'qa' && (
          <QaPanel
            showOverallLeaderboard={showOverallLeaderboard}
            hasAnyQuestionSaved={hasAnyQuestionSaved}
            sessionStatus={session?.status}
            leaderboard={leaderboard}
            onShowLeaderboard={() => setShowLeaderboard(true)}
            askText={askText}
            onAskTextChange={setAskText}
            allowAnonymousQa={allowAnonymousQa}
            askAnonymous={askAnonymous}
            onAskAnonymousChange={setAskAnonymous}
            onAskQuestion={handleAskQuestion}
            ownQuestions={ownQuestions}
            approvedQa={approvedQa}
            upvotes={upvotes}
            onUpvote={handleUpvote}
          />
        )}
      </div>

      <ParticipantAlertModal
        open={Boolean(submitModal)}
        variant={submitModal?.variant ?? 'success'}
        title={submitModal?.title ?? ''}
        message={submitModal?.message ?? ''}
        confirmLabel={submitModal?.confirmLabel ?? 'Continue'}
        onClose={() => setSubmitModal(null)}
      />

      <ParticipantAlertModal
        open={Boolean(reattemptModal)}
        variant={reattemptModal?.variant ?? 'info'}
        title={reattemptModal?.title ?? 'Question reopened'}
        message={reattemptModal?.message ?? ''}
        confirmLabel={reattemptModal?.confirmLabel ?? 'Go to question'}
        onClose={() => setReattemptModal(null)}
      />

      <ParticipantAlertModal
        open={sessionEndedModal}
        variant="info"
        title="Session ended"
        message="This session was ended by the host. Thank you for participating."
        confirmLabel="OK"
        onClose={() => setSessionEndedModal(false)}
      />

      <LeaderboardModal
        open={showLeaderboard}
        leaderboard={leaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </main>
  )
}

export default ParticipantSessionPage
