import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/ui/Modal'

export function PresentParticipantsModal({ open, onClose, participants, isSessionLive }) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const filteredParticipants = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return participants
    return participants.filter((participant) => participant.name.toLowerCase().includes(query))
  }, [participants, search])

  return (
    <Modal
      open={open}
      title={`Participants (${participants.length})`}
      onClose={onClose}
    >
      {isSessionLive ? (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Session is live
        </p>
      ) : null}

      {participants.length > 0 ? (
        <>
          <div className="relative mb-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search participants..."
              className="h-10 w-full rounded-xl border border-blue-200/70 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              aria-label="Search participants"
            />
          </div>

          <div className="rounded-xl border border-blue-200/70 p-2">
            {filteredParticipants.length > 0 ? (
              <ul className="max-h-[min(50vh,24rem)] space-y-2 overflow-y-auto pr-1">
                {filteredParticipants.map((participant, idx) => (
                  <li
                    key={participant.id}
                    className="flex items-center gap-3 rounded-xl border border-blue-200/70 bg-blue-50/40 px-4 py-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-navy-800 shadow-sm">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy-900">
                      {participant.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-slate-600">
                No participants match &ldquo;{search.trim()}&rdquo;.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center text-sm text-slate-600">
          No participants have joined yet.
        </p>
      )}
    </Modal>
  )
}
