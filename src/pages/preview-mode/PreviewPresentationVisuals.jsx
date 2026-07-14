import { useEffect, useRef, useState } from 'react'
import { getPresentOptionColor } from '../../utils/livePresentation'
import { PreviewWordCloud } from './PreviewWordCloud'

export { PreviewWordCloud }

export function PreviewRankingBars({ rankings = [] }) {
  if (!rankings.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[clamp(1.25rem,3vw,2rem)] font-semibold text-slate-500">
          Waiting for rankings…
        </p>
      </div>
    )
  }

  const maxScore = Math.max(...rankings.map((r) => Number(r.totalScore) || 0), 1)

  return (
    <div className="flex h-full flex-col justify-center gap-[clamp(0.75rem,2.5vh,1.5rem)] px-[clamp(1rem,4vw,3rem)]">
      {rankings.map((row, idx) => {
        const score = Number(row.totalScore) || 0
        const pct = Math.max(8, Math.round((score / maxScore) * 100))
        return (
          <div key={row.optionId} className="preview-rank-row" style={{ animationDelay: `${idx * 90}ms` }}>
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <p className="text-[clamp(1.15rem,2.8vw,2rem)] font-bold text-navy-900">
                <span className="mr-3 tabular-nums text-slate-400">#{row.rank}</span>
                {row.optionText}
              </p>
              <p className="text-[clamp(1rem,2vw,1.5rem)] font-semibold tabular-nums text-slate-600">
                {score}
              </p>
            </div>
            <div className="h-[clamp(1.25rem,3vh,2rem)] overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="preview-rank-fill h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: getPresentOptionColor(row.optionText, idx, 'ranking'),
                  animationDelay: `${idx * 90 + 80}ms`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Open-text / free answers: big answer chips that animate in for speaker commentary.
 */
export function PreviewAnswerStream({ answers = [], emptyLabel = 'Waiting for answers…' }) {
  const seenRef = useRef(new Set())
  const [flashIds, setFlashIds] = useState(() => new Set())

  useEffect(() => {
    const nextFlash = new Set()
    answers.forEach((row) => {
      const id = String(row.id)
      if (!seenRef.current.has(id)) {
        nextFlash.add(id)
        seenRef.current.add(id)
      }
    })
    if (nextFlash.size) {
      setFlashIds(nextFlash)
      const timer = window.setTimeout(() => setFlashIds(new Set()), 1400)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [answers])

  if (!answers.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-center text-[clamp(1.25rem,3vw,2rem)] font-semibold text-slate-500">
          {emptyLabel}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-wrap content-center items-center justify-center gap-[clamp(0.75rem,2vw,1.25rem)] overflow-hidden p-2">
      {answers.map((row, idx) => {
        const id = String(row.id)
        const isNew = flashIds.has(id)
        return (
          <div
            key={id}
            className={`preview-answer-chip max-w-[min(100%,28rem)] rounded-[1.5rem] border border-white/70 bg-white/90 px-[clamp(1rem,2.5vw,1.75rem)] py-[clamp(0.75rem,2vh,1.15rem)] shadow-lg shadow-navy-900/10 ${
              isNew ? 'preview-answer-chip--new' : ''
            }`}
            style={{ animationDelay: `${Math.min(idx, 8) * 70}ms` }}
          >
            <p className="text-center text-[clamp(1.15rem,2.8vw,1.85rem)] font-bold leading-snug text-navy-900">
              {row.response}
            </p>
          </div>
        )
      })}
    </div>
  )
}
