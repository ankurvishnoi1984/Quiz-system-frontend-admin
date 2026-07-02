import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { EmojiPickerGrid } from '../emoji/EmojiPickerGrid'
import { DEFAULT_EMOJI_REACTION_OPTIONS } from '../../constants/emojiReaction'

function ensureFiveEmojiOptions(options = [], uid) {
  const normalized = (options || []).slice(0, 5).map((option, index) => ({
    id: option.id || uid(`emoji_${index}`),
    optionId: option.optionId ?? null,
    text: option.text || DEFAULT_EMOJI_REACTION_OPTIONS[index] || '👍',
    isCorrect: false,
  }))
  while (normalized.length < 5) {
    const index = normalized.length
    normalized.push({
      id: uid(`emoji_${index}`),
      optionId: null,
      text: DEFAULT_EMOJI_REACTION_OPTIONS[index] || '👍',
      isCorrect: false,
    })
  }
  return normalized
}

export function EmojiReactionEditor({ question, onChange, structureLocked, uid }) {
  const [swapIndex, setSwapIndex] = useState(null)
  const options = ensureFiveEmojiOptions(question.options, uid)

  const updateOptionEmoji = (index, emoji) => {
    const next = options.map((option, optionIndex) =>
      optionIndex === index ? { ...option, text: emoji } : option,
    )
    onChange({ ...question, options: next })
    setSwapIndex(null)
  }

  const usedEmojis = options.map((option) => option.text)

  return (
    <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Emoji reactions</p>
          <p className="mt-1 text-xs text-slate-500">Five emoji choices · tap swap to replace any slot</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-3">
        {options.map((option, index) => (
          <div key={option.id} className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-full items-center justify-center rounded-2xl border border-blue-100 bg-white text-[40px] leading-none shadow-sm">
              {option.text}
            </div>
            <button
              type="button"
              disabled={structureLocked}
              onClick={() => setSwapIndex(swapIndex === index ? null : index)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="size-3" />
              Swap
            </button>
          </div>
        ))}
      </div>

      {swapIndex != null ? (
        <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-indigo-800">
            Replace slot {swapIndex + 1}
          </p>
          <EmojiPickerGrid
            value={options[swapIndex]?.text}
            usedEmojis={usedEmojis}
            disabled={structureLocked}
            onSelect={(emoji) => updateOptionEmoji(swapIndex, emoji)}
          />
        </div>
      ) : null}
    </div>
  )
}
