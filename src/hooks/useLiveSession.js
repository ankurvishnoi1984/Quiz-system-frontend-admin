import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSessionDetailApi,
  getSessionResponsesApi,
  listSessionParticipantsApi,
  listSessionQuestionsApi,
} from '../services/liveApi'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'
import {
  buildLeaderboard,
  buildParticipantList,
  mapLiveQuestions,
  mapSessionParticipants,
  mergeParticipantLists,
} from '../utils/livePresentation'

export function useLiveSession(accessToken, sessionId) {
  const queryClient = useQueryClient()

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
    refetchInterval: 4000,
  })

  const responsesQuery = useQuery({
    queryKey: ['live-responses', sessionId],
    queryFn: () => getSessionResponsesApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
    refetchInterval: 5000,
  })

  const participantsQuery = useQuery({
    queryKey: ['live-participants', sessionId],
    queryFn: () => listSessionParticipantsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
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
  const leaderboard = useMemo(() => buildLeaderboard(responses, 20), [responses])

  useEffect(() => {
    const sessionCode = sessionQuery.data?.session_code
    if (!sessionCode || !accessToken || !sessionId) return

    const client = createRealtimeClient(
      '',
      { session: sessionCode, token: accessToken, role: 'host' },
      'host',
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
      client.disconnect()
    }
  }, [sessionQuery.data?.session_code, accessToken, sessionId, queryClient])

  const isLoading =
    sessionQuery.isLoading || questionsQuery.isLoading || participantsQuery.isLoading
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
