/** Untimed single-active-question sessions: host may close submissions while question stays live. */
export function canHostCloseQuestion(question, singleActiveQuestionMode) {
  if (!singleActiveQuestionMode || !question?.isLive) return false
  if (Number(question?.timeLimit ?? 0) > 0) return false
  return !question.submissionsClosed
}
