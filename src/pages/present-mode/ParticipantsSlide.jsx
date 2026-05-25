import { Users } from 'lucide-react'
import { PresentSlideHeader } from './PresentShell'

export function ParticipantsSlide({ sessionTitle, participants, slideIndex, slideTotal }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PresentSlideHeader
        sessionTitle={sessionTitle}
        label="Participants"
        index={slideIndex}
        total={slideTotal}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <div className="mb-[clamp(1.5rem,4vh,3rem)] flex items-center gap-4">
          <span className="grid size-[clamp(3.5rem,8vw,5rem)] place-items-center rounded-3xl bg-linear-to-br from-navy-800 to-navy-600 text-white shadow-xl shadow-navy-900/25">
            <Users className="size-[clamp(1.75rem,4vw,2.5rem)]" strokeWidth={2} />
          </span>
          <div>
            <p className="text-[clamp(3rem,10vw,6rem)] font-bold leading-none tabular-nums text-navy-900">
              {participants.length}
            </p>
            <p className="text-[clamp(1rem,2.5vw,1.5rem)] font-semibold text-slate-600">
              {participants.length === 1 ? 'participant' : 'participants'} joined
            </p>
          </div>
        </div>

        {participants.length > 0 ? (
          <div className="grid w-full max-w-6xl grid-cols-[repeat(auto-fill,minmax(clamp(9rem,18vw,14rem),1fr))] gap-[clamp(0.75rem,2vw,1.25rem)] overflow-y-auto pb-4">
            {participants.map((p, idx) => (
              <div
                key={p.id}
                className="present-lb-row flex min-h-[clamp(3.5rem,8vh,5rem)] items-center justify-center rounded-2xl border border-blue-200/70 bg-white/95 px-4 py-3 text-center shadow-md shadow-navy-900/5 transition hover:border-navy-300 hover:shadow-lg"
                style={{ animationDelay: `${Math.min(idx, 20) * 35}ms` }}
              >
                <span className="line-clamp-2 text-[clamp(1rem,2.2vw,1.5rem)] font-semibold text-navy-900">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-[clamp(1.1rem,2.5vw,1.75rem)] text-slate-500">
            Waiting for participants to join…
          </p>
        )}
      </div>
    </div>
  )
}
