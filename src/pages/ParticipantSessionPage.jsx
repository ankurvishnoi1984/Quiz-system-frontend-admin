import { CheckCircle2, Clock3, Crown, Pencil, Send, Star, Trophy, Users, XCircle } from 'lucide-react'
// ChevronLeft, ChevronRight — kept for optional future arrow navigation
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
} from '../services/participantApi'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'
import { useParticipantStore } from '../store/participantStore'
import { getChoiceRevealClasses, isOptionCorrectForReveal } from '../utils/answerReveal'
import { hasSessionCodeInJoinPath, normalizeSessionCode } from '../utils/joinUrl'


function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
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

function findOptionForSelection(options, selected) {
  if (selected == null || selected === '' || !options?.length) return null
  const norm = String(selected).trim().toLowerCase()
  return options.find((o) => String(o.option_text || '').trim().toLowerCase() === norm) || null
}

function getTrueFalseChoices(question) {
  const opts = question?.options || []
  if (opts.length >= 2) {
    return [...opts].sort((a, b) => {
      const rank = (t) => (String(t).trim().toLowerCase() === 'true' ? 0 : 1)
      return rank(a.option_text) - rank(b.option_text)
    })
  }
  return [{ option_text: 'True' }, { option_text: 'False' }]
}

function buildResponsePayloadForQuestion(q, res) {
  if (!q || !res) return null

  const payload = { question_id: q.id }

  if (q.type === 'MCQ' || q.type === 'True/False') {
    const opt = findOptionForSelection(q.options, res.selectedOption)
    if (!opt?.option_id) return null
    payload.option_id = opt.option_id
  }

  if (q.type === 'Rating') payload.rating_value = res.rating

  if (q.type === 'Text' || q.type === 'Ranking') {
    const text = res.textResponse?.trim()
    if (!text) return null
    payload.text_response = text
  }

  if (q.type === 'Word Cloud') {
    const tags = (res.tags || []).join(', ')
    if (!tags) return null
    payload.text_response = tags
  }

  return payload
}

