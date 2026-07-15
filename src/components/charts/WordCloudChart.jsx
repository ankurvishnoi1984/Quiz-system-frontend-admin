import { useEffect, useMemo, useRef, useState } from 'react'
import { useElementSize } from '../../hooks/useElementSize'
import { layoutWordCloud, wordCloudSignature } from '../../utils/wordCloudLayout'

const NEW_WORD_FLASH_MS = 1100

/**
 * Mentimeter-style live word cloud.
 * - Dense spiral packing with mixed horizontal / vertical words
 * - Existing words shrink & reflow as new ones arrive (density-driven sizing)
 * - Smooth position/size transitions; new words pop in
 *
 * Use this everywhere word-cloud responses are visualized.
 *
 * @param {{
 *   words?: { text: string, count: number }[],
 *   className?: string,
 *   emptyLabel?: string,
 *   size?: 'sm' | 'md' | 'lg',
 * }} props
 */
export default function WordCloudChart({
  words = [],
  className = '',
  emptyLabel = 'Waiting for words…',
  size = 'md',
}) {
  const minHeight = size === 'lg' ? 280 : size === 'sm' ? 160 : 220
  // Use the true box size so packing matches what the user sees (no inflated height → clipped/stacked words).
  const { ref, width, height, ready } = useElementSize(minHeight, { useExactHeight: true })
  const seenKeysRef = useRef(new Set())
  const bootstrappedRef = useRef(false)
  const [flashKeys, setFlashKeys] = useState(() => new Set())

  const signature = useMemo(() => wordCloudSignature(words), [words])

  const placed = useMemo(() => {
    if (!ready) return []
    return layoutWordCloud(words, width, height)
  }, [words, signature, width, height, ready])

  useEffect(() => {
    if (!words.length) {
      seenKeysRef.current = new Set()
      bootstrappedRef.current = false
      setFlashKeys(new Set())
      return undefined
    }

    const nextFlash = new Set()
    const isFirstPaint = !bootstrappedRef.current

    words.forEach((word) => {
      const key = String(word.text || '').toLowerCase()
      if (!key) return
      if (!seenKeysRef.current.has(key)) {
        if (!isFirstPaint) nextFlash.add(key)
        seenKeysRef.current.add(key)
      }
    })

    bootstrappedRef.current = true

    if (!nextFlash.size) return undefined
    setFlashKeys(nextFlash)
    const timer = window.setTimeout(() => setFlashKeys(new Set()), NEW_WORD_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [signature, words])

  if (!words.length) {
    return (
      <div className={`flex h-full items-center justify-center ${className}`.trim()}>
        <p
          className={`text-center font-semibold text-slate-500 ${
            size === 'lg' ? 'text-[clamp(1.15rem,2.5vw,1.75rem)]' : 'text-sm'
          }`}
        >
          {emptyLabel}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`word-cloud relative h-full min-h-0 w-full overflow-hidden ${className}`.trim()}
      role="img"
      aria-label="Live word cloud of participant responses"
    >
      {placed.map((item) => {
        const isNew = flashKeys.has(item.key)
        return (
          <div
            key={item.key}
            className={`word-cloud__slot absolute flex items-center justify-center ${
              isNew ? 'word-cloud__slot--new' : ''
            }`}
            style={{
              left: item.x,
              top: item.y,
              width: item.w,
              height: item.h,
            }}
          >
            <span
              className="word-cloud__word select-none font-bold leading-none"
              style={{
                fontSize: item.fontSize,
                color: item.color,
                '--word-cloud-rotate': `${item.rotation}deg`,
                transform: `rotate(${item.rotation}deg)`,
              }}
              title={`${item.text}: ${item.count}`}
            >
              {item.text}
            </span>
          </div>
        )
      })}
    </div>
  )
}
