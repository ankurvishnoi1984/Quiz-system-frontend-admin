import { Check, Clock3 } from 'lucide-react'

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function QuestionTimer({
  timer,
  timeLimit,
  submittedAtSeconds = null,
  variant = 'default',
  className = '',
}) {
  const expired = timer <= 0
  const urgent = !expired && timer <= 5
  const submitted = submittedAtSeconds != null
  const compact = variant === 'compact'
  const limit = Math.max(1, timeLimit)
  const remaining = Math.max(0, Math.min(1, timer / limit))
  const size = compact ? 64 : 72
  const stroke = compact ? 5 : 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - remaining)
  const submittedMarkerOffset =
    submitted && timeLimit > 0
      ? circumference * (1 - Math.max(0, Math.min(1, submittedAtSeconds / limit)))
      : null
  const statusLabel = expired ? "Time's up" : 'Time left'
  const statusTone = expired || urgent

  const ring = (
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
          className={statusTone ? 'stroke-red-500' : 'stroke-navy-600'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.2s' }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-mono font-bold tabular-nums ${
          compact ? 'text-base' : 'text-sm'
        } ${statusTone ? 'text-red-700' : 'text-navy-800'}`}
      >
        {formatTime(Math.max(0, timer))}
      </span>
    </div>
  )

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 shadow-lg shadow-navy-900/10 backdrop-blur-md ${
          expired
            ? 'border-red-200/90 bg-red-50/95'
            : 'border-white/80 bg-white/92'
        } ${className}`}
        role="timer"
        aria-live="polite"
        aria-label={statusLabel}
      >
        {ring}
        <span
          className={`pr-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
            statusTone ? 'text-red-600' : 'text-slate-500'
          }`}
        >
          {statusLabel}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-3 ${
        expired
          ? 'border-red-200 bg-red-50/80'
          : 'border-blue-200/70 bg-white'
      } ${className}`}
      role="timer"
      aria-live="polite"
      aria-label={statusLabel}
    >
      {ring}
      <div className="min-w-0 flex-1">
        <div
          className={`flex flex-wrap items-center gap-2 text-sm font-semibold ${
            expired ? 'text-red-800' : 'text-slate-700'
          }`}
        >
          <Clock3
            className={`size-4 shrink-0 ${statusTone ? 'text-red-600' : 'text-navy-600'}`}
          />
          <span>{statusLabel}</span>
          {submitted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
              <Check className="size-3 shrink-0" aria-hidden />
              Submitted at {formatTime(submittedAtSeconds)}
            </span>
          )}
        </div>
        {/* Seconds countdown text — hidden; mm:ss clock in the ring above is sufficient.
        <p className="mt-0.5 text-xs text-slate-500">
          {submitted
            ? urgent
              ? 'Answer locked — timer up'
              : `Answer locked — ${timer} second${timer === 1 ? '' : 's'} until time runs out`
            : urgent
              ? 'Time is up'
              : `${timer} second${timer === 1 ? '' : 's'} remaining`}
        </p>
        */}
      </div>
    </div>
  )
}
