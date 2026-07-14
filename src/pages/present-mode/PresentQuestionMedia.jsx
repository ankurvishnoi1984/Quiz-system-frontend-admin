import { Maximize2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveQuestionMediaUrl } from '../../utils/questionMedia'

function PresentMediaContent({
  media,
  src,
  className,
  videoControls = true,
  audioControls = true,
  videoAutoPlay = false,
  videoRef = null,
}) {
  if (media.kind === 'video') {
    return (
      <video
        ref={videoRef}
        src={src}
        controls={videoControls}
        playsInline
        autoPlay={videoAutoPlay}
        className={className}
      />
    )
  }

  if (media.kind === 'audio') {
    return (
      <div className={`flex w-full items-center justify-center px-6 py-8 ${className}`.trim()}>
        <audio src={src} controls={audioControls} autoPlay={videoAutoPlay} className="w-full max-w-xl" />
      </div>
    )
  }

  return <img src={src} alt="Question media" className={className} />
}

export function PresentQuestionMedia({ media, className = '' }) {
  const [expanded, setExpanded] = useState(false)
  const expandedVideoRef = useRef(null)
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

  useEffect(() => {
    if (!expanded || media?.kind !== 'video') return undefined
    const video = expandedVideoRef.current
    if (!video) return undefined
    const playAttempt = video.play?.()
    if (playAttempt?.catch) playAttempt.catch(() => {})
    return () => {
      try {
        video.pause?.()
      } catch {
        /* ignore */
      }
    }
  }, [expanded, media?.kind, src])

  if (!src) return null

  const compactVisualClassName =
    'max-h-[min(18vh,160px)] w-full object-contain lg:max-h-[min(22vh,200px)]'

  const compactAudioPanel = (
    <div
      className={`relative z-20 overflow-hidden rounded-2xl border border-blue-200/80 bg-slate-950/5 shadow-md shadow-navy-900/10 ${className}`.trim()}
    >
      <PresentMediaContent
        media={media}
        src={src}
        videoControls={false}
        audioControls
        className="min-h-[88px] w-full py-5"
      />
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-navy-800 shadow-sm transition hover:bg-white"
        aria-label="Expand question media"
      >
        <Maximize2 className="size-3" />
        Expand
      </button>
    </div>
  )

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
              <PresentMediaContent
                media={media}
                src={src}
                videoRef={expandedVideoRef}
                videoControls
                audioControls
                videoAutoPlay={media.kind === 'video' || media.kind === 'audio'}
                className={
                  media.kind === 'audio'
                    ? 'w-full max-w-2xl'
                    : 'max-h-[calc(90vh-1.5rem)] max-w-full object-contain'
                }
              />
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {media.kind === 'audio' ? (
        compactAudioPanel
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`group relative z-20 block w-full text-left ${className}`.trim()}
          aria-label="Expand question media"
        >
          <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-slate-950/5 shadow-md shadow-navy-900/10 transition hover:border-blue-300 hover:shadow-lg">
            <PresentMediaContent
              media={media}
              src={src}
              videoControls={false}
              audioControls={false}
              className={compactVisualClassName}
            />
            <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-navy-950/35 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-navy-800 shadow-sm">
              <Maximize2 className="size-3" />
              Expand
            </span>
          </div>
        </button>
      )}

      {expandedOverlay}
    </>
  )
}
