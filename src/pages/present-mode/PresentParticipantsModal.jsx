import Modal from '../../components/ui/Modal'

export function PresentParticipantsModal({ open, onClose, participants, isSessionLive }) {
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
        <ul className="max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto pr-1">
          {participants.map((participant, idx) => (
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
        <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center text-sm text-slate-600">
          No participants have joined yet.
        </p>
      )}
    </Modal>
  )
}
