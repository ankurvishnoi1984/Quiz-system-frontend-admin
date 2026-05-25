import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'

export function LiveQaPanel({ questions, onModerate, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-navy-900">Q&A panel</p>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm"
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {open ? (
      <div className="mt-3 space-y-2">
        {(questions || []).map((q) => (
          <div key={q.qa_id} className="rounded-xl border border-blue-200 bg-white p-3">
            <p className="text-sm font-semibold text-navy-900">{q.question_text}</p>
            <p className="mt-1 text-xs text-slate-600">Status: {q.status}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onModerate(q.qa_id, 'approve')}
                className="rounded-lg border border-emerald-200 px-2 py-1 text-emerald-700"
                aria-label="Approve"
              >
                <ThumbsUp className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onModerate(q.qa_id, 'reject')}
                className="rounded-lg border border-red-200 px-2 py-1 text-red-700"
                aria-label="Reject"
              >
                <ThumbsDown className="size-4" />
              </button>
            </div>
          </div>
        ))}
        {!questions?.length ? (
          <p className="py-4 text-center text-sm text-slate-500">No Q&A questions yet.</p>
        ) : null}
      </div>
      ) : null}
    </div>
  )
}
