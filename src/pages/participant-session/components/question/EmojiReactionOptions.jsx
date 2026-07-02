import { useEffect, useState } from 'react'

export function EmojiReactionOptions({
  question,
  currentResponse,
  inputsLocked,
  hasSubmitted,
  onToggleOption,
}) {
  const [justSubmitted, setJustSubmitted] = useState(false)
  const selected = String(currentResponse?.selectedOption || '').trim()
  const options = question?.options || []

  useEffect(() => {
    if (!hasSubmitted) {
      setJustSubmitted(false)
      return undefined
    }
    setJustSubmitted(true)
    const timer = window.setTimeout(() => setJustSubmitted(false), 1200)
    return () => window.clearTimeout(timer)
  }, [hasSubmitted])

  if (hasSubmitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div
          className={`text-6xl leading-none ${justSubmitted ? 'animate-bounce' : ''}`}
          aria-hidden
        >
          {selected || '✓'}
        </div>
        <p className="text-base font-semibold text-emerald-700">Reaction sent!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
        {options.map((option) => {
          const emoji = option.option_text || option.text
          const isSelected = selected === emoji
          return (
            <button
              key={option.option_id ?? option.id ?? emoji}
              type="button"
              disabled={inputsLocked}
              aria-pressed={isSelected}
              aria-label={`React with ${emoji}`}
              onClick={() => onToggleOption(emoji)}
              className={`flex min-h-14 min-w-14 items-center justify-center rounded-2xl border bg-white text-4xl leading-none transition duration-200 sm:min-h-16 sm:min-w-16 ${
                isSelected
                  ? 'scale-[1.2] border-indigo-400 ring-4 ring-indigo-300/50 shadow-lg shadow-indigo-100'
                  : 'border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/40'
              }`}
            >
              {emoji}
            </button>
          )
        })}
      </div>
      {selected ? (
        <p className="text-center text-sm font-medium text-slate-600">
          Tap your emoji again to deselect, or submit your reaction.
        </p>
      ) : (
        <p className="text-center text-sm text-slate-500">Tap one emoji to react</p>
      )}
    </div>
  )
}
