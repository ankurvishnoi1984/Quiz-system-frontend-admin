import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { formatQuizSubmitTimeCompact } from '../../utils/quizResponseTime'

export function PresentResponsesList({
  rows,
  showRevealUi = false,
  correctLabels = new Set(),
  emptyLabel = 'Waiting for responses…',
}) {
  if (!rows.length) {
    return (
      <p className="flex h-full items-center justify-center text-center text-[clamp(1.1rem,2.5vw,1.75rem)] text-slate-500">
        {emptyLabel}
      </p>
    )
  }

  return (
    <ul className="present-lb-list grid min-h-0 flex-1 auto-rows-min gap-3 overflow-y-auto pr-1">
      {rows.map((row, idx) => {
        const responseKey = String(row.response).trim().toLowerCase()
        const isCorrect = showRevealUi && correctLabels.has(responseKey)
        const isWrong = showRevealUi && !isCorrect && responseKey !== '—'

        return (
          <li
            key={row.id}
            className={`present-lb-row rounded-2xl border px-[clamp(0.85rem,2.5vw,1.35rem)] py-[clamp(0.75rem,2vh,1rem)] shadow-sm transition hover:shadow-md ${
              isCorrect
                ? 'border-emerald-300/80 bg-emerald-50/90'
                : isWrong
                  ? 'border-slate-200/80 bg-white/95'
                  : 'border-blue-200/70 bg-white/95'
            }`}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-navy-100 text-sm font-bold tabular-nums text-navy-700">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[clamp(0.95rem,1.8vw,1.1rem)] font-semibold text-navy-700">
                    {row.participant}
                  </p>
                  <p
                    className={`mt-1 text-[clamp(1.1rem,2.8vw,1.65rem)] font-bold leading-snug ${
                      isCorrect ? 'text-emerald-900' : 'text-navy-900'
                    }`}
                  >
                    {row.response}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {showRevealUi ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      isCorrect
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="size-3.5" aria-hidden />
                        Other
                      </>
                    )}
                  </span>
                ) : null}
                {row.responseTimeMs != null ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[clamp(0.8rem,1.4vw,0.95rem)] font-semibold tabular-nums text-slate-500">
                    <Clock3 className="size-3.5 shrink-0" aria-hidden />
                    {formatQuizSubmitTimeCompact(row.responseTimeMs)}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
