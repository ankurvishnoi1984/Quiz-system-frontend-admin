import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import Modal from '../ui/Modal'
import { SESSION_REPORT_EXPORTS } from '../../constants/sessionReportTypes'

function formatBadge(format) {
  return format.toUpperCase()
}

export function AnalyticsExportModal({ open, onClose, onExport, exportingId }) {
  return (
    <Modal open={open} title="Export reports" onClose={onClose}>
      <p className="text-sm text-slate-600">
        Choose a report type to download. More report types will appear here as they are added.
      </p>

      <ul className="mt-4 space-y-2">
        {SESSION_REPORT_EXPORTS.map((report) => {
          const isExporting = exportingId === report.id
          return (
            <li key={report.id}>
              <button
                type="button"
                disabled={Boolean(exportingId)}
                onClick={() => onExport(report.id)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-navy-900">{report.label}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {formatBadge(report.format)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{report.description}</p>
                </div>
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-navy-700">
                  {isExporting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : report.format === 'xlsx' ? (
                    <FileSpreadsheet className="size-4" />
                  ) : (
                    <Download className="size-4" />
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
