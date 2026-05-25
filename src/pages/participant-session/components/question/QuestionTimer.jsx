import { Check, Clock3 } from 'lucide-react'

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function QuestionTimer({ timer, timeLimit, submittedAtSeconds = null }) {
  const urgent = timer <= 5
  const submitted = submittedAtSeconds != null
  const limit = Math.max(1, timeLimit)
  const remaining = Math.max(0, Math.min(1, timer / limit))
  const size = 72
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - remaining)
  const submittedMarkerOffset =
    submitted && timeLimit > 0
      ? circumference * (1 - Math.max(0, Math.min(1, submittedAtSeconds / limit)))
      : null

  return (
    <div className="flex items-center gap-4 rounded-xl border border-blue-200/70 bg-white p-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-slate-100"
            strokeWidth={stroke}
          />
          {submittedMarkerOffset != null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className="stroke-emerald-400/90"
              strokeWidth={stroke + 2}
              strokeLinecap="round"
              strokeDasharray={`2 ${circumference - 2}`}
              strokeDashoffset={submittedMarkerOffset}
            />
          )}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={urgent ? 'stroke-red-500' : 'stroke-navy-600'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.2s' }}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-mono text-sm font-bold tabular-nums ${
            urgent ? 'text-red-700' : 'text-navy-800'
          }`}
        >
          {formatTime(timer)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
          <Clock3 className={`size-4 shrink-0 ${urgent ? 'text-red-600' : 'text-navy-600'}`} />
          <span>Time left</span>
          {submitted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
              <Check className="size-3 shrink-0" aria-hidden />
              Submitted at {formatTime(submittedAtSeconds)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {submitted
            ? urgent
              ? 'Answer locked — timer almost up'
              : `Answer locked — ${timer} second${timer === 1 ? '' : 's'} until time runs out`
            : urgent
              ? 'Hurry — time is almost up'
              : `${timer} second${timer === 1 ? '' : 's'} remaining`}
        </p>
      </div>
    </div>
  )
}
