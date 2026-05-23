export function questionSupportsAnswerReveal(questionType, isQuizMode) {
  const apiType =
    questionType === 'MCQ'
      ? 'mcq'
      : questionType === 'True/False'
        ? 'true_false'
        : questionType
  return Boolean(isQuizMode) && (apiType === 'mcq' || apiType === 'true_false')
}

/** MCQ / True-False option styling after the host reveals the answer key. */
export function getChoiceRevealClasses({
  isSelected,
  isCorrectOption,
  answerRevealed,
  selectedClass = 'border-blue-400 bg-blue-50 text-blue-900',
  defaultClass = 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50',
}) {
  if (!answerRevealed) {
    return isSelected ? selectedClass : defaultClass
  }
  if (isCorrectOption) {
    return 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
  }
  if (isSelected) {
    return 'border-red-500 bg-red-50 text-red-900 ring-1 ring-red-200'
  }
  return 'border-blue-200/60 bg-white text-slate-500'
}

export function isOptionCorrectForReveal(option, revealMeta) {
  if (!revealMeta?.correctOptionIds?.length) return false
  return revealMeta.correctOptionIds.includes(Number(option.option_id))
}

/** After reveal: whether the participant's MCQ / True-False choice matches the key. */
export function isParticipantChoiceCorrect(question, currentResponse, revealMeta) {
  if (!revealMeta?.correctOptionIds?.length) return null
  if (question?.type !== 'MCQ' && question?.type !== 'True/False') return null

  const selected = String(currentResponse?.selectedOption || '').trim()
  if (!selected) return false

  const selectedOption = (question?.options || []).find(
    (o) => String(o.option_text).trim().toLowerCase() === selected.toLowerCase(),
  )
  if (!selectedOption?.option_id) return false

  return revealMeta.correctOptionIds.includes(Number(selectedOption.option_id))
}
