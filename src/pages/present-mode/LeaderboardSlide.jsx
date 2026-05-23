import { Crown, Trophy } from 'lucide-react'
import { PresentSlideHeader } from './PresentShell'

export function LeaderboardSlide({ sessionTitle, leaderboard, slideIndex, slideTotal }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PresentSlideHeader
        sessionTitle={sessionTitle}
        label="Leaderboard"
        index={slideIndex}
        total={slideTotal}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <div className="mb-[clamp(1.5rem,4vh,2.5rem)] flex items-center gap-3">
          <Trophy className="size-[clamp(2rem,5vw,3rem)] text-amber-500" />
          <h2 className="text-[clamp(2rem,6vw,4rem)] font-bold text-navy-900">Top scores</h2>
        </div>

        {leaderboard.length > 0 ? (
          <div className="w-full max-w-4xl space-y-[clamp(0.5rem,1.5vh,1rem)]">
            {leaderboard.map((row, idx) => {
              const isFirst = idx === 0
              return (
                <div
                  key={row.participant_id}
                  className={`flex items-center justify-between gap-4 rounded-2xl border px-[clamp(1rem,3vw,2rem)] py-[clamp(0.75rem,2vh,1.25rem)] shadow-md ${
                    isFirst
                      ? 'border-amber-300/80 bg-linear-to-r from-amber-50 to-amber-100/80 shadow-amber-900/10'
                      : 'border-blue-200/70 bg-white/95 shadow-navy-900/5'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-[clamp(0.75rem,2vw,1.5rem)]">
                    <span
                      className={`grid shrink-0 place-items-center rounded-2xl font-bold text-white ${
                        isFirst
                          ? 'size-[clamp(3rem,7vw,4.5rem)] bg-linear-to-br from-amber-400 to-amber-600 text-[clamp(1.25rem,3vw,1.75rem)]'
                          : 'size-[clamp(2.5rem,6vw,3.5rem)] bg-linear-to-br from-navy-700 to-navy-500 text-[clamp(1rem,2.5vw,1.35rem)]'
                      }`}
                    >
                      {isFirst ? <Crown className="size-[clamp(1.25rem,3vw,1.75rem)]" /> : idx + 1}
                    </span>
                    <p
                      className={`truncate font-semibold text-navy-900 ${
                        isFirst ? 'text-[clamp(1.5rem,4vw,2.5rem)]' : 'text-[clamp(1.15rem,3vw,1.75rem)]'
                      }`}
                    >
                      {row.name}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 font-bold tabular-nums text-navy-800 ${
                      isFirst ? 'text-[clamp(1.75rem,5vw,3rem)]' : 'text-[clamp(1.25rem,3.5vw,2rem)]'
                    }`}
                  >
                    {row.score}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-center text-[clamp(1.1rem,2.5vw,1.75rem)] text-slate-500">
            Scores will appear once participants submit answers.
          </p>
        )}
      </div>
    </div>
  )
}
