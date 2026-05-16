const CLOUD_COLORS = [
  '#1d4ed8',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#0891b2',
  '#0d9488',
  '#0ea5e9',
  '#6366f1',
  '#db2777',
  '#ea580c',
]

function colorForIndex(index) {
  return CLOUD_COLORS[index % CLOUD_COLORS.length]
}

/**
 * @param {{ words?: { text: string, count: number }[], className?: string, emptyLabel?: string }} props
 */
export default function WordCloudChart({
  words = [],
  className = '',
  emptyLabel = 'Waiting for words…',
}) {
  if (!words.length) {
    return (
      <div className={`flex h-full items-center justify-center ${className}`}>
        <p className="text-center text-sm text-slate-500">{emptyLabel}</p>
      </div>
    )
  }

  const maxCount = Math.max(...words.map((w) => w.count), 1)
  const minPx = 14
  const maxPx = 56

  return (
    <div
      className={`flex h-full flex-wrap content-center items-center justify-center gap-x-4 gap-y-3 overflow-auto p-2 ${className}`}
      role="img"
      aria-label="Word cloud of participant responses"
    >
      {words.map((word, index) => {
        const ratio = word.count / maxCount
        const fontSize = Math.round(minPx + ratio * (maxPx - minPx))
        const rotation = index % 5 === 0 ? -4 : index % 4 === 0 ? 3 : 0

        return (
          <span
            key={`${word.text}-${index}`}
            className="inline-block cursor-default font-bold leading-tight transition-transform hover:scale-110"
            style={{
              fontSize: `${fontSize}px`,
              color: colorForIndex(index),
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
            }}
            title={`${word.text}: ${word.count} ${word.count === 1 ? 'time' : 'times'}`}
          >
            {word.text}
          </span>
        )
      })}
    </div>
  )
}
