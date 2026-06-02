import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  activateAllQuestionsApi,
  closeAllQuestionSubmissionsApi,
  closeQuestionSubmissionsApi,
  openQuestionForReattemptApi,
  setQuestionAnswerRevealedApi,
  setQuestionLeaderboardVisibleApi,
  setQuestionLiveStateApi,
} from '../services/liveApi'

export function useHostQuestionMutations(
  accessToken,
  sessionId,
  {
    onReattemptSuccess,
    onReattemptError,
    onCloseQuestionSuccess,
    onCloseQuestionError,
    onCloseAllQuestionsSuccess,
    onCloseAllQuestionsError,
    onActivateAllQuestionsSuccess,
    onActivateAllQuestionsError,
    onMutationError,
  } = {},
) {
  const queryClient = useQueryClient()

  const invalidateQuestions = () => {
    queryClient.invalidateQueries({ queryKey: ['live-questions', sessionId] })
    queryClient.invalidateQueries({ queryKey: ['live-question-results'] })
  }

  const questionLiveMutation = useMutation({
    mutationFn: async ({
      questionId,
      isLive,
      answerRevealed = false,
      showLeaderboard = false,
      supportsReveal = false,
      isQuizMode = false,
    }) => {
      const updated = await setQuestionLiveStateApi(accessToken, questionId, isLive)
      if (isLive) return updated

      const resetCalls = []
      if (supportsReveal && answerRevealed) {
        resetCalls.push(setQuestionAnswerRevealedApi(accessToken, questionId, false))
      }
      if (isQuizMode && showLeaderboard) {
        resetCalls.push(setQuestionLeaderboardVisibleApi(accessToken, questionId, false))
      }
      if (resetCalls.length) {
        await Promise.all(resetCalls)
      }
      return updated
    },
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

  const closeQuestionMutation = useMutation({
    mutationFn: ({ questionId }) => closeQuestionSubmissionsApi(accessToken, questionId),
    onSuccess: (_data, { questionText }) => {
      invalidateQuestions()
      onCloseQuestionSuccess?.(questionText)
    },
    onError: (error) => {
      onCloseQuestionError?.(error)
    },
  })

  const closeAllQuestionsMutation = useMutation({
    mutationFn: () => closeAllQuestionSubmissionsApi(accessToken, sessionId),
    onSuccess: (data) => {
      invalidateQuestions()
      onCloseAllQuestionsSuccess?.(data?.closed_count ?? 0)
    },
    onError: (error) => {
      onCloseAllQuestionsError?.(error)
    },
  })

  const activateAllQuestionsMutation = useMutation({
    mutationFn: () => activateAllQuestionsApi(accessToken, sessionId),
    onSuccess: (data) => {
      invalidateQuestions()
      onActivateAllQuestionsSuccess?.(data?.activated_count ?? 0)
    },
    onError: (error) => {
      onActivateAllQuestionsError?.(error)
    },
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

  const closeQuestion = (question) => {
    if (!question?.id) return
    closeQuestionMutation.mutate({
      questionId: question.id,
      questionText: question.text,
    })
  }

  const closeAllQuestions = () => {
    closeAllQuestionsMutation.mutate()
  }

  const activateAllQuestions = () => {
    activateAllQuestionsMutation.mutate()
  }

  return {
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
  }
}
