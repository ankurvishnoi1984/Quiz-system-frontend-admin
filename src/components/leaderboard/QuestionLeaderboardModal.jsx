import { LeaderboardModalShell } from './LeaderboardModalShell'
import { LeaderboardTable } from './LeaderboardTable'

/**
 * Leaderboard for a single selected live question.
 */
export function QuestionLeaderboardModal({
  open,
  onClose,
  questionLabel,
  questionText,
  entries,
  limit,
  onLimitChange,
  isQuizQuestion = true,
}) {
  return (
    <LeaderboardModalShell
      open={open}
      onClose={onClose}
      eyebrow="Question leaderboard"
      title={`Top ${limit}`}
      limit={limit}
      onLimitChange={onLimitChange}
      limitSelectId="question-leaderboard-limit"
    >
      {!isQuizQuestion ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Leaderboard is only available for quiz-mode questions. Select a quiz question to view
          rankings.
        </p>
      ) : (
        <>
          {questionText ? (
            <div className="mb-4 rounded-2xl border border-blue-200/60 bg-blue-50/30 p-4">
              {questionLabel ? (
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">
                  {questionLabel}
                </p>
              ) : null}
              <p className="mt-1 text-sm font-semibold text-navy-900">{questionText}</p>
            </div>
          ) : null}
          <LeaderboardTable
            entries={entries}
            emptyMessage="Rankings will appear once participants submit answers for this question."
          />
        </>
      )}
    </LeaderboardModalShell>
  )
}
