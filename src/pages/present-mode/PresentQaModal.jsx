import { Pin, Search, ThumbsUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/ui/Modal'

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  answered: 'bg-sky-100 text-sky-900',
  rejected: 'bg-slate-100 text-slate-600',
  pinned: 'bg-violet-100 text-violet-900',
}

function formatQaSubmitter(question) {
  if (question?.is_anonymous) return 'Anonymous'
  return question?.participant?.nickname || 'Participant'
}

function formatQaStatus(status) {
  if (!status) return 'Unknown'
  return String(status).replace(/_/g, ' ')
}

export function PresentQaModal({ open, onClose, questions = [], isSessionLive }) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return questions
    return questions.filter((question) => {
      const text = String(question.question_text || '').toLowerCase()
      const submitter = formatQaSubmitter(question).toLowerCase()
      const status = String(question.status || '').toLowerCase()
      return text.includes(query) || submitter.includes(query) || status.includes(query)
    })
  }, [questions, search])

  const pendingCount = useMemo(
    () => questions.filter((question) => question.status === 'pending').length,
    [questions],
  )

  return (
    <Modal open={open} title={`Q&A (${questions.length})`} onClose={onClose}>
      {isSessionLive ? (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Session is live
        </p>
      ) : null}

      {questions.length > 0 ? (
        <>
          {pendingCount > 0 ? (
            <p className="mb-3 text-xs font-medium text-amber-800">
              {pendingCount} question{pendingCount === 1 ? '' : 's'} awaiting moderation
            </p>
          ) : null}

          <div className="relative mb-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search questions, submitter, or status..."
              className="h-10 w-full rounded-xl border border-blue-200/70 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              aria-label="Search Q&A questions"
            />
          </div>

          <div className="rounded-xl border border-blue-200/70 p-2">
            {filteredQuestions.length > 0 ? (
              <ul className="max-h-[min(50vh,24rem)] space-y-2 overflow-y-auto pr-1">
                {filteredQuestions.map((question) => {
                  const statusKey = String(question.status || 'pending')
                  const statusClass = STATUS_STYLES[statusKey] || STATUS_STYLES.pending

                  return (
                    <li
                      key={question.qa_id}
                      className="rounded-xl border border-blue-200/70 bg-blue-50/40 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-navy-900">
                          {question.question_text}
                        </p>
                        {/* <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusClass}`}
                        >
                          {formatQaStatus(question.status)}
                        </span> */}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span>{formatQaSubmitter(question)}</span>
                        {/* <span className="inline-flex items-center gap-1 font-medium text-navy-700">
                          <ThumbsUp className="size-3.5" aria-hidden />
                          {question.upvotes ?? 0}
                        </span> */}
                        {question.is_pinned ? (
                          <span className="inline-flex items-center gap-1 font-medium text-violet-700">
                            <Pin className="size-3.5" aria-hidden />
                            Pinned
                          </span>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-slate-600">
                No questions match &ldquo;{search.trim()}&rdquo;.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center text-sm text-slate-600">
          No Q&amp;A questions have been submitted yet.
        </p>
      )}
    </Modal>
  )
}
