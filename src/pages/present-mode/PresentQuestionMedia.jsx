import { Maximize2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveQuestionMediaUrl } from '../../utils/questionMedia'

export function PresentQuestionMedia({ media, className = '' }) {
  const [expanded, setExpanded] = useState(false)
  const src = resolveQuestionMediaUrl(media?.url)

  useEffect(() => {
    setExpanded(false)
  }, [src])

  useEffect(() => {
    if (!expanded) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [expanded])

  if (!src) return null

  const compactVisualClassName =
    'max-h-[min(18vh,160px)] w-full object-contain lg:max-h-[min(22vh,200px)]'

  // One <audio> for the lifetime of this media — expand only changes chrome/layout.
  if (media.kind === 'audio') {
    return (
      <>
        {/* Always mounted so the player shell never remounts when expanding */}
        <div
          key="audio-spacer"
          className={
            expanded
              ? `relative z-20 min-h-[88px] overflow-hidden rounded-2xl border border-blue-200/80 bg-slate-950/5 shadow-md shadow-navy-900/10 ${className}`.trim()
              : 'hidden'
          }
          aria-hidden
        />

        <div
          key="audio-player-shell"
          className={
            expanded
              ? 'fixed inset-0 z-[300] flex items-center justify-center bg-navy-950/85 p-4 backdrop-blur-sm'
              : `relative z-20 overflow-hidden rounded-2xl border border-blue-200/80 bg-slate-950/5 shadow-md shadow-navy-900/10 ${className}`.trim()
          }
          role={expanded ? 'dialog' : undefined}
          aria-modal={expanded ? true : undefined}
          aria-label={expanded ? 'Question media preview' : undefined}
          onClick={expanded ? () => setExpanded(false) : undefined}
        >
          {expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute right-4 top-4 z-[1] inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <X className="size-4" />
              Close
            </button>
          ) : null}

          <div
            className={
              expanded
                ? 'relative z-0 flex w-full max-w-[min(96vw,720px)] items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/50 px-6 py-8 shadow-2xl'
                : 'flex min-h-[88px] w-full items-center justify-center px-6 py-5'
            }
            onClick={expanded ? (event) => event.stopPropagation() : undefined}
          >
            <audio src={src} controls className="w-full max-w-xl" />
          </div>

          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-navy-800 shadow-sm transition hover:bg-white"
              aria-label="Expand question media"
            >
              <Maximize2 className="size-3" />
              Expand
            </button>
          ) : null}
        </div>
      </>
    )
  }

  const expandedOverlay =
    expanded && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-navy-950/85 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Question media preview"
            onClick={() => setExpanded(false)}
          >
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute right-4 top-4 z-[1] inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <X className="size-4" />
              Close
            </button>
            <div
              className="relative z-0 flex max-h-[90vh] w-full max-w-[min(96vw,1200px)] items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/50 p-3 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              {media.kind === 'video' ? (
                <video
                  src={src}
                  controls
                  playsInline
                  autoPlay
                  className="max-h-[calc(90vh-1.5rem)] max-w-full object-contain"
                />
              ) : (
                <img
                  src={src}
                  alt="Question media"
                  className="max-h-[calc(90vh-1.5rem)] max-w-full object-contain"
                />
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`group relative z-20 block w-full text-left ${className}`.trim()}
        aria-label="Expand question media"
      >
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-slate-950/5 shadow-md shadow-navy-900/10 transition hover:border-blue-300 hover:shadow-lg">
          {media.kind === 'video' ? (
            <video src={src} controls={false} playsInline className={compactVisualClassName} />
          ) : (
            <img src={src} alt="Question media" className={compactVisualClassName} />
          )}
          <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-navy-950/35 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-navy-800 shadow-sm">
            <Maximize2 className="size-3" />
            Expand
          </span>
        </div>
      </button>
      {expandedOverlay}
    </>
  )
}
