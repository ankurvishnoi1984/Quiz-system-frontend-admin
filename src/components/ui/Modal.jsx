import { X } from 'lucide-react'
import { useEffect } from 'react'

function Modal({ open, title, subtitle, children, onClose, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const widthClass =
    size === 'lg' ? 'w-[min(94vw,760px)]' : size === 'xl' ? 'w-[min(96vw,880px)]' : 'w-[min(92vw,680px)]'

  return (
    <div className="host-print-hide fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-navy-950/25 backdrop-blur-sm"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`relative flex ${widthClass} max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-blue-200/70 bg-white p-5 shadow-2xl shadow-blue-900/20 sm:p-6`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 id="modal-title" className="text-xl font-bold text-navy-900 sm:text-2xl">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-blue-200/70 p-2 text-slate-600 transition hover:bg-blue-50"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
