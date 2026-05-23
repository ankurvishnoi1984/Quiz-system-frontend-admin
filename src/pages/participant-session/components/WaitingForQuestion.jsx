import { Clock3 } from 'lucide-react'

export function WaitingForQuestion() {
  return (
    <section className="space-y-4 rounded-2xl border border-blue-200/70 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
        <Clock3 className="size-7 animate-pulse" />
      </div>
      <h2 className="text-xl font-bold text-navy-900">Waiting for a question</h2>
      <p className="text-sm text-slate-600">
        The host will open each question one at a time (or several at once). This page updates
        automatically when a question is activated.
      </p>
    </section>
  )
}
