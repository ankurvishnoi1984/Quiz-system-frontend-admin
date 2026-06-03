import { Download, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { QaAnalyticsReportCard } from '../analytics/QaAnalyticsReportCard'

export function LiveQaPanel({
  questions,
  onModerate,
  report,
  isReportLoading,
  onExportExcel,
  isExporting,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [analyticsOpen, setAnalyticsOpen] = useState(true)

  const moderationQuestions = (questions || []).filter((q) => q.status !== 'rejected')

  return (
    <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy-900">Q&A panel</p>
          <p className="text-xs text-slate-600">Moderate live questions · export full log to Excel</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting || isReportLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold text-navy-800 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {open ? 'Collapse moderation' : 'Expand moderation'}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setAnalyticsOpen((prev) => !prev)}
          className="text-xs font-semibold uppercase tracking-wider text-navy-700"
        >
          {analyticsOpen ? 'Hide analytics' : 'Show analytics'}
        </button>
        {analyticsOpen ? (
          <div className="mt-3">
            <QaAnalyticsReportCard report={report} isLoading={isReportLoading} />
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Moderation queue</p>
          {moderationQuestions.map((q) => (
            <div key={q.qa_id} className="rounded-xl border border-blue-200 bg-white p-3">
              <p className="text-sm font-semibold text-navy-900">{q.question_text}</p>
              <p className="mt-1 text-xs text-slate-600">
                Status: {q.status} · {q.upvotes ?? 0} upvotes
              </p>
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
          {!moderationQuestions.length ? (
            <p className="py-4 text-center text-sm text-slate-500">No Q&A questions in the moderation queue.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
