import { CheckCircle2, Clock3, Send, Star, Users, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  askQaQuestionApi,
  joinSessionApi,
  listQaQuestionsApi,
  listSessionQuestionsApi,
  lookupSessionApi,
  submitResponseApi,
  upvoteQaApi,
} from '../services/participantApi'
import { useRealtimeParticipant } from '../services/realtimeClient'
import { useParticipantStore } from '../store/participantStore'

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

function ParticipantSessionPage() {
  const { sessionId } = useParams()
  const queryClient = useQueryClient()
  const { participantToken, joinedUser, setParticipant } = useParticipantStore()

  const [step, setStep] = useState('join') // join | waiting | active | qa
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [joinError, setJoinError] = useState('')
  const [transitioningLive, setTransitioningLive] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [liveQuestionId, setLiveQuestionId] = useState(null)
  const [timer, setTimer] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [tagsInput, setTagsInput] = useState('')
  const [showLiveResult, setShowLiveResult] = useState(true)

  const [askText, setAskText] = useState('')
  const [askAnonymous, setAskAnonymous] = useState(false)
  const [upvotes, setUpvotes] = useState({})
  const [ownQuestions, setOwnQuestions] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [responses, setResponses] = useState({})

  const sessionQuery = useQuery({
    queryKey: ['participant-session', sessionId],
    queryFn: () => lookupSessionApi(sessionId),
    enabled: !!sessionId,
    retry: false,
  })

  const questionsQuery = useQuery({
    queryKey: ['participant-questions', sessionQuery.data?.session_id, participantToken],
    queryFn: () => listSessionQuestionsApi(participantToken, sessionQuery.data?.session_id),
    enabled: Boolean(participantToken && sessionQuery.data?.session_id),
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
        options: q.question_options || [],
        timeLimit: q.time_limit_seconds || 0,
      })),
    [questionsQuery.data],
  )

  // const currentLiveQuestion = useMemo(
  //   () => mappedQuestions.find((q) => q.isLive) || null,
  //   [mappedQuestions],
  // )

  const session = sessionQuery.data
  const question = liveQuestionId
  ? mappedQuestions.find((q) => q.id === liveQuestionId)
  : mappedQuestions[questionIndex]
  const joinRequirement = session?.is_anonymous_default ? 'anonymous' : 'name'
  const timeLimit = question?.timeLimit || 0
  const dbSessionId = session?.session_id

  const client = useRealtimeParticipant(sessionId, participantToken)

  useEffect(() => {
  if (!sessionId || !participantToken || !dbSessionId) return

  const offOpen = client.on('open', () => {})
  const offClose = client.on('close', () => {})

  const offSession = client.on('session_updated', (data) => {
    if (data.status === 'live') {
      queryClient.invalidateQueries({ queryKey: ['participant-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })
    }
  })

  const offQuestion = client.on('question_changed', (data) => {
    queryClient.invalidateQueries({ queryKey: ['participant-questions', dbSessionId] })

    if (data.is_live && data.question_id) {
      // ✅ Set live question
      setLiveQuestionId(data.question_id)

      // ✅ Sync index (important for counter UI)
      setQuestionIndex((prev) => {
        const idx = mappedQuestions.findIndex(q => q.id === data.question_id)
        return idx !== -1 ? idx : prev
      })

      // ✅ Only reset submission state
      setSubmitted(false)

      // ❌ DO NOT reset responses or input state
    }
  })

  const offResp = client.on('response_received', () => {
    queryClient.invalidateQueries({ queryKey: ['participant-qa', dbSessionId] })
  })

  client.connect()

  return () => {
    offOpen()
    offClose()
    offSession()
    offQuestion()
    offResp()
    client.disconnect()
  }
}, [sessionId, participantToken, client, queryClient, dbSessionId, mappedQuestions])

  useEffect(() => {
  if (!liveQuestionId || !mappedQuestions.length) return

  const exists = mappedQuestions.some(q => q.id === liveQuestionId)

  if (!exists) {
    setLiveQuestionId(null)
    setQuestionIndex((prev) =>
      clamp(prev, 0, mappedQuestions.length - 1)
    )
  }
}, [mappedQuestions, liveQuestionId])

const isLastQuestion = questionIndex === mappedQuestions.length - 1

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

  useEffect(() => {
    if (step !== 'active' || !timeLimit) return
    setTimer(timeLimit)
  }, [questionIndex, step, timeLimit])

  useEffect(() => {
    if (step !== 'active' || !timeLimit || timer <= 0 || submitted) return
    const id = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [step, timeLimit, timer, submitted])

  useEffect(() => {
  if (step !== 'active') return
  if (timer > 0) return

  const isLastQuestion = questionIndex === mappedQuestions.length - 1

  if (!isLastQuestion) {
    const timeout = setTimeout(() => {
      setLiveQuestionId(null)
      setQuestionIndex((i) => i + 1)
      setSubmitted(false)
    }, 800) // small delay for UX

    return () => clearTimeout(timeout)
  }
}, [timer, step, questionIndex, mappedQuestions.length])

  const approvedQa = useMemo(
    () => (qaQuery.data || []).filter((q) => q.moderation_status === 'approved'),
    [qaQuery.data],
  )



  const currentResponse = responses[question?.id] || {}

  const buildFinalPayload = () => {
  return Object.entries(responses).map(([questionId, res]) => {
    const q = mappedQuestions.find(q => q.id == questionId)
    if (!q) return null

    const payload = {
      question_id: q.id,
    }

    if (q.type === 'MCQ' || q.type === 'True/False') {
      const opt = q.options.find(o => o.option_text === res.selectedOption)
      if (opt) payload.option_id = opt.option_id
    }

    if (q.type === 'Rating') payload.rating_value = res.rating

    if (q.type === 'Text' || q.type === 'Ranking') {
      payload.text_response = res.textResponse?.trim()
    }

    if (q.type === 'Word Cloud') {
      payload.text_response = (res.tags || []).join(', ')
    }

    return payload
  }).filter(Boolean)
}
const handleSubmitResponse = async () => {
  const payloads = buildFinalPayload()

  if (!payloads.length || !participantToken) return

  setIsSubmitting(true)
  try {
    await Promise.all(
      payloads.map(p => submitResponseApi(participantToken, p))
    )
    setSubmitted(true)
  } catch (err) {
    console.error(err)
  } finally {
    setIsSubmitting(false)
  }
}

  const handleJoin = async (event) => {
    event.preventDefault()
    if (!session) return

    try {
      const result = await joinSessionApi(sessionId, {
        nickname: name.trim() || (joinRequirement === 'anonymous' ? 'Anonymous' : null),
        email: email.trim() || null,
        is_anonymous: joinRequirement === 'anonymous',
      })
      setParticipant({
        token: result.token,
        participant: {
          name: result.participant.nickname || 'Anonymous',
          email: result.participant.email,
          anonymous: result.participant.is_anonymous,
        },
      })
      setStep(session.status === 'live' ? 'active' : 'waiting')
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

  if (!session && !sessionQuery.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-navy-900">Session not found</h1>
          <p className="mt-2 text-slate-600">The join link is invalid or this session was removed.</p>
        </div>
      </main>
    )
  }

  if (sessionQuery.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Loading session...</p>
        </div>
      </main>
    )
  }

  if (!participantToken && step === 'join') {
    return (
      <main className="grid min-h-screen place-items-center bg-linear-to-br from-sky-50 via-white to-indigo-50 p-6">
        <form onSubmit={handleJoin} className="w-full max-w-lg space-y-4 rounded-2xl border border-blue-200/70 bg-white p-8 shadow-sm">
          <div className="text-center">
            <img src="/logo.svg" alt="Logo" className="mx-auto mb-4 h-12 w-42" />
            <h1 className="text-2xl font-bold text-navy-900">{session.title}</h1>
            <p className="mt-1 text-sm text-slate-600">Join session {session.session_id}</p>
          </div>

          {joinRequirement !== 'anonymous' && (
            <div>
              <label className="text-sm font-semibold text-slate-700">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                placeholder="Enter your name"
              />
            </div>
          )}

          {joinRequirement === 'name_email' && (
            <div>
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                placeholder="Enter your email"
              />
            </div>
          )}

          {joinError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{joinError}</p>
          )}

          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110"
          >
            Join
          </button>
        </form>
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

        {step === 'active' && question && (
          <section className="space-y-4 rounded-2xl border border-blue-200/70 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Question {questionIndex + 1} / {mappedQuestions.length}
            </p>
            {question.media?.url && question.media.kind === 'image' && (
              <img src={question.media.url} alt="Question media" className="max-h-80 w-full rounded-2xl border border-blue-100 object-contain" />
            )}
            {question.media?.url && question.media.kind === 'video' && (
              <video src={question.media.url} controls className="max-h-80 w-full rounded-2xl border border-blue-100" />
            )}
            <h2 className="text-2xl font-bold text-navy-900">{question.text || 'Untitled question'}</h2>

            {!!timeLimit && (
              <div className="rounded-xl border border-blue-200/70 bg-white p-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-slate-700">Time left</span>
                  <span className={timer <= 5 ? 'text-red-700' : 'text-blue-700'}>{timer}s</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${timer <= 5 ? 'bg-red-500' : 'bg-linear-to-r from-blue-600 to-indigo-600'}`}
                    style={{ width: `${Math.round((timer / Math.max(1, timeLimit)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {question.type === 'MCQ' && (
              <div className="grid gap-2 md:grid-cols-2">
                {(question.options || []).map((o, idx) => (
                  <button
                    key={o.option_id}
                    disabled={timer === 0 || submitted}
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
                    className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${
                      currentResponse.selectedOption === o.option_text ? 'border-blue-400 bg-blue-50 text-blue-900' : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {o.option_text}
                  </button>
                ))}
              </div>
            )}

            {question.type === 'Rating' && (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    disabled={timer === 0 || submitted}
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
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      currentResponse.rating === i + 1 ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
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
                    disabled={timer === 0 || submitted}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="h-11 flex-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                    placeholder="Type a word and add"
                  />
                  <button
                    type="button"
                    disabled={timer === 0 || submitted}
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
                    <span key={`${t}-${idx}`} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {question.type === 'True/False' && (
              <div className="grid gap-2 sm:grid-cols-2">
                {['True', 'False'].map((v) => (
                  <button
                    disabled={timer === 0 || submitted}
                    key={v}
                    type="button"
                    onClick={() => {
                      setResponses((prev) => ({
                        ...prev,
                        [question.id]: {
                          ...prev[question.id],
                          selectedOption: v,
                        },
                      }))
                    }}
                    className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                      currentResponse.selectedOption === v ? 'border-blue-400 bg-blue-50 text-blue-900' : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={timer === 0 || submitted}
                onClick={handleSubmitResponse}
                disabled={!Object.keys(responses).length || isSubmitting}
                className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                type="button"
                disabled={isLastQuestion}
                onClick={() => {
                  if (isLastQuestion) return

                  setLiveQuestionId(null)
                  setQuestionIndex((i) => i + 1)
                  setSubmitted(false)
                }}
                className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next question
              </button>
              <label className="ml-auto inline-flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showLiveResult}
                  onChange={(e) => setShowLiveResult(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500/40"
                />
                Show live result after submit
              </label>
            </div>

            {submitted && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">Response received!</p>
                {showLiveResult && (
                  <p className="mt-1 text-sm text-emerald-700">Live result preview is enabled for this question.</p>
                )}
              </div>
            )}
          </section>
        )}

        {step === 'qa' && (
          <section className="space-y-4 rounded-2xl border border-blue-200/70 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-navy-900">Q&A</h2>
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
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500/40"
                    />
                    Ask anonymously
                  </label>
                )}
                <button
                  type="button"
                  onClick={handleAskQuestion}
                  className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 transition hover:brightness-110"
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
                  <div key={q.id} className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-indigo-900">{q.text}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700">
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
    </main>
  )
}

export default ParticipantSessionPage

