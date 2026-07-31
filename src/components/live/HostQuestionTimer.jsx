import { QuestionTimer } from '../../pages/participant-session/components/question/QuestionTimer'
import { useHostQuestionCountdown } from '../../hooks/useHostQuestionCountdown'

/**
 * Host-facing question timer for single-active timed questions.
 * Reuses the participant QuestionTimer UI and the same activation deadline.
 */
export function HostQuestionTimer({
  question,
  singleActiveQuestionMode = false,
  variant = 'default',
  className = '',
}) {
  const { visible, remainingSeconds, timeLimit } = useHostQuestionCountdown(question, {
    singleActiveQuestionMode,
  })

  if (!visible) return null

  return (
    <QuestionTimer
      timer={remainingSeconds}
      timeLimit={timeLimit}
      variant={variant}
      className={className}
    />
  )
}
