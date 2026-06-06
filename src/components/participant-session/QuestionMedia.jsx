import { resolveQuestionMediaUrl } from '../../utils/questionMedia'

export function QuestionMedia({ media, className = '', maxHeightClass = 'max-h-80' }) {
  const src = resolveQuestionMediaUrl(media?.url)
  if (!src) return null

  const baseClassName = `${maxHeightClass} w-full rounded-2xl border border-blue-100 ${className}`.trim()

  if (media.kind === 'video') {
    return <video src={src} controls className={baseClassName} />
  }

  return (
    <img
      src={src}
      alt="Question media"
      className={`${baseClassName} object-contain`}
    />
  )
}
