import { Eye, EyeOff, Lock, Play, RotateCcw, Square, Trophy } from 'lucide-react'
import { questionSupportsAnswerReveal } from '../../utils/answerReveal'
import { canHostCloseQuestion } from '../../utils/hostQuestionControls'
import { HostQuestionActionButton } from './HostQuestionActionButton'

/**
 * @param {{
 *   question: object | null,
 *   canEditLive: boolean,
 *   size?: 'default' | 'compact',
 *   showLabel?: boolean,
 *   questionLiveMutation: import('@tanstack/react-query').UseMutationResult,
 *   answerRevealMutation: import('@tanstack/react-query').UseMutationResult,
 *   questionLeaderboardMutation: import('@tanstack/react-query').UseMutationResult,
 *   reattemptMutation: import('@tanstack/react-query').UseMutationResult,
 *   closeQuestionMutation?: import('@tanstack/react-query').UseMutationResult,
 *   onOpenForReattempt: () => void,
 *   onCloseQuestion?: () => void,
 *   singleActiveQuestionMode?: boolean,
 * }} props
 */
export function HostQuestionControls({
  question,
  canEditLive,
  size = 'default',
  showLabel = true,
  questionLiveMutation,
  answerRevealMutation,
  questionLeaderboardMutation,
  reattemptMutation,
  closeQuestionMutation,
  onOpenForReattempt,
  onCloseQuestion,
  singleActiveQuestionMode = false,
}) {
  if (!question) return null

  const supportsReveal = questionSupportsAnswerReveal(question.type, question.isQuizMode)
  const showCloseQuestion = canHostCloseQuestion(question, singleActiveQuestionMode)
  const isActiveQuestion = Boolean(question.isLive)

  return (
    <div>
      {showLabel ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Host controls
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <HostQuestionActionButton
          disabled={!canEditLive || questionLiveMutation.isPending}
          onClick={() =>
            questionLiveMutation.mutate({
              questionId: question.id,
              isLive: !question.isLive,
              answerRevealed: question.answerRevealed,
              showLeaderboard: question.showLeaderboard,
              supportsReveal,
              isQuizMode: question.isQuizMode,
            })
          }
          icon={question.isLive ? Square : Play}
          label={question.isLive ? 'Deactivate' : 'Activate'}
          title={
            question.isLive
              ? 'Stop accepting new responses'
              : 'Let participants answer this question'
          }
          active={question.isLive}
          tone={question.isLive ? 'rose' : 'emerald'}
          size={size}
        />
        {supportsReveal ? (
          <HostQuestionActionButton
            disabled={!canEditLive || !isActiveQuestion || answerRevealMutation.isPending}
            onClick={() =>
              answerRevealMutation.mutate({
                questionId: question.id,
                revealed: !question.answerRevealed,
              })
            }
            icon={question.answerRevealed ? EyeOff : Eye}
            label={question.answerRevealed ? 'Hide answer' : 'Reveal answer'}
            title={
              !isActiveQuestion
                ? 'Activate this question before revealing the answer'
                : question.answerRevealed
                  ? 'Correct answer is visible to participants'
                  : 'Show the correct answer on participant screens'
            }
            active={question.answerRevealed}
            tone="violet"
            size={size}
          />
        ) : null}
        {canEditLive && question.isQuizMode ? (
          <HostQuestionActionButton
            disabled={!isActiveQuestion || questionLeaderboardMutation.isPending}
            onClick={() =>
              questionLeaderboardMutation.mutate({
                questionId: question.id,
                visible: !question.showLeaderboard,
              })
            }
            icon={Trophy}
            label="Leaderboard"
            title={
              !isActiveQuestion
                ? 'Activate this question before showing its leaderboard'
                : question.showLeaderboard
                  ? 'Hide ranking for this question'
                  : 'Show ranking for this question only'
            }
            active={question.showLeaderboard}
            tone="amber"
            size={size}
          />
        ) : null}
        {showCloseQuestion ? (
          <HostQuestionActionButton
            disabled={!canEditLive || closeQuestionMutation?.isPending}
            onClick={onCloseQuestion}
            icon={Lock}
            label={closeQuestionMutation?.isPending ? 'Closing…' : 'Close question'}
            title="Stop accepting new responses while keeping this question visible"
            tone="slate"
            size={size}
          />
        ) : null}
        <HostQuestionActionButton
          disabled={!canEditLive || reattemptMutation.isPending}
          onClick={onOpenForReattempt}
          icon={RotateCcw}
          label={reattemptMutation.isPending ? 'Opening…' : 'Reattempt'}
          title={
            !question.isLive
              ? 'Activates the question and opens another attempt'
              : 'Allow another attempt on this question'
          }
          tone="sky"
          size={size}
        />
      </div>
    </div>
  )
}
