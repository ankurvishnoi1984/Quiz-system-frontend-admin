import { getChoiceRevealClasses, isOptionCorrectForReveal } from '../../../../utils/answerReveal'
import { getTrueFalseChoices } from '../../utils/questionUtils'

export function TrueFalseOptions({
  question,
  currentResponse,
  inputsLocked,
  answerRevealMeta,
  canSeeAnswerReveal,
  onSelectOption,
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {getTrueFalseChoices(question).map((o) => {
        const label = o.option_text
        const isSelected =
          String(currentResponse.selectedOption || '').trim().toLowerCase() ===
          String(label).trim().toLowerCase()
        const isCorrect = isOptionCorrectForReveal(o, answerRevealMeta)
        return (
          <button
            disabled={inputsLocked}
            key={label}
            type="button"
            onClick={() => onSelectOption(label)}
            className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${getChoiceRevealClasses({
              isSelected,
              isCorrectOption: isCorrect,
              answerRevealed: canSeeAnswerReveal,
            })}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
