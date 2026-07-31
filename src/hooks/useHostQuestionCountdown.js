import { useEffect, useState } from 'react'
import { getQuestionDeadlineMs } from '../utils/questionTimer'

/**
 * Host countdown for single-active timed questions.
 * Uses the same host activation clock participants see
 * (live_activated_at + time_limit_seconds).
 */
export function shouldShowHostQuestionTimer(question, { singleActiveQuestionMode } = {}) {
  if (!singleActiveQuestionMode || !question) return false
  if (!question.isLive || question.isSurvey) return false
  if (Number(question.timeLimit) <= 0) return false
  // Wait for activation timestamp so host matches the participant shared clock.
  return getQuestionDeadlineMs(question) != null
}

export function useHostQuestionCountdown(question, { singleActiveQuestionMode = false } = {}) {
  const visible = shouldShowHostQuestionTimer(question, { singleActiveQuestionMode })
  const timeLimit = Number(question?.timeLimit) || 0
  const deadlineMs = visible ? getQuestionDeadlineMs(question) : null
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!visible || deadlineMs == null) return undefined
    setNowMs(Date.now())
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [visible, deadlineMs, question?.id, question?.liveActivatedAt])

  const remainingSeconds =
    visible && deadlineMs != null
      ? Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000))
      : 0

  return {
    visible,
    timeLimit,
    remainingSeconds,
    deadlineMs,
  }
}
