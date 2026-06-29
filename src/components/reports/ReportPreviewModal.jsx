import { Download, Loader2, Printer, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { downloadReportPdf } from '../../utils/printReportPdf'

export function ReportPreviewModal({ open, onClose, title = 'Report preview', filename, children }) {
  const contentRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const handleDownload = async () => {
    if (!contentRef.current) return

    setDownloading(true)
    try {
      await downloadReportPdf({
        element: contentRef.current,
        filename,
      })
    } catch (error) {
      console.error(error)
      window.alert(error?.message || 'PDF export failed')
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    const cleanup = () => {
      document.body.classList.remove('report-preview-printing')
      window.removeEventListener('afterprint', cleanup)
    }

    document.body.classList.add('report-preview-printing')
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  if (!open) return null

  return (
    <div className="report-preview-modal host-print-hide fixed inset-0 z-50 flex flex-col bg-slate-900/40">
      <div className="report-preview-modal-toolbar flex shrink-0 items-center justify-between gap-3 border-b border-blue-200/70 bg-white px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy-700">PDF Report</p>
          <h2 className="text-lg font-bold text-navy-900">{title}</h2>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
          >
            <Printer className="size-4" />
            Print
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {downloading ? 'Downloading…' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-200/70 p-2 text-slate-600 transition hover:bg-blue-50"
            aria-label="Close preview"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100/90 p-4 sm:p-8">
        <div className="report-preview-sheet mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-10">
          <div ref={contentRef} className="report-document">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
