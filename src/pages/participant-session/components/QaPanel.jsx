import { CheckCircle2, Crown, Send, Trophy, XCircle } from 'lucide-react'

export function QaPanel({
  showOverallLeaderboard,
  hasAnyQuestionSaved,
  sessionStatus,
  leaderboard,
  onShowLeaderboard,
  askText,
  onAskTextChange,
  allowAnonymousQa,
  askAnonymous,
  onAskAnonymousChange,
  onAskQuestion,
  ownQuestions,
  approvedQa,
  upvotes,
  onUpvote,
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-blue-200/70 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-navy-900">Q&A</h2>
      {showOverallLeaderboard && (hasAnyQuestionSaved || sessionStatus === 'completed') && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-amber-900">
              <Trophy className="mr-2 inline size-4" />
              Leaderboard
            </p>
            {leaderboard.length > 0 && (
              <button
                type="button"
                onClick={onShowLeaderboard}
                className="text-xs font-semibold text-amber-700 hover:underline"
              >
                View all
              </button>
            )}
          </div>
          {leaderboard.length > 0 ? (
            <div className="mt-2 space-y-1">
              {leaderboard.slice(0, 3).map((entry, idx) => (
                <div key={entry.participant_id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    {idx === 0 ? <Crown className="size-4 text-amber-500" /> : `${idx + 1}.`}
                    {entry.name || entry.nickname || 'Anonymous'}
                  </span>
                  <span className="font-semibold text-amber-700">{entry.score}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-amber-700">
              Leaderboard will appear after participants submit responses.
            </p>
          )}
        </div>
      )}
      <div className="space-y-2">
        <textarea
          value={askText}
          onChange={(e) => onAskTextChange(e.target.value)}
          className="h-24 w-full resize-none rounded-2xl border border-blue-200/70 bg-white p-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
          placeholder="Ask a question..."
        />
        <div className="flex flex-wrap items-center gap-2">
          {allowAnonymousQa && (
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={askAnonymous}
                onChange={(e) => onAskAnonymousChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
              />
              Ask anonymously
            </label>
          )}
          <button
            type="button"
            onClick={onAskQuestion}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 transition hover:brightness-110"
          >
            <Send className="size-4" />
            Submit
          </button>
        </div>
      </div>

      {!!ownQuestions.length && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-navy-900">Your questions</p>
          {ownQuestions.map((q) => (
            <div key={q.id} className="rounded-2xl border border-blue-200 bg-navy-900/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{q.text}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-navy-700">
                  {q.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold text-navy-900">Approved questions</p>
        {approvedQa.map((q) => (
          <div key={q.qa_question_id} className="rounded-2xl border border-blue-200/70 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-navy-900">{q.question_text}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {q.answer_status === 'answered' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="size-3" /> Answered
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <XCircle className="size-3" /> Pending
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpvote(q.qa_question_id)}
                className="rounded-xl border border-blue-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
              >
                Upvote {(upvotes[q.qa_question_id] || 0) + (q.upvote_count || 0)}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
