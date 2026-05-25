import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  openQuestionForReattemptApi,
  setQuestionAnswerRevealedApi,
  setQuestionLeaderboardVisibleApi,
  setQuestionLiveStateApi,
} from '../services/liveApi'

export function useHostQuestionMutations(
  accessToken,
  sessionId,
  { onReattemptSuccess, onReattemptError, onMutationError } = {},
) {
  const queryClient = useQueryClient()

  const invalidateQuestions = () => {
    queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['live-question-results'] })
  }

  const questionLiveMutation = useMutation({
    mutationFn: ({ questionId, isLive }) => setQuestionLiveStateApi(accessToken, questionId, isLive),
    onSuccess: invalidateQuestions,
    onError: (error) =>
      onMutationError?.(error.message || 'Unable to update question live state'),
  })

  const questionLeaderboardMutation = useMutation({
    mutationFn: ({ questionId, visible }) =>
      setQuestionLeaderboardVisibleApi(accessToken, questionId, visible),
    onSuccess: invalidateQuestions,
    onError: (error) =>
      onMutationError?.(error.message || 'Unable to update question leaderboard'),
  })

  const answerRevealMutation = useMutation({
    mutationFn: ({ questionId, revealed }) =>
      setQuestionAnswerRevealedApi(accessToken, questionId, revealed),
    onSuccess: invalidateQuestions,
    onError: (error) =>
      onMutationError?.(error.message || 'Unable to update answer visibility'),
  })

  const reattemptMutation = useMutation({
    mutationFn: ({ questionId }) => openQuestionForReattemptApi(accessToken, questionId),
    onSuccess: (_data, { questionText }) => {
      invalidateQuestions()
      onReattemptSuccess?.(questionText)
    },
    onError: (error) => {
      onReattemptError?.(error)
    },
  })

  const openForReattempt = (question) => {
    if (!question?.id) return
    reattemptMutation.mutate({
      questionId: question.id,
      questionText: question.text,
    })
  }

  return {
    questionLiveMutation,
    questionLeaderboardMutation,
    answerRevealMutation,
    reattemptMutation,
    openForReattempt,
  }
}
