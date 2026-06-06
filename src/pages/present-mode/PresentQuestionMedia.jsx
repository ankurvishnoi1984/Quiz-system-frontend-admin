import { Maximize2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { resolveQuestionMediaUrl } from '../../utils/questionMedia'

function PresentMediaContent({ media, src, className, videoControls = true }) {
  if (media.kind === 'video') {
    return (
      <video
        src={src}
        controls={videoControls}
        playsInline
        className={className}
      />
    )
  }

  return <img src={src} alt="Question media" className={className} />
}

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
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded])

  if (!src) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`group relative overflow-hidden rounded-2xl border border-blue-200/80 bg-slate-950/5 shadow-md shadow-navy-900/10 transition hover:border-blue-300 hover:shadow-lg ${className}`.trim()}
        aria-label="Expand question media"
      >
        <PresentMediaContent
          media={media}
          src={src}
          videoControls={false}
          className="max-h-[min(18vh,160px)] w-full object-contain lg:max-h-[min(22vh,200px)]"
        />
        <span className="absolute inset-0 bg-linear-to-t from-navy-950/35 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-navy-800 shadow-sm">
          <Maximize2 className="size-3" />
          Expand
        </span>
      </button>

      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Question media preview"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <X className="size-4" />
            Close
          </button>
          <div
            className="max-h-[90vh] max-w-[min(96vw,1200px)] overflow-hidden rounded-2xl border border-white/15 bg-black/40 p-2 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <PresentMediaContent
              media={media}
              src={src}
              videoControls
              className="max-h-[calc(90vh-1rem)] max-w-full object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
