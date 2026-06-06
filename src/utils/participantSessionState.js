export const PARTICIPANT_PROGRESS_FIELDS = [
  'quizResponses',
  'quizQuestionIndex',
  'quizLiveQuestionId',
  'quizSubmitted',
  'quizSubmittedQuestionIds',
  'quizExplicitSubmittedQuestionIds',
  'quizCountdownByQuestion',
  'quizQuestionOpenedAt',
]

export function pickParticipantProgressState(state = {}) {
  return {
    quizResponses: state.quizResponses || {},
    quizQuestionIndex: Number.isFinite(Number(state.quizQuestionIndex))
      ? Number(state.quizQuestionIndex)
      : 0,
    quizLiveQuestionId:
      state.quizLiveQuestionId != null && state.quizLiveQuestionId !== ''
        ? Number(state.quizLiveQuestionId)
        : null,
    quizSubmitted: Boolean(state.quizSubmitted),
    quizSubmittedQuestionIds: state.quizSubmittedQuestionIds || {},
    quizExplicitSubmittedQuestionIds: state.quizExplicitSubmittedQuestionIds || {},
    quizCountdownByQuestion: state.quizCountdownByQuestion || {},
    quizQuestionOpenedAt: state.quizQuestionOpenedAt || {},
  }
}

export function hasParticipantProgressChanged(current = {}, previous = {}) {
  return PARTICIPANT_PROGRESS_FIELDS.some((field) => current[field] !== previous[field])
}
