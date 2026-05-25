import { Trophy } from 'lucide-react'

export function QuestionLeaderboardPanel({
  onShowLeaderboard,
  activeQuestion,
  questionNumber,
  canShowLeaderboard = false,
}) {
  const questionPreview = activeQuestion?.text
    ? activeQuestion.text.length > 80
      ? `${activeQuestion.text.slice(0, 80)}…`
      : activeQuestion.text
    : null

  return (
    <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-900">Question Leaderboard</p>
          <p className="mt-1 text-xs text-slate-600">
            {activeQuestion
              ? canShowLeaderboard
                ? questionNumber != null
                  ? `Rankings for the selected question (Q${questionNumber}).`
                  : 'Rankings for the currently selected question.'
                : 'Only quiz-mode questions have a leaderboard.'
              : 'Select a question to view its leaderboard.'}
          </p>
          {questionPreview && canShowLeaderboard ? (
            <p className="mt-2 line-clamp-2 text-xs font-medium text-navy-800">{questionPreview}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onShowLeaderboard}
          disabled={!canShowLeaderboard}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trophy className="size-4" />
          Show Question Leaderboard
        </button>
      </div>
    </div>
  )
}
