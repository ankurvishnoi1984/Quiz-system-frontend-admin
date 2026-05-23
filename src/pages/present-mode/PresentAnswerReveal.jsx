import { Check } from 'lucide-react'
import { questionSupportsAnswerReveal } from '../../utils/answerReveal'
import { getCorrectOptionsForQuestion, getPresentOptionColor } from '../../utils/livePresentation'

export const CORRECT_STROKE = '#047857'

export function PresentAnswerRevealBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[clamp(0.7rem,1.2vw,0.8rem)] font-semibold text-emerald-800">
      <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </span>
      Key shown
    </span>
  )
}

/** All options in a scannable list — correct ones get a green tick badge. */
export function PresentOptionsKey({ question, chartData = [] }) {
  if (!question?.answerRevealed) return null

  const correctIds = new Set((question.correctOptionIds || []).map(Number))
  const options =
    question.options?.length > 0
      ? question.options
      : chartData.map((row, idx) => ({ option_id: idx, option_text: row.name }))
  if (!options.length) return null

  return (
    <div className="mt-4 border-t border-slate-200/80 pt-4">
      <p className="mb-3 text-center text-[clamp(0.7rem,1.2vw,0.8rem)] font-semibold uppercase tracking-wider text-slate-500">
        Answer key
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt, idx) => {
          const isCorrect = correctIds.has(Number(opt.option_id))
          const chartRow = chartData.find(
            (d) => String(d.name).trim() === String(opt.option_text).trim(),
          )
          const count = chartRow?.value ?? 0
          const optionColor =
            chartRow?.color ?? getPresentOptionColor(opt.option_text, idx, question.rawType)

          return (
            <div
              key={opt.option_id ?? idx}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                isCorrect
                  ? 'border-emerald-400/90 bg-emerald-50/90'
                  : 'border-slate-200/90 bg-white/80'
              }`}
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: isCorrect ? '#059669' : optionColor }}
                aria-hidden
              >
                {isCorrect ? (
                  <Check className="size-5" strokeWidth={3} />
                ) : (
                  String.fromCharCode(65 + idx)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-[clamp(0.95rem,1.6vw,1.15rem)] font-semibold ${
                    isCorrect ? 'text-emerald-900' : 'text-slate-700'
                  }`}
                >
                  {opt.option_text}
                </p>
                {count > 0 ? (
                  <p className="text-[clamp(0.75rem,1.2vw,0.85rem)] text-slate-500">
                    {count} response{count === 1 ? '' : 's'}
                  </p>
                ) : null}
              </div>
              {isCorrect ? (
                <span className="shrink-0 text-[clamp(0.65rem,1vw,0.75rem)] font-bold uppercase tracking-wide text-emerald-600">
                  Correct
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function getPresentBarFill(entry) {
  return entry.color ?? getPresentOptionColor(entry.name, entry.optionIndex ?? 0)
}

export function shouldShowAnswerRevealUi(question) {
  return (
    Boolean(question?.answerRevealed) &&
    questionSupportsAnswerReveal(question.type, question.isQuizMode) &&
    getCorrectOptionsForQuestion(question).length > 0
  )
}

/** Green tick badge above the correct bar(s). */
export function PresentCorrectBarLabel(props) {
  const { x, y, width, index, data, answerRevealed } = props
  const entry = data?.[index]
  if (!answerRevealed || !entry?.isCorrect || width == null) return null

  const cx = Number(x) + Number(width) / 2
  const cy = Number(y) - 14
  const r = 11

  return (
    <g aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="#059669" stroke="#fff" strokeWidth={2} />
      <path
        d={`M ${cx - 4} ${cy} L ${cx - 1} ${cy + 4} L ${cx + 5} ${cy - 4}`}
        fill="none"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

/** Option label only on axis — correct mark stays on the bar top to avoid overlap. */
export function PresentXAxisTick({ x, y, payload, chartData }) {
  const entry = chartData?.find((d) => d.name === payload?.value)
  const fill = entry?.color ?? '#475569'
  const label = String(payload?.value ?? '')
  const maxLen = 14
  const display =
    label.length > maxLen ? `${label.slice(0, maxLen - 1)}…` : label

  return (
    <text
      x={x}
      y={y}
      dy={20}
      textAnchor="middle"
      fill={fill}
      fontSize={15}
      fontWeight={entry?.isCorrect ? 700 : 600}
    >
      {display}
      {entry?.isCorrect ? ' ✓' : ''}
    </text>
  )
}
