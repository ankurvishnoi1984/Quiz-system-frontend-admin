import { EMOJI_PICKER_OPTIONS } from '../../constants/emojiReaction'

export function EmojiPickerGrid({ value, onSelect, usedEmojis = [], disabled = false }) {
  const used = new Set(usedEmojis.filter((emoji) => emoji && emoji !== value))

  return (
    <div
      className="grid grid-cols-5 gap-2 sm:grid-cols-10"
      role="listbox"
      aria-label="Choose an emoji"
    >
      {EMOJI_PICKER_OPTIONS.map((emoji) => {
        const isSelected = value === emoji
        const isUsedElsewhere = used.has(emoji)
        return (
          <button
            key={emoji}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={disabled || (isUsedElsewhere && !isSelected)}
            title={isUsedElsewhere && !isSelected ? 'Already used in another slot' : emoji}
            onClick={() => onSelect(emoji)}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border text-2xl transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35 ${
              isSelected
                ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300/60'
                : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/60'
            }`}
          >
            {emoji}
          </button>
        )
      })}
    </div>
  )
}
