export function QuestionTimer({ timer, timeLimit }) {
  return (
    <div className="rounded-xl border border-blue-200/70 bg-white p-3">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-slate-700">Time left</span>
        <span className={timer <= 5 ? 'text-red-700' : 'text-navy-700'}>{timer}s</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${timer <= 5 ? 'bg-red-500' : 'bg-linear-to-r from-navy-600 to-navy-500'}`}
          style={{ width: `${Math.round((timer / Math.max(1, timeLimit)) * 100)}%` }}
        />
      </div>
    </div>
  )
}
