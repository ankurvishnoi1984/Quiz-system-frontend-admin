import { getChoiceRevealClasses, isOptionCorrectForReveal } from '../../../../utils/answerReveal'

export function McqOptions({
  options,
  currentResponse,
  inputsLocked,
  answerRevealMeta,
  canSeeAnswerReveal,
  onSelectOption,
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {(options || []).map((o, idx) => {
        const isSelected = currentResponse.selectedOption === o.option_text
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
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">
              {String.fromCharCode(65 + idx)}
            </span>
            {o.option_text}
          </button>
        )
      })}
    </div>
  )
}
