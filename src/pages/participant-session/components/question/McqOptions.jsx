import { Check } from 'lucide-react'
import { getChoiceRevealClasses, isOptionCorrectForReveal } from '../../../../utils/answerReveal'

export function McqOptions({
  options,
  currentResponse,
  inputsLocked,
  answerRevealMeta,
  canSeeAnswerReveal,
  allowMultipleSelect = false,
  onSelectOption,
}) {
  const selectedList = Array.isArray(currentResponse.selectedOptions)
    ? currentResponse.selectedOptions
    : currentResponse.selectedOption
      ? [currentResponse.selectedOption]
      : []

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {(options || []).map((o, idx) => {
        const isSelected = allowMultipleSelect
          ? selectedList.includes(o.option_text)
          : currentResponse.selectedOption === o.option_text
        const isCorrect = isOptionCorrectForReveal(o, answerRevealMeta)
        return (
          <button
            key={o.option_id}
            disabled={inputsLocked}
            type="button"
            onClick={() => onSelectOption(o.option_text)}
            className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${getChoiceRevealClasses({
              isSelected,
              isCorrectOption: isCorrect,
              answerRevealed: canSeeAnswerReveal,
            })}`}
          >
            <span className="flex items-start gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs">
                {allowMultipleSelect && isSelected ? (
                  <Check className="size-3.5 text-navy-800" aria-hidden />
                ) : (
                  String.fromCharCode(65 + idx)
                )}
              </span>
              <span className="min-w-0 flex-1">{o.option_text}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
