import { Star } from 'lucide-react'

function ratingButtonSizeClass(count) {
  if (count > 8) return 'h-11 w-11'
  if (count > 6) return 'h-12 w-12'
  return 'h-14 w-14 sm:h-[3.75rem] sm:w-[3.75rem]'
}

/** Mobile-only grid columns so scales never overflow a phone width. */
function mobileGridColumnCount(optionCount) {
  if (optionCount <= 5) return optionCount
  if (optionCount === 6) return 3
  if (optionCount <= 8) return 4
  return 5
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
  const selectedRating = Number(currentResponse?.rating)
  const hasSelection = Number.isFinite(selectedRating)
  const minLabel = question?.ratingMinLabel?.trim() || ''
  const maxLabel = question?.ratingMaxLabel?.trim() || ''
  const hasLabels = Boolean(minLabel || maxLabel)
  const desktopButtonSizeClass = ratingButtonSizeClass(count)
  const mobileColumns = mobileGridColumnCount(count)

  return (
    <div className="w-full max-w-xl">
      {/* Mobile: responsive grid */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-900/5 sm:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tap to rate
          </p>
          <p
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${
              hasSelection
                ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80'
                : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200/80'
            }`}
            aria-live="polite"
          >
            <Star
              className={`size-3.5 shrink-0 ${
                hasSelection ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
              }`}
              aria-hidden
            />
            {hasSelection ? selectedRating : `${min}–${max}`}
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label={`Select a rating from ${min} to ${max}`}
          className="grid w-full gap-2"
          style={{ gridTemplateColumns: `repeat(${mobileColumns}, minmax(0, 1fr))` }}
        >
          {values.map((value) => {
            const isSelected = selectedRating === value
            const isFilled = hasSelection && selectedRating >= value

            return (
              <button
                key={value}
                disabled={inputsLocked}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Rate ${value} of ${max}`}
                onClick={() => onSelectRating(value)}
                className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-sm shadow-amber-100/80 ring-2 ring-amber-300/60'
                    : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-amber-200 hover:bg-amber-50/60'
                }`}
              >
                <Star
                  className={`size-4 shrink-0 ${
                    isFilled ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                  }`}
                  aria-hidden
                />
                <span className="text-sm font-bold leading-none tabular-nums">{value}</span>
              </button>
            )
          })}
        </div>

        {hasLabels ? (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Low · {min}
              </p>
              <p className="mt-0.5 break-words text-xs font-medium leading-snug text-slate-600">
                {minLabel || String(min)}
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                High · {max}
              </p>
              <p className="mt-0.5 break-words text-xs font-medium leading-snug text-slate-600">
                {maxLabel || String(max)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-medium text-slate-400">
            <span>{min}</span>
            <span className="text-slate-300">—</span>
            <span>{max}</span>
          </div>
        )}
      </div>

      {/* Desktop / tablet: original single-row layout */}
      <div className="hidden rounded-xl bg-slate-50/70 px-4 py-5 ring-1 ring-slate-200/70 sm:block sm:px-5">
        <div
          role="radiogroup"
          aria-label="Select a rating"
          className="flex w-full items-center justify-between gap-2"
        >
          {values.map((value) => {
            const isSelected = selectedRating === value
            const isFilled = hasSelection && selectedRating >= value

            return (
              <button
                key={value}
                disabled={inputsLocked}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Rate ${value}`}
                onClick={() => onSelectRating(value)}
                className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border transition-all ${desktopButtonSizeClass} ${
                  isSelected
                    ? 'border-amber-400 bg-white text-amber-800 shadow-md shadow-amber-100/80 ring-2 ring-amber-300/50'
                    : 'border-slate-200/90 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/70'
                }`}
              >
                <Star
                  className={`size-5 ${
                    isFilled ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                  }`}
                />
                <span className="text-sm font-bold leading-none tabular-nums">{value}</span>
              </button>
            )
          })}
        </div>

        {hasLabels ? (
          <div className="mt-3 flex w-full items-start justify-between gap-4">
            <span className="max-w-[42%] text-left text-sm font-medium leading-snug text-slate-500">
              {minLabel || String(min)}
            </span>
            <span className="max-w-[42%] text-right text-sm font-medium leading-snug text-slate-500">
              {maxLabel || String(max)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
