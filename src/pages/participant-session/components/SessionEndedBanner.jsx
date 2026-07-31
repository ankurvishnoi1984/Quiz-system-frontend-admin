import { CheckCircle2 } from 'lucide-react'

/** Compact notice above ending screens (leaderboard / survey results). */
export function SessionEndedBanner() {
  return (
    <p className="rounded-xl border border-slate-300/80 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800">
      This session has ended.
    </p>
  )
}

/** Full-page style message when the session is completed and no question should be shown. */
export function SessionEndedPanel() {
  return (
    <section className="flex min-h-[min(60vh,28rem)] flex-col items-center justify-center rounded-2xl border border-blue-200/70 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mb-5 inline-flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <CheckCircle2 className="size-8" aria-hidden />
      </div>
      <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">Session ended</h2>
      <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
        The host has ended this session. Thank you for participating!
      </p>
    </section>
  )
}
