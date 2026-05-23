import { Star } from 'lucide-react'

export function RatingOptions({ questionId, currentResponse, inputsLocked, onSelectRating }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          disabled={inputsLocked}
          type="button"
          onClick={() => onSelectRating(i + 1)}
          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
            currentResponse.rating === i + 1
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
          }`}
        >
          <Star
            className={`size-4 ${currentResponse.rating >= i + 1 ? 'text-amber-500' : 'text-slate-400'}`}
          />
          {i + 1}
        </button>
      ))}
    </div>
  )
}
