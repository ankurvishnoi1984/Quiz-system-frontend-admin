import { resolveQuestionMediaUrl } from '../../utils/questionMedia'

export function QuestionMedia({ media, className = '', maxHeightClass = 'max-h-80' }) {
  const src = resolveQuestionMediaUrl(media?.url)
  if (!src) return null

  const baseClassName = `${maxHeightClass} w-full rounded-2xl border border-blue-100 ${className}`.trim()

  if (media.kind === 'video') {
    return <video src={src} controls className={baseClassName} />
  }

  if (media.kind === 'audio') {
    return (
      <div className={`w-full rounded-2xl border border-blue-100 bg-slate-50 px-4 py-4 ${className}`.trim()}>
        <audio src={src} controls className="w-full" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt="Question media"
      className={`${baseClassName} object-contain`}
    />
  )
}
