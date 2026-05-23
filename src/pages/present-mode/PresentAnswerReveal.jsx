import { CheckCircle2, Sparkles } from 'lucide-react'
import { questionSupportsAnswerReveal } from '../../utils/answerReveal'
import { getChartColor } from '../../utils/chartColors'
import { getCorrectOptionsForQuestion } from '../../utils/livePresentation'

const CORRECT_BAR_FILL = '#059669'
const MUTED_BAR_FILL = '#cbd5e1'

export function PresentAnswerRevealBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-linear-to-r from-emerald-50 to-teal-50 px-4 py-2 shadow-sm shadow-emerald-900/10">
      <span className="grid size-8 place-items-center rounded-full bg-emerald-500 text-white">
        <Sparkles className="size-4" strokeWidth={2.25} aria-hidden />
      </span>
      <span className="text-[clamp(0.8rem,1.4vw,0.95rem)] font-bold uppercase tracking-wider text-emerald-800">
        Answer revealed
      </span>
    </div>
  )
}

export function PresentCorrectOptionStrip({ question }) {
  const correctOptions = getCorrectOptionsForQuestion(question)
  if (!question?.answerRevealed || !correctOptions.length) return null

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-[clamp(0.5rem,1.5vw,1rem)]">
      {correctOptions.map((option, idx) => (
        <div
          key={option.option_id ?? idx}
          className="relative flex max-w-full items-center gap-3 rounded-2xl border-2 border-emerald-400 bg-linear-to-br from-emerald-50 via-white to-emerald-50/80 px-[clamp(1rem,2.5vw,1.75rem)] py-[clamp(0.75rem,1.5vh,1.25rem)] shadow-lg shadow-emerald-900/15 ring-4 ring-emerald-100"
        >
          <span className="grid size-[clamp(2.25rem,5vw,3rem)] shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-md">
            <CheckCircle2 className="size-[clamp(1.1rem,2.5vw,1.5rem)]" strokeWidth={2.5} />
          </span>
          <p className="text-[clamp(1.15rem,2.8vw,2rem)] font-bold leading-snug text-emerald-950">
            {option.option_text}
          </p>
        </div>
      ))}
    </div>
  )
}

export function getPresentBarFill(entry, rawType, answerRevealed) {
  if (!answerRevealed) {
    return getChartColor(entry.name, entry.optionIndex ?? 0, rawType)
  }
  if (entry.isCorrect) {
    return CORRECT_BAR_FILL
  }
  return MUTED_BAR_FILL
}

export function shouldShowAnswerRevealUi(question) {
  return (
    Boolean(question?.answerRevealed) &&
    questionSupportsAnswerReveal(question.type, question.isQuizMode) &&
    getCorrectOptionsForQuestion(question).length > 0
  )
}
