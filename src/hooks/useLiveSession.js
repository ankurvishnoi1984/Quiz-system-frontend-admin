import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSessionDetailApi,
  getSessionLeaderboardApi,
  getSessionResponsesApi,
  listSessionParticipantsApi,
  listSessionQuestionsApi,
} from '../services/liveApi'
import {
  getPresentViewLeaderboardApi,
  getPresentViewResponsesApi,
  getPresentViewSessionApi,
  listPresentViewParticipantsApi,
  listPresentViewQuestionsApi,
} from '../services/presentViewApi'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'
import {
  buildParticipantList,
  mapLiveQuestions,
  mapSessionParticipants,
  mergeParticipantLists,
} from '../utils/livePresentation'
import { SESSION_LEADERBOARD_TOP_N } from '../utils/leaderboard'

/** When WS is healthy, poll less often — push events cover most updates (Phase 1.5). */
const POLL_MS_WHEN_WS = 20000
const POLL_MS_WITHOUT_WS = 5000
const JOIN_INVALIDATE_DEBOUNCE_MS = 400

export function useLiveSession(accessToken, sessionId, options = {}) {
  const mode = options.mode || 'host'
  const isViewer = mode === 'viewer'
  const queryClient = useQueryClient()
  const onPresentSlideChangedRef = useRef(options.onPresentSlideChanged)
  const [wsConnected, setWsConnected] = useState(false)
  const joinInvalidateTimerRef = useRef(null)

  useEffect(() => {
    onPresentSlideChangedRef.current = options.onPresentSlideChanged
  }, [options.onPresentSlideChanged])

  const livePollMs = wsConnected ? POLL_MS_WHEN_WS : POLL_MS_WITHOUT_WS

  const sessionQuery = useQuery({
    queryKey: ['live-session', sessionId, mode],
    queryFn: () =>
      isViewer
        ? getPresentViewSessionApi(accessToken, sessionId)
        : getSessionDetailApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && status !== 'live' ? 2000 : false
    },
  })

  const sessionReady = Boolean(sessionQuery.data)
  const viewerSessionActive = !isViewer || sessionQuery.data?.status !== 'draft'

  const questionsQuery = useQuery({
    queryKey: ['live-questions', sessionId, mode],
    queryFn: () =>
      isViewer
        ? listPresentViewQuestionsApi(accessToken, sessionId)
        : listSessionQuestionsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId && sessionReady && viewerSessionActive),
    refetchInterval: livePollMs,
  })

  const responsesQuery = useQuery({
    queryKey: ['live-responses', sessionId, mode],
    queryFn: () =>
      isViewer
        ? getPresentViewResponsesApi(accessToken, sessionId)
        : getSessionResponsesApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId && sessionReady && viewerSessionActive),
    refetchInterval: livePollMs,
  })

  const leaderboardQuery = useQuery({
    queryKey: ['live-leaderboard', sessionId, mode, SESSION_LEADERBOARD_TOP_N],
    queryFn: () =>
      isViewer
        ? getPresentViewLeaderboardApi(accessToken, sessionId, { limit: SESSION_LEADERBOARD_TOP_N })
        : getSessionLeaderboardApi(accessToken, sessionId, { limit: SESSION_LEADERBOARD_TOP_N }),
    enabled: Boolean(accessToken && sessionId && sessionReady && viewerSessionActive),
    refetchInterval: livePollMs,
  })

  const participantsQuery = useQuery({
    queryKey: ['live-participants', sessionId, mode],
    queryFn: () =>
      isViewer
        ? listPresentViewParticipantsApi(accessToken, sessionId)
        : listSessionParticipantsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId && sessionReady && viewerSessionActive),
    refetchInterval: livePollMs,
  })

  const mappedQuestions = useMemo(
    () => mapLiveQuestions(questionsQuery.data),
    [questionsQuery.data],
  )

  const responses = responsesQuery.data || []
  const participants = useMemo(
    () =>
      mergeParticipantLists(
        mapSessionParticipants(participantsQuery.data),
        buildParticipantList(responses),
      ),
    [participantsQuery.data, responses],
  )
  const leaderboard = leaderboardQuery.data || []

  useEffect(() => {
    const sessionCode = sessionQuery.data?.session_code
    if (!sessionCode || !accessToken || !sessionId || !viewerSessionActive) return

    const client = createRealtimeClient(
      '',
      { session: sessionCode, token: accessToken, role: isViewer ? 'viewer' : 'host' },
      isViewer ? 'viewer' : 'host',
    )

    const invalidateStructural = () => {
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-responses', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-leaderboard', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-participants', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-question-results'] })
    }

    const invalidateResponseFanout = () => {
      queryClient.invalidateQueries({ queryKey: ['live-responses', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-leaderboard', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-question-results'] })
    }

    const scheduleParticipantsSync = () => {
      if (joinInvalidateTimerRef.current) return
      joinInvalidateTimerRef.current = setTimeout(() => {
        joinInvalidateTimerRef.current = null
        queryClient.invalidateQueries({ queryKey: ['live-participants', sessionId] })
      }, JOIN_INVALIDATE_DEBOUNCE_MS)
    }

    const offResp = client.on('response_received', invalidateResponseFanout)
    const offSession = client.on('session_updated', invalidateStructural)
    const offQuestion = client.on('question_changed', invalidateStructural)
    const offAnswerReveal = client.on(RealtimeEvent.ANSWER_REVEALED, invalidateStructural)
    const offQuestionLb = client.on(RealtimeEvent.QUESTION_LEADERBOARD_VISIBILITY, invalidateStructural)
    const offLeaderboard = client.on(RealtimeEvent.LEADERBOARD_UPDATE, (data) => {
      if (Array.isArray(data?.leaderboard)) {
        queryClient.setQueryData(
          ['live-leaderboard', sessionId, mode, SESSION_LEADERBOARD_TOP_N],
          data.leaderboard,
        )
      } else {
        queryClient.invalidateQueries({ queryKey: ['live-leaderboard', sessionId] })
      }
    })

    // Phase 1.4: join storm — do not invalidateAll (was refetching 5 heavy APIs per join)
    const offParticipantJoined = client.on(RealtimeEvent.PARTICIPANT_JOINED, (data) => {
      const incoming = data?.participant
      const pid = Number(incoming?.participant_id)
      if (Number.isFinite(pid)) {
        queryClient.setQueryData(['live-participants', sessionId, mode], (old) => {
          if (!Array.isArray(old)) return old
          if (old.some((row) => Number(row.participant_id) === pid)) return old
          return [
            ...old,
            {
              participant_id: pid,
              nickname: incoming.nickname || null,
            },
          ]
        })
        queryClient.setQueryData(['live-session', sessionId, mode], (old) => {
          if (!old) return old
          const current = Number(old.participants_count)
          return {
            ...old,
            participants_count: Number.isFinite(current) ? current + 1 : old.participants_count,
          }
        })
      }
      scheduleParticipantsSync()
    })

    const offSessionProgress = client.on('session_progress', (data) => {
      queryClient.setQueryData(['live-session', sessionId, mode], (old) => {
        if (!old) return old
        return {
          ...old,
          participants_count:
            data.participants_count !== undefined ? data.participants_count : old.participants_count,
          completed_participants:
            data.completed_participants !== undefined
              ? data.completed_participants
              : old.completed_participants,
          completion_progress:
            data.completion_progress !== undefined
              ? data.completion_progress
              : old.completion_progress,
        }
      })
    })

    const offConnected = client.on(RealtimeEvent.CONNECTED, () => {
      setWsConnected(true)
      invalidateStructural()
    })
    const offPresentSlide = client.on(RealtimeEvent.PRESENT_SLIDE_CHANGED, (data) => {
      // Viewers always sync; hosts only when a callback is opted in (e.g. Preview Mode).
      if (!isViewer && !onPresentSlideChangedRef.current) return
      onPresentSlideChangedRef.current?.(data)
    })

    client.connect()
    return () => {
      if (joinInvalidateTimerRef.current) {
        clearTimeout(joinInvalidateTimerRef.current)
        joinInvalidateTimerRef.current = null
      }
      setWsConnected(false)
      offResp()
      offSession()
      offQuestion()
      offAnswerReveal()
      offQuestionLb()
      offLeaderboard()
      offParticipantJoined()
      offSessionProgress()
      offConnected()
      offPresentSlide()
      client.disconnect()
    }
  }, [
    sessionQuery.data?.session_code,
    accessToken,
    sessionId,
    queryClient,
    isViewer,
    viewerSessionActive,
    mode,
  ])

  const isLoading = isViewer
    ? sessionQuery.isLoading
    : sessionQuery.isLoading || questionsQuery.isLoading || participantsQuery.isLoading
  const isError = !isLoading && !sessionQuery.data

  return {
    session: sessionQuery.data,
    mappedQuestions,
    responses,
    participants,
    leaderboard,
    isLoading,
    isError,
    refetchResponses: () => responsesQuery.refetch(),
    refetchParticipants: () => participantsQuery.refetch(),
  }
}
