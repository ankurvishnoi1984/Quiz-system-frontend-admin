import { Clock3, Users } from 'lucide-react'
import { PageCenteredShell } from './PageCenteredShell'

export function WaitingView({ session, transitioningLive }) {
  return (
    <PageCenteredShell maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <Clock3 className={`size-7 ${transitioningLive ? 'animate-spin' : 'animate-pulse'}`} />
        </div>
        <h1 className="text-3xl font-bold text-navy-900">
          {transitioningLive ? 'Session is live!' : 'Waiting for the host to start...'}
        </h1>
        <p className="text-slate-600">{session.title}</p>
        <div className="mx-auto flex max-w-md items-center justify-center gap-6 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">
          <span className="inline-flex items-center gap-2">
            <Users className="size-4" /> {session.participant_count || 0} participants
          </span>
          <span>Fun fact: Participants respond 2x faster with visuals.</span>
        </div>
      </div>
    </PageCenteredShell>
  )
}
