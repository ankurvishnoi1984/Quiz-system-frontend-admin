import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronLeft, ChevronRight, Crown, Eye, Play, Square, ThumbsDown, ThumbsUp, Trophy, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'
import {
  getQuestionResultsApi,
  getSessionDetailApi,
  getSessionResponsesApi,
  listDepartmentSessionsApi,
  listQaQuestionsApi,
  listSessionQuestionsApi,
  qaModerateApi,
  setQuestionLiveStateApi,
  transitionSessionApi,
} from '../services/liveApi'
import { useRealtimeSession } from '../services/realtimeClient'


const COLORS = ['#1d4ed8', '#2563eb', '#4f46e5', '#0891b2', '#0ea5e9', '#6366f1']


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


  const sessionQuery = useQuery({
    queryKey: ['live-session', sessionId],
    queryFn: () => getSessionDetailApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
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
        options: q.question_options || [],
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
    const sessionCode = sessionQuery.data?.session_code
    if (!sessionCode || !accessToken) return


    const client = useRealtimeSession(sessionCode, accessToken)
    const offOpen = client.on('open', () => setSocketStatus('connected'))
    const offClose = client.on('close', () => setSocketStatus('disconnected'))
    const offResp = client.on('response_received', () => {
      queryClient.invalidateQueries({ queryKey: ['live-question-results'] })
      queryClient.invalidateQueries({ queryKey: ['live-responses', sessionId] })
    })
    const offSession = client.on('session_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-dept-sessions'] })
    })
    const offQuestion = client.on('question_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    })


    client.connect()
    return () => {
      offOpen()
      offClose()
      offResp()
      offSession()
      offQuestion()
      client.disconnect()
    }
  }, [sessionQuery.data?.session_code, accessToken, queryClient, sessionId])


  const transitionMutation = useMutation({
    mutationFn: ({ action }) => transitionSessionApi(accessToken, sessionId, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] }),
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


  const qaMutation = useMutation({
    mutationFn: ({ qaId, action, body }) => qaModerateApi(accessToken, qaId, action, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['live-qa', sessionId] }),
    onError: (error) => setErrorMessage(error.message || 'Unable to update Q&A state'),
  })


  const participants = useMemo(() => {
    const unique = new Set((responsesQuery.data || []).map((r) => r.participant_id))
    return unique.size
  }, [responsesQuery.data])


  const currentResponses = useMemo(
    () => (responsesQuery.data || []).filter((r) => Number(r.question_id) === Number(activeQuestion?.id)),
    [responsesQuery.data, activeQuestion?.id],
  )
  const responded = currentResponses.length
  const responseRate = participants ? Math.round((responded / participants) * 100) : 0


  const optionData = useMemo(() => {
    const byOption = questionResultsQuery.data?.by_option || {}
    return (activeQuestion?.options || []).map((option) => ({
      name: option.option_text,
      value: Number(byOption[String(option.option_id)] || 0),
    }))
  }, [questionResultsQuery.data, activeQuestion?.options])


  const attemptsRows = useMemo(
    () =>
      currentResponses.slice(0, 100).map((row) => ({
        id: row.response_id,
        participant: row.participant?.nickname || `Participant ${row.participant_id}`,
        response:
          row.question_option?.option_text ||
          row.text_response ||
          (row.rating_value !== null && row.rating_value !== undefined ? String(row.rating_value) : '—'),
        submittedAt: row.submitted_at ? new Date(row.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      })),
    [currentResponses],
  )


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
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-800">Live Present Mode</p>
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
          <button
            type="button"
            onClick={() => transitionMutation.mutate({ action: session.status === 'live' ? 'pause' : 'resume' })}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            {session.status === 'live' ? <Square className="size-4" /> : <Play className="size-4" />}
            {session.status === 'live' ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={() => transitionMutation.mutate({ action: 'end' })}
            className="h-11 rounded-2xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700"
          >
            End Session
          </button>
          <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 px-4 text-sm font-semibold text-white">
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
        </div>
      </div>


      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}


      <div className="grid gap-6 2xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-blue-200/70 bg-white/85 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Current question</p>
              <h3 className="mt-1 text-xl font-bold text-navy-900">{activeQuestion?.text || 'No question selected'}</h3>
              <p className="text-sm text-slate-600">
                {activeQuestion ? `${questionIndex + 1} / ${mappedQuestions.length} • ${activeQuestion.type}` : 'Add questions in Builder first'}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))} disabled={questionIndex === 0} className="rounded-xl border border-blue-200 bg-white p-2 disabled:opacity-50">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" onClick={() => setQuestionIndex((i) => Math.min(mappedQuestions.length - 1, i + 1))} disabled={questionIndex >= mappedQuestions.length - 1} className="rounded-xl border border-blue-200 bg-white p-2 disabled:opacity-50">
                <ChevronRight className="size-4" />
              </button>
              <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <Eye className="mr-2 inline size-4" />
                Preview
              </button>
            </div>
          </div>


          {activeQuestion ? (
            <button
              type="button"
              disabled={!canEditLive}
              onClick={() => questionLiveMutation.mutate({ questionId: activeQuestion.id, isLive: !activeQuestion.isLive })}
              className="rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {activeQuestion.isLive ? 'Deactivate Question' : 'Activate Question'}
            </button>
          ) : null}


          <div className="rounded-2xl border border-blue-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>Response rate</span>
              <span>
                {responded} / {participants} ({responseRate}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-linear-to-r from-blue-600 to-indigo-600" style={{ width: `${responseRate}%` }} />
            </div>
          </div>


          <div className="rounded-2xl border border-blue-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-900">Attempts & responses</p>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{attemptsRows.length}</span>
            </div>
            <div className="mt-3 max-h-[280px] overflow-auto rounded-xl border border-blue-100">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-blue-100">
                    <th className="px-3 py-2 font-semibold text-slate-700">Participant</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Response</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attemptsRows.map((row) => (
                    <tr key={row.id} className="border-b border-blue-50 last:border-b-0">
                      <td className="px-3 py-2 text-slate-700">{row.participant}</td>
                      <td className="px-3 py-2 text-slate-700">{row.response}</td>
                      <td className="px-3 py-2 text-slate-600">{row.submittedAt}</td>
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


        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200/70 bg-white/85 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Live chart</p>
            <div className="mt-3 h-[300px] rounded-2xl border border-blue-200 bg-white p-3">
              <ResponsiveContainer width="100%" height="100%">
                {activeQuestion?.rawType === 'mcq' ? (
                  <BarChart data={optionData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {optionData.map((entry, idx) => (
                        <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Tooltip />
                    <Pie data={[{ name: 'Responses', value: responded || 0 }]} dataKey="value" nameKey="name" outerRadius={100}>
                      <Cell fill="#2563eb" />
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>


          <div className="rounded-2xl border border-blue-200/70 bg-white/85 p-5">
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


      <Modal open={previewOpen} title="Preview Participant View" onClose={() => setPreviewOpen(false)}>
        <div className="rounded-xl border border-blue-200 bg-white p-4">
          <h3 className="text-lg font-bold text-navy-900">{activeQuestion?.text || 'No question selected'}</h3>
          <p className="mt-1 text-sm text-slate-600">Type: {activeQuestion?.type || '—'}</p>
        </div>
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
    </section>
  )
}


export default LivePage