function participantQuestionHasAnswer(question, response = {}) {
  if (!question) return false
  if (question.type === 'MCQ' || question.type === 'True/False') {
    return Boolean(String(response.selectedOption || '').trim())
  }
  if (question.type === 'Rating') {
    return Number(response.rating) > 0
  }
  if (question.type === 'Text' || question.type === 'Ranking') {
    return Boolean(String(response.textResponse || '').trim())
  }
  if (question.type === 'Word Cloud') {
    return (response.tags || []).length > 0
  }
  return false
}


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
    quizSubmittedQuestionIds,
    setResponses,
    setQuestionIndex,
    setLiveQuestionId,
    setSubmitted,
    setQuizCountdown,
    resetQuizProgress,
    freezeCountdownAfterSubmit,
    markQuestionsSubmitted,
  } = useParticipantStore(
    useShallow((s) => ({
      responses: s.quizResponses,
      questionIndex: s.quizQuestionIndex,
      liveQuestionId: s.quizLiveQuestionId,
      submitted: s.quizSubmitted,
      quizCountdownByQuestion: s.quizCountdownByQuestion,
      quizSubmittedQuestionIds: s.quizSubmittedQuestionIds,
      setResponses: s.setQuizResponses,
      setQuestionIndex: s.setQuizQuestionIndex,
      setLiveQuestionId: s.setQuizLiveQuestionId,
      setSubmitted: s.setQuizSubmitted,
      setQuizCountdown: s.setQuizCountdown,
      resetQuizProgress: s.resetQuizProgress,
      freezeCountdownAfterSubmit: s.freezeCountdownAfterSubmit,
      markQuestionsSubmitted: s.markQuestionsSubmitted,
    })),
  )


  const [participantHydrated, setParticipantHydrated] = useState(() =>
    useParticipantStore.persist.hasHydrated(),
  )


  const [countdownTick, setCountdownTick] = useState(0)


  const [step, setStep] = useState('join') // join | waiting | active | qa
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
  const [leaderboard, setLeaderboard] = useState([])
  const [questionLeaderboardByQuestion, setQuestionLeaderboardByQuestion] = useState({})
  const [questionLbVisibleByQuestion, setQuestionLbVisibleByQuestion] = useState({})
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  /** { [questionId]: { revealed: boolean, correctOptionIds: number[] } } */
  const [answerRevealByQuestion, setAnswerRevealByQuestion] = useState({})


  const sessionQuery = useQuery({
    queryKey: ['participant-session', effectiveSessionCode],
    queryFn: () => lookupSessionApi(effectiveSessionCode),
    enabled: Boolean(effectiveSessionCode),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (step === 'waiting' || status === 'draft') return 3000
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

  /** Only host-activated questions are visible (Slido-style). */
  const activeQuestions = useMemo(
    () => mappedQuestions.filter((q) => q.isLive),
    [mappedQuestions],
  )

  const session = sessionQuery.data
  const showOverallLeaderboard = Boolean(session?.leaderboard_enabled)

  const question = useMemo(() => {
    if (!activeQuestions.length) return null
    if (liveQuestionId) {
      const live = activeQuestions.find((q) => q.id === liveQuestionId)
      if (live) return live
    }
    const idx = clamp(questionIndex, 0, activeQuestions.length - 1)
    return activeQuestions[idx] ?? null
  }, [activeQuestions, liveQuestionId, questionIndex])
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
    if (hasCountdown && questionLockedBySubmission && countdownFrozen != null) return countdownFrozen
    if (!hasCountdown || !countdownEndsAt) return 0
    return Math.max(0, Math.ceil((countdownEndsAt - Date.now()) / 1000))
  }, [hasCountdown, questionLockedBySubmission, countdownFrozen, countdownEndsAt, countdownTick])


  /** Timed: lock after server submit / local advance, or when time hits zero */
  const inputsLocked = hasCountdown && (questionLockedBySubmission || timer === 0)


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

  const activeQuestionsRef = useRef(activeQuestions)
  activeQuestionsRef.current = activeQuestions


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
    const { participantToken: token, joinedSessionCode, clearParticipant } = useParticipantStore.getState()
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
    if (!client || !effectiveSessionCode || !participantToken || !dbSessionId) return

    const offConnected = client.on(RealtimeEvent.CONNECTED, () => {
      queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
    })

    const offSession = client.on('session_updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['participant-session', effectiveSessionCode] })
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
      if (data.status === 'completed' || data.status === 'live') {
        queryClient.invalidateQueries({ queryKey: ['participant-leaderboard', dbSessionId] })
      }
      if (Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard)
      }
    })


    const offQuestion = client.on('question_changed', (data) => {
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })

      if (!data.question_id) return

      if (data.is_live) {
        setLiveQuestionId(data.question_id)
      } else {
        setLiveQuestionId((current) =>
          current === data.question_id ? null : current,
        )
      }
    })

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
      offAnswerReveal()
      offResp()
      offLeaderboard()
      offSessionSettings()
      offQuestionLbVisibility()
      client.disconnect()
    }
  }, [client, effectiveSessionCode, participantToken, queryClient, dbSessionId])

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

    if (liveQuestionId) {
      const idx = activeQuestions.findIndex((q) => q.id === liveQuestionId)
      if (idx !== -1) {
        setQuestionIndex(idx)
        return
      }
      setLiveQuestionId(null)
    }

    setQuestionIndex((prev) => clamp(prev, 0, activeQuestions.length - 1))
  }, [activeQuestions, liveQuestionId])

  const displayQuestionIndex = useMemo(() => {
    if (!question?.id || !activeQuestions.length) return 0
    const idx = activeQuestions.findIndex((q) => q.id === question.id)
    return idx !== -1 ? idx : clamp(questionIndex, 0, activeQuestions.length - 1)
  }, [question?.id, activeQuestions, questionIndex])

  const isLastDisplayedQuestion =
    activeQuestions.length > 0 &&
    displayQuestionIndex === activeQuestions.length - 1

  /** Payload across all active open questions — used only for final Submit. */
  const hasFinalizePayload = useMemo(
    () =>
      activeQuestions.some(
        (q) =>
          !(quizSubmittedQuestionIds || {})[String(q.id)] &&
          buildResponsePayloadForQuestion(q, responses[q.id]) != null,
      ),
    [activeQuestions, responses, quizSubmittedQuestionIds],
  )

  const currentQuestionAnswered = useMemo(
    () => participantQuestionHasAnswer(question, responses[question?.id]),
    [question, responses],
  )

  /** Timed: forward nav only after an answer or when the per-question timer hits zero */
  const canGoToNextQuestion = useMemo(() => {
    if (!hasCountdown) return true
    if (questionLockedBySubmission) return true
    if (timer === 0) return true
    return currentQuestionAnswered
  }, [hasCountdown, questionLockedBySubmission, timer, currentQuestionAnswered])

  const goToQuestionIndex = useCallback(
    (nextIndex) => {
      if (!activeQuestions.length) return
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
      setLiveQuestionId,
      setQuestionIndex,
    ],
  )


  useEffect(() => {
    if (step !== 'active' || !hasCountdown || questionLockedBySubmission) return
    const id = setInterval(() => setCountdownTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [step, hasCountdown, question?.id, questionLockedBySubmission])


  useEffect(() => {
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
  }, [step, question?.id, hasCountdown, timeLimit, setQuizCountdown, quizSubmittedQuestionIds])


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

  /** Only show reveal styling after the participant has submitted or the timer ended. */
  const hasAttemptedQuestion = Boolean(
    questionLockedBySubmission || (hasCountdown && timer === 0),
  )
  const canSeeAnswerReveal = isAnswerRevealed && hasAttemptedQuestion
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


  const buildFinalPayload = useCallback(
    () =>
      activeQuestions
        .filter((q) => !(quizSubmittedQuestionIds || {})[String(q.id)])
        .map((q) => buildResponsePayloadForQuestion(q, responses[q.id]))
        .filter(Boolean),
    [activeQuestions, responses, quizSubmittedQuestionIds],
  )

  const submitQuestionById = useCallback(
    async (questionId) => {
      if (!participantToken || !questionId) return false
      const q = activeQuestions.find((item) => item.id === questionId)
      if (!q) return false
      const payload = buildResponsePayloadForQuestion(q, responses[questionId])
      if (!payload) return false
      if ((quizSubmittedQuestionIds || {})[String(questionId)]) return true

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
      participantToken,
      activeQuestions,
      responses,
      quizSubmittedQuestionIds,
      markQuestionsSubmitted,
      freezeCountdownAfterSubmit,
    ],
  )

  const handleSubmitResponse = async () => {
    const payloads = buildFinalPayload()

    if (!payloads.length || !participantToken) return

    setIsSubmitting(true)
    const hadCountdown = hasCountdown
    try {
      await Promise.all(payloads.map((p) => submitResponseApi(participantToken, p)))
      markQuestionsSubmitted(payloads.map((p) => p.question_id))
      if (hadCountdown && question?.id) freezeCountdownAfterSubmit(question.id)
      if (dbSessionId) {
        queryClient.invalidateQueries({ queryKey: ['participant-leaderboard', dbSessionId] })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  /** Next on open questions saves + advances; Submit runs full finalize on the last question. */
  const handleNext = async () => {
    if (!question?.id || isLastDisplayedQuestion) return
    if (participantQuestionHasAnswer(question, responses[question.id])) {
      await submitQuestionById(question.id)
    }
    goToQuestionIndex(displayQuestionIndex + 1)
    setSubmitted(false)
  }

  const handlePrevious = () => {
    if (displayQuestionIndex <= 0) return
    goToQuestionIndex(displayQuestionIndex - 1)
  }

  const handleSubmit = async () => {
    if (!isLastDisplayedQuestion) return
    await handleSubmitResponse()
  }

  /** @deprecated use handleNext / handleSubmit — kept for timer auto-advance */
  const handleNextOrSubmit = async () => {
    if (!question?.id) return
    if (isLastDisplayedQuestion) {
      await handleSubmitResponse()
      return
    }
    await handleNext()
  }

  useEffect(() => {
    if (step !== 'active') return
    if (!hasCountdown) return
    if (timer > 0) return
    if (questionLockedBySubmission) return

    const isLast = isLastDisplayedQuestion

    if (!isLast) {
      const qid = question?.id
      const nextIdx = displayQuestionIndex + 1
      const timeout = setTimeout(async () => {
        if (qid != null) {
          await submitQuestionById(qid)
        }
        setLiveQuestionId(null)
        setQuestionIndex(nextIdx)
      }, 800)

      return () => clearTimeout(timeout)
    }

    if (!questionLockedBySubmission) {
      const timeout = setTimeout(() => {
        handleSubmitResponse()
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [
    timer,
    step,
    displayQuestionIndex,
    activeQuestions.length,
    questionLockedBySubmission,
    hasCountdown,
    question?.id,
    isLastDisplayedQuestion,
    submitQuestionById,
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


  const allowAnonymousQa = session?.allow_anonymous_qa || false


  if (!participantHydrated) {
    return (
      <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Restoring session...</p>
        </div>
      </main>
    )
  }


  const canUseStoredJoin =
    Boolean(participantToken) &&
    Boolean(joinedSessionCode) &&
    Boolean(effectiveSessionCode) &&
    joinedSessionCode === effectiveSessionCode

  const showJoinForm = !canUseStoredJoin && step === 'join'

  if (showJoinForm) {
    const showJoinDetails = Boolean(session)

    return (
      <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-6">
        <form onSubmit={handleJoin} className="w-full max-w-lg space-y-4 rounded-2xl border border-blue-200/70 bg-white p-8 shadow-sm">
          <div className="text-center">
            <img src="/logo.svg" alt="Logo" className="mx-auto mb-4 h-12 w-42" />
            <h1 className="text-2xl font-bold text-navy-900">
              {showJoinDetails ? session.title : 'Join a session'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {showJoinDetails
                ? `Session code: ${session.session_code || effectiveSessionCode}`
                : 'Enter your session code to continue'}
            </p>
          </div>


          {!hasSessionCodeInUrl && (
            <div>
              <label className="text-sm font-semibold text-slate-700">Session code</label>
              <input
                value={sessionCodeInput}
                onChange={(e) => setSessionCodeInput(e.target.value.toUpperCase())}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 font-mono text-sm font-semibold tracking-widest text-navy-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                placeholder="Enter session code"
                autoComplete="off"
                spellCheck={false}
              />
              {sessionLookupFailed && effectiveSessionCode ? (
                <p className="mt-2 text-sm font-semibold text-red-700">
                  Session not found. Check the code and try again.
                </p>
              ) : null}
              {effectiveSessionCode && sessionQuery.isLoading ? (
                <p className="mt-2 text-sm text-slate-500">Looking up session...</p>
              ) : null}
            </div>
          )}


          {showJoinDetails && joinRequirement === 'anonymous' ? (
            <div>
              <label className="text-sm font-semibold text-slate-700">Name</label>
              <input
                value="Anonymous"
                disabled
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-slate-50 px-3 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          ) : showJoinDetails ? (
            <>
              <div>
                <label className="text-sm font-semibold text-slate-700">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  placeholder="Enter your name"
                />
              </div>


              {joinRequirement === 'name_email' && (
                <div>
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                    placeholder="Enter your email"
                  />
                </div>
              )}
            </>
          ) : null}


          {joinError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{joinError}</p>
          )}


          <button
            type="submit"
            disabled={!showJoinDetails}
            className="h-11 w-full rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join
          </button>
        </form>
      </main>
    )
  }


  if (effectiveSessionCode && sessionQuery.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Loading session...</p>
        </div>
      </main>
    )
  }


  if (effectiveSessionCode && sessionLookupFailed) {
    return (
      <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-navy-900">Session not found</h1>
          <p className="mt-2 text-slate-600">The join link is invalid or this session was removed.</p>
        </div>
      </main>
    )
  }


  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Loading session...</p>
        </div>
      </main>
    )
  }


  if (step === 'waiting') {
    return (
      <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-6">
        <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <Clock3 className={`size-7 ${transitioningLive ? 'animate-spin' : 'animate-pulse'}`} />
          </div>
          <h1 className="text-3xl font-bold text-navy-900">
            {transitioningLive ? 'Session is live!' : 'Waiting for the host to start...'}
          </h1>
          <p className="text-slate-600">{session.title}</p>
          <div className="mx-auto flex max-w-md items-center justify-center gap-6 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">
            <span className="inline-flex items-center gap-2"><Users className="size-4" /> {session.participant_count || 0} participants</span>
            <span>Fun fact: Participants respond 2x faster with visuals.</span>
          </div>
        </div>
      </main>
    )
  }


  return (
    <main className="min-h-screen bg-linear-to-br from-sky-50 via-white to-indigo-50 p-4 md:p-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white p-4 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-navy-900">{session.title}</h1>
            <p className="text-sm text-slate-600">
              {joinedUser?.anonymous ? 'Anonymous participant' : `${joinedUser?.name}${joinedUser?.email ? ` • ${joinedUser.email}` : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('active')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${step === 'active' ? 'bg-blue-100 text-blue-900' : 'border border-blue-200/70 bg-white text-slate-700'}`}
            >
              Question
            </button>
            <button
              type="button"
              onClick={() => setStep('qa')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${step === 'qa' ? 'bg-blue-100 text-blue-900' : 'border border-blue-200/70 bg-white text-slate-700'}`}
            >
              Q&A
            </button>
          </div>
        </div>


        {step === 'active' && !activeQuestions.length && (
          <section className="space-y-4 rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Clock3 className="size-7 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-navy-900">Waiting for a question</h2>
            <p className="text-sm text-slate-600">
              The host will open each question one at a time (or several at once). This page updates automatically when a question is activated.
            </p>
          </section>
        )}

        {step === 'active' && question && (
          <section className="space-y-4 rounded-2xl border border-blue-200/70 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {/*
                <button
                  type="button"
                  aria-label="Previous question"
                  disabled={displayQuestionIndex <= 0}
                  onClick={() => goToQuestionIndex(displayQuestionIndex - 1)}
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-blue-200/70 bg-white text-slate-600 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-5" />
                </button>
                */}
                <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-navy-700">
                  Question {displayQuestionIndex + 1} / {activeQuestions.length}
                </p>
                {/*
                <button
                  type="button"
                  aria-label="Next question"
                  disabled={
                    displayQuestionIndex >= activeQuestions.length - 1 ||
                    (hasCountdown && !canGoToNextQuestion)
                  }
                  onClick={() => goToQuestionIndex(displayQuestionIndex + 1)}
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-blue-200/70 bg-white text-slate-600 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-5" />
                </button>
                */}
              </div>
              {hasCountdown && !canGoToNextQuestion && (
                <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
                  Answer this question or wait for the timer to use Next.
                </p>
              )}
              {hasCountdown && canGoToNextQuestion && inputsLocked && (
                <p className="max-w-[min(100%,20rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
                  Timed: use Previous and Next to browse; answers cannot be changed after submit or when time runs out.
                </p>
              )}
              {!hasCountdown && hasAnyQuestionSaved && (
                <p className="max-w-[min(100%,18rem)] text-right text-[11px] font-medium leading-snug text-slate-500">
                  No timer: revisit open questions and use Submit on the last question to update.
                </p>
              )}
            </div>
            {question.media?.url && question.media.kind === 'image' && (
              <img src={question.media.url} alt="Question media" className="max-h-80 w-full rounded-2xl border border-blue-100 object-contain" />
            )}
            {question.media?.url && question.media.kind === 'video' && (
              <video src={question.media.url} controls className="max-h-80 w-full rounded-2xl border border-blue-100" />
            )}
            <h2 className="text-2xl font-bold text-navy-900">{question.text || 'Untitled question'}</h2>


            {hasCountdown && (
              <div className="rounded-xl border border-blue-200/70 bg-white p-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-slate-700">Time left</span>
                  <span className={timer <= 5 ? 'text-red-700' : 'text-navy-700'}>{timer}s</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${timer <= 5 ? 'bg-red-500' : 'bg-linear-to-r from-navy-600 to-navy-500'}`}
                    style={{ width: `${Math.round((timer / Math.max(1, timeLimit)) * 100)}%` }}
                  />
                </div>
              </div>
            )}


            {canSeeAnswerReveal && (question.type === 'MCQ' || question.type === 'True/False') ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                Correct answer revealed — your choice is highlighted in green or red.
              </p>
            ) : null}
            {isAnswerRevealed && !hasAttemptedQuestion && (question.type === 'MCQ' || question.type === 'True/False') ? (
              <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-slate-600">
                Answer this question first. The correct answer will be shown after you submit or when time runs out.
              </p>
            ) : null}

            {question.type === 'MCQ' && (
              <div className="grid gap-2 md:grid-cols-2">
                {(question.options || []).map((o, idx) => {
                  const isSelected = currentResponse.selectedOption === o.option_text
                  const isCorrect = isOptionCorrectForReveal(o, answerRevealMeta)
                  return (
                  <button
                    key={o.option_id}
                    disabled={inputsLocked}
                    type="button"
                    onClick={() => {
                      setResponses((prev) => ({
                        ...prev,
                        [question.id]: {
                          ...prev[question.id],
                          selectedOption: o.option_text,
                        },
                      }))
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${getChoiceRevealClasses({
                      isSelected,
                      isCorrectOption: isCorrect,
                      answerRevealed: canSeeAnswerReveal,
                    })}`}
                  >
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {o.option_text}
                  </button>
                  )
                })}
              </div>
            )}


            {question.type === 'Rating' && (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    disabled={inputsLocked}
                    type="button"
                    onClick={() => {
                      setResponses((prev) => ({
                        ...prev,
                        [question.id]: {
                          ...prev[question.id],
                          rating: i + 1,
                        },
                      }))
                    }}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${currentResponse.rating === i + 1 ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
                      }`}
                  >
                    <Star className={`size-4 ${currentResponse.rating >= i + 1 ? 'text-amber-500' : 'text-slate-400'}`} />
                    {i + 1}
                  </button>
                ))}
              </div>
            )}


            {(question.type === 'Text' || question.type === 'Ranking') && (
              <div>
                <textarea
                  value={currentResponse.textResponse || ''}
                  disabled={inputsLocked}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 300)


                    setResponses((prev) => ({
                      ...prev,
                      [question.id]: {
                        ...prev[question.id],
                        textResponse: value,
                      },
                    }))
                  }}
                  className="h-28 w-full resize-none rounded-2xl border border-blue-200/70 bg-white p-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                  placeholder="Type your response..."
                />
                <p className="mt-1 text-right text-xs text-slate-500">{currentResponse.textResponse}/300</p>
              </div>
            )}


            {question.type === 'Word Cloud' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={tagsInput}
                    disabled={inputsLocked}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="h-11 flex-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                    placeholder="Type a word and add"
                  />
                  <button
                    type="button"
                    disabled={inputsLocked}
                    onClick={() => {
                      const t = tagsInput.trim()
                      if (!t) return


                      setResponses((prev) => ({
                        ...prev,
                        [question.id]: {
                          ...prev[question.id],
                          tags: [...(prev[question.id]?.tags || []), t].slice(0, 10),
                        },
                      }))


                      setTagsInput('')
                    }}
                    className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(currentResponse.tags || []).map((t, idx) => (
                    <span key={`${t}-${idx}`} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-navy-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}


            {question.type === 'True/False' && (
              <div className="grid gap-2 sm:grid-cols-2">
                {getTrueFalseChoices(question).map((o) => {
                  const label = o.option_text
                  const isSelected =
                    String(currentResponse.selectedOption || '').trim().toLowerCase() ===
                    String(label).trim().toLowerCase()
                  const isCorrect = isOptionCorrectForReveal(o, answerRevealMeta)
                  return (
                    <button
                      disabled={inputsLocked}
                      key={label}
                      type="button"
                      onClick={() => {
                        setResponses((prev) => ({
                          ...prev,
                          [question.id]: {
                            ...prev[question.id],
                            selectedOption: label,
                          },
                        }))
                      }}
                      className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${getChoiceRevealClasses({
                        isSelected,
                        isCorrectOption: isCorrect,
                        answerRevealed: canSeeAnswerReveal,
                      })}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}


            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Previous question"
                disabled={displayQuestionIndex <= 0}
                onClick={handlePrevious}
                className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                aria-label="Next question"
                disabled={
                  isSubmitting ||
                  isLastDisplayedQuestion ||
                  (hasCountdown && !canGoToNextQuestion)
                }
                title={
                  hasCountdown && !canGoToNextQuestion
                    ? 'Answer this question or wait for the timer'
                    : isLastDisplayedQuestion
                      ? 'You are on the last question — use Submit to finish'
                      : undefined
                }
                onClick={() => handleNext()}
                className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && !isLastDisplayedQuestion ? 'Saving...' : 'Next'}
              </button>
              <button
                type="button"
                aria-label="Submit all answers and finish"
                disabled={
                  isSubmitting ||
                  !isLastDisplayedQuestion ||
                  !hasFinalizePayload ||
                  (hasCountdown && !canGoToNextQuestion)
                }
                title={
                  !isLastDisplayedQuestion
                    ? 'Complete every question — Submit is available on the last question'
                    : !hasFinalizePayload
                      ? 'Answer the open question(s) before submitting'
                      : hasCountdown && !canGoToNextQuestion
                        ? 'Answer this question or wait for the timer'
                        : undefined
                }
                onClick={() => handleSubmit()}
                className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && isLastDisplayedQuestion ? 'Submitting...' : 'Submit'}
              </button>
              {isLastDisplayedQuestion && submitted && !hasCountdown && (
                <button
                  type="button"
                  onClick={() => setStep('qa')}
                  className="h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
                >
                  Go to Q&A
                </button>
              )}
            </div>


            {submitted && !hasCountdown && (
              <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 p-4">
                <Pencil className="mt-0.5 size-5 shrink-0 text-sky-700" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-navy-900">Modify your responses anytime</p>
                  <p className="mt-1 text-xs text-slate-600">
                    There is no timer on this question. Change your answer above and use Submit on the last question to update your submission.
                  </p>
                </div>
              </div>
            )}


            {submitted && hasCountdown && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">Response received!</p>
              </div>
            )}

            {showCurrentQuestionLeaderboard && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">
                  <Trophy className="mr-2 inline size-4" />
                  Question leaderboard
                </p>
                {currentQuestionLeaderboard.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {currentQuestionLeaderboard.slice(0, 5).map((entry, idx) => (
                      <div key={entry.participant_id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-700">
                          {idx === 0 ? <Crown className="size-4 text-amber-500" /> : `${idx + 1}.`}
                          {entry.name || entry.nickname || 'Anonymous'}
                        </span>
                        <span className="font-semibold text-amber-700">{entry.score}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-700">
                    Rankings will appear as participants answer this question.
                  </p>
                )}
              </div>
            )}
          </section>
        )}


        {step === 'qa' && (
          <section className="space-y-4 rounded-2xl border border-blue-200/70 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-navy-900">Q&A</h2>
            {showOverallLeaderboard && (hasAnyQuestionSaved || session?.status === 'completed') && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-amber-900">
                    <Trophy className="mr-2 inline size-4" />
                    Leaderboard
                  </p>
                  {leaderboard.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowLeaderboard(true)}
                      className="text-xs font-semibold text-amber-700 hover:underline"
                    >
                      View all
                    </button>
                  )}
                </div>
                {leaderboard.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {leaderboard.slice(0, 3).map((entry, idx) => (
                      <div key={entry.participant_id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-700">
                          {idx === 0 ? <Crown className="size-4 text-amber-500" /> : `${idx + 1}.`}
                          {entry.name || entry.nickname || 'Anonymous'}
                        </span>
                        <span className="font-semibold text-amber-700">{entry.score}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-700">Leaderboard will appear after participants submit responses.</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <textarea
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                className="h-24 w-full resize-none rounded-2xl border border-blue-200/70 bg-white p-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                placeholder="Ask a question..."
              />
              <div className="flex flex-wrap items-center gap-2">
                {allowAnonymousQa && (
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={askAnonymous}
                      onChange={(e) => setAskAnonymous(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
                    />
                    Ask anonymously
                  </label>
                )}
                <button
                  type="button"
                  onClick={handleAskQuestion}
                  className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 transition hover:brightness-110"
                >
                  <Send className="size-4" />
                  Submit
                </button>
              </div>
            </div>


            {!!ownQuestions.length && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-navy-900">Your questions</p>
                {ownQuestions.map((q) => (
                  <div key={q.id} className="rounded-2xl border border-blue-200 bg-navy-900/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">{q.text}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-navy-700">
                        {q.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}


            <div className="space-y-2">
              <p className="text-sm font-semibold text-navy-900">Approved questions</p>
              {approvedQa.map((q) => (
                <div key={q.qa_question_id} className="rounded-2xl border border-blue-200/70 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{q.question_text}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {q.answer_status === 'answered' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="size-3" /> Answered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <XCircle className="size-3" /> Pending
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpvote(q.qa_question_id)}
                      className="rounded-xl border border-blue-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
                    >
                      Upvote {(upvotes[q.qa_question_id] || 0) + (q.upvote_count || 0)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>


      {showLeaderboard && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-navy-950/20 backdrop-blur-sm"
            onClick={() => setShowLeaderboard(false)}
            aria-label="Close leaderboard"
          />
          <div className="relative mx-auto mt-20 w-[min(92vw,520px)] rounded-2xl border border-amber-200/70 bg-white p-5 shadow-2xl shadow-blue-900/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Leaderboard</p>
                <h3 className="mt-1 text-xl font-bold text-navy-900">Top Participants</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                className="rounded-xl border border-amber-200/70 p-2 text-slate-600 transition hover:bg-amber-50"
                aria-label="Close"
              >
                <XCircle className="size-4" />
              </button>
            </div>


            <div className="mt-4 space-y-2">
              {leaderboard.map((row, idx) => (
                <div key={row.participant_id} className="flex items-center justify-between rounded-2xl border border-amber-200/60 bg-amber-50/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white">
                      {idx === 0 ? <Crown className="size-4" /> : idx + 1}
                    </div>
                    <p className="font-semibold text-navy-900">{row.name || row.nickname || 'Anonymous'}</p>
                  </div>
                  <p className="text-sm font-bold text-navy-900">{row.score}</p>
                </div>
              ))}
              {!leaderboard.length ? (
                <p className="text-sm text-slate-500 text-center py-4">No scores yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}


export default ParticipantSessionPage