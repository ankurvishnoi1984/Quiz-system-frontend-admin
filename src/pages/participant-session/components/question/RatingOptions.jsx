import { Star } from 'lucide-react'

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

  return (
    <div className="space-y-2">
      {(question?.ratingMinLabel || question?.ratingMaxLabel) && (
        <div className="flex justify-between text-xs text-slate-600">
          <span>{question.ratingMinLabel || String(min)}</span>
          <span>{question.ratingMaxLabel || String(max)}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            disabled={inputsLocked}
            type="button"
            onClick={() => onSelectRating(value)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              Number(currentResponse.rating) === value
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
            }`}
          >
            <Star
              className={`size-4 ${
                Number(currentResponse.rating) >= value ? 'text-amber-500' : 'text-slate-400'
              }`}
            />
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}
