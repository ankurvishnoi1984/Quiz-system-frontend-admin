import { Crown, Trophy } from 'lucide-react'

export function QuestionLeaderboard({ entries }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">
        <Trophy className="mr-2 inline size-4" />
        Question rankings
      </p>
      {entries.length > 0 ? (
        <div className="mt-2 space-y-1">
          {entries.slice(0, 5).map((entry, idx) => (
            <div key={entry.participant_id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-700">
                <span>{idx + 1}.</span>
                <span>{entry.name || entry.nickname || 'Anonymous'}</span>
                {idx === 0 ? <Crown className="size-4 shrink-0 text-amber-500" aria-hidden /> : null}
              </span>
              <span className="font-semibold text-amber-700">{entry.score}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-amber-700">
          Rankings will appear as participants answer this question.
        </p>
      )}
    </div>
  )
}
