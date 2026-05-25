import { LEADERBOARD_LIMIT_OPTIONS } from '../../utils/leaderboard'

export function LeaderboardLimitSelect({ value, onChange, id = 'leaderboard-limit' }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="sr-only">Number of results</span>
      <select
        id={id}
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-xl border border-amber-200/80 bg-white px-2.5 text-sm font-semibold text-navy-900"
      >
        {LEADERBOARD_LIMIT_OPTIONS.map((n) => (
          <option key={n} value={n}>
            Top {n}
          </option>
        ))}
      </select>
    </label>
  )
}
