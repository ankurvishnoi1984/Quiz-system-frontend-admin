import { Eye, EyeOff, Play, RotateCcw, Square, Trophy } from 'lucide-react'
import { questionSupportsAnswerReveal } from '../../utils/answerReveal'
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
 *   onOpenForReattempt: () => void,
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
  onOpenForReattempt,
}) {
  if (!question) return null

  const supportsReveal = questionSupportsAnswerReveal(question.type, question.isQuizMode)

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
            disabled={!canEditLive || answerRevealMutation.isPending}
            onClick={() =>
              answerRevealMutation.mutate({
                questionId: question.id,
                revealed: !question.answerRevealed,
              })
            }
            icon={question.answerRevealed ? EyeOff : Eye}
            label={question.answerRevealed ? 'Hide answer' : 'Reveal answer'}
            title={
              question.answerRevealed
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
            disabled={questionLeaderboardMutation.isPending}
            onClick={() =>
              questionLeaderboardMutation.mutate({
                questionId: question.id,
                visible: !question.showLeaderboard,
              })
            }
            icon={Trophy}
            label="Leaderboard"
            title={
              question.showLeaderboard
                ? 'Hide ranking for this question'
                : 'Show ranking for this question only'
            }
            active={question.showLeaderboard}
            tone="amber"
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
