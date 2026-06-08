import { Star } from 'lucide-react'

function ratingButtonSizeClass(count) {
  if (count > 8) return 'h-11 w-11'
  if (count > 6) return 'h-12 w-12'
  return 'h-14 w-14 sm:h-[3.75rem] sm:w-[3.75rem]'
}

export function RatingOptions({
  question,
  currentResponse,
  inputsLocked,
  onSelectRating,
}) {
  const min = Number(question?.ratingMin ?? 1)
  const max = Number(question?.ratingMax ?? 5)
  const count = Math.max(1, max - min + 1)
  const values = Array.from({ length: count }, (_, i) => min + i)
  const selectedRating = Number(currentResponse.rating)
  const hasLabels = Boolean(question?.ratingMinLabel || question?.ratingMaxLabel)
  const buttonSizeClass = ratingButtonSizeClass(count)

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-xl bg-slate-50/70 px-4 py-5 ring-1 ring-slate-200/70 sm:px-5">
        <div
          role="radiogroup"
          aria-label="Select a rating"
          className="flex w-full items-center justify-between gap-2"
        >
          {values.map((value) => {
            const isSelected = selectedRating === value
            const isFilled = Number.isFinite(selectedRating) && selectedRating >= value

            return (
              <button
                key={value}
                disabled={inputsLocked}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Rate ${value}`}
                onClick={() => onSelectRating(value)}
                className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border transition-all ${buttonSizeClass} ${
                  isSelected
                    ? 'border-amber-400 bg-white text-amber-800 shadow-md shadow-amber-100/80 ring-2 ring-amber-300/50'
                    : 'border-slate-200/90 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/70'
                }`}
              >
                <Star
                  className={`size-4 sm:size-5 ${
                    isFilled ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                  }`}
                />
                <span className="text-xs font-bold leading-none tabular-nums sm:text-sm">{value}</span>
              </button>
            )
          })}
        </div>

        {hasLabels ? (
          <div className="mt-3 flex w-full items-start justify-between gap-4">
            <span className="max-w-[42%] text-left text-xs font-medium leading-snug text-slate-500 sm:text-sm">
              {question.ratingMinLabel || String(min)}
            </span>
            <span className="max-w-[42%] text-right text-xs font-medium leading-snug text-slate-500 sm:text-sm">
              {question.ratingMaxLabel || String(max)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
