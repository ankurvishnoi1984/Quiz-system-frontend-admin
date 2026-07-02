import { useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSessionDetailApi,
  getSessionResponsesApi,
  listSessionParticipantsApi,
  listSessionQuestionsApi,
} from '../services/liveApi'
import {
  getPresentViewResponsesApi,
  getPresentViewSessionApi,
  listPresentViewParticipantsApi,
  listPresentViewQuestionsApi,
} from '../services/presentViewApi'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'
import {
  buildLeaderboard,
  buildParticipantList,
  mapLiveQuestions,
  mapSessionParticipants,
  mergeParticipantLists,
} from '../utils/livePresentation'
import { SESSION_LEADERBOARD_TOP_N } from '../utils/leaderboard'

export function useLiveSession(accessToken, sessionId, options = {}) {
  const mode = options.mode || 'host'
  const isViewer = mode === 'viewer'
  const queryClient = useQueryClient()
  const onPresentSlideChangedRef = useRef(options.onPresentSlideChanged)

  useEffect(() => {
    onPresentSlideChangedRef.current = options.onPresentSlideChanged
  }, [options.onPresentSlideChanged])

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
    refetchInterval: 4000,
  })

  const responsesQuery = useQuery({
    queryKey: ['live-responses', sessionId, mode],
    queryFn: () =>
      isViewer
        ? getPresentViewResponsesApi(accessToken, sessionId)
        : getSessionResponsesApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId && sessionReady && viewerSessionActive),
    refetchInterval: 5000,
  })

  const participantsQuery = useQuery({
    queryKey: ['live-participants', sessionId, mode],
    queryFn: () =>
      isViewer
        ? listPresentViewParticipantsApi(accessToken, sessionId)
        : listSessionParticipantsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId && sessionReady && viewerSessionActive),
    refetchInterval: 5000,
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
  const leaderboard = useMemo(
    () => buildLeaderboard(responses, SESSION_LEADERBOARD_TOP_N),
    [responses],
  )

  useEffect(() => {
    const sessionCode = sessionQuery.data?.session_code
    if (!sessionCode || !accessToken || !sessionId || !viewerSessionActive) return

    const client = createRealtimeClient(
      '',
      { session: sessionCode, token: accessToken, role: isViewer ? 'viewer' : 'host' },
      isViewer ? 'viewer' : 'host',
    )

    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-responses', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-participants', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['live-question-results'] })
    }

    const offResp = client.on('response_received', invalidateAll)
    const offSession = client.on('session_updated', invalidateAll)
    const offQuestion = client.on('question_changed', invalidateAll)
    const offAnswerReveal = client.on(RealtimeEvent.ANSWER_REVEALED, invalidateAll)
    const offQuestionLb = client.on(RealtimeEvent.QUESTION_LEADERBOARD_VISIBILITY, invalidateAll)
    const offParticipantJoined = client.on(RealtimeEvent.PARTICIPANT_JOINED, invalidateAll)
    const offSessionProgress = client.on('session_progress', invalidateAll)
    const offConnected = client.on(RealtimeEvent.CONNECTED, invalidateAll)
    const offPresentSlide = client.on(RealtimeEvent.PRESENT_SLIDE_CHANGED, (data) => {
      if (!isViewer) return
      onPresentSlideChangedRef.current?.(data)
    })

    client.connect()
    return () => {
      offResp()
      offSession()
      offQuestion()
      offAnswerReveal()
      offQuestionLb()
      offParticipantJoined()
      offSessionProgress()
      offConnected()
      offPresentSlide()
      client.disconnect()
    }
  }, [sessionQuery.data?.session_code, accessToken, sessionId, queryClient, isViewer, viewerSessionActive])

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
