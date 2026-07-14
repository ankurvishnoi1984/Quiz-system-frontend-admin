import { useEffect, useMemo, useRef, useState } from 'react'
import { useElementSize } from '../../hooks/useElementSize'

const CLOUD_COLORS = [
  '#0a1f2e',
  '#1b4b6b',
  '#2563eb',
  '#0ea5e9',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#ea580c',
  '#0d9488',
  '#4f46e5',
]

function hashSeed(text) {
  let h = 0
  const s = String(text || '')
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function overlaps(a, b, pad = 8) {
  return !(
    a.x + a.w + pad < b.x ||
    b.x + b.w + pad < a.x ||
    a.y + a.h + pad < b.y ||
    b.y + b.h + pad < a.y
  )
}

function estimateWordBox(text, fontSize, rotationDeg) {
  const len = Math.max(1, String(text).length)
  const width = fontSize * (0.58 * len + 0.4)
  const height = fontSize * 1.12
  const rad = (Math.abs(rotationDeg) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    w: Math.abs(width * cos) + Math.abs(height * sin),
    h: Math.abs(width * sin) + Math.abs(height * cos),
  }
}

/**
 * Spiral-pack words into the available area (Mentimeter-style filled cloud).
 */
function layoutWordCloud(words, width, height) {
  if (!words.length || width < 80 || height < 80) return []

  const maxCount = Math.max(...words.map((w) => w.count), 1)
  const shortSide = Math.min(width, height)
  const fewWordsBoost = words.length <= 6 ? 1.35 : words.length <= 12 ? 1.15 : 1
  const maxPx = Math.min(180, Math.max(72, shortSide * 0.32 * fewWordsBoost))
  const minPx = Math.min(48, Math.max(28, maxPx * (words.length <= 6 ? 0.42 : 0.3)))

  const sorted = [...words].sort(
    (a, b) => b.count - a.count || String(a.text).localeCompare(String(b.text)),
  )
  const placed = []
  const cx = width / 2
  const cy = height / 2
  const maxR = Math.hypot(width, height) * 0.58

  sorted.forEach((word, index) => {
    const ratio = Math.sqrt(word.count / maxCount)
    const fontSize = Math.round(minPx + ratio * (maxPx - minPx))
    const seed = hashSeed(word.text)
    const rotation =
      seed % 5 === 0 ? -18 : seed % 4 === 0 ? 14 : seed % 3 === 0 ? -8 : seed % 7 === 0 ? 10 : 0
    const box = estimateWordBox(word.text, fontSize, rotation)

    let best = null
    const step = Math.max(5, fontSize * 0.15)
    const angleStep = 0.32
    for (let t = 0; t < 1000; t += 1) {
      const angle = t * angleStep + (seed % 17) * 0.15
      const radius = step * t * 0.2
      if (radius > maxR) break
      const x = cx + Math.cos(angle) * radius - box.w / 2
      const y = cy + Math.sin(angle) * radius - box.h / 2
      if (x < 4 || y < 4 || x + box.w > width - 4 || y + box.h > height - 4) continue
      const candidate = { x, y, w: box.w, h: box.h }
      if (placed.every((p) => !overlaps(candidate, p))) {
        best = candidate
        break
      }
    }

    if (!best) {
      best = {
        x: Math.max(4, Math.min(width - box.w - 4, cx - box.w / 2 + ((index % 5) - 2) * 14)),
        y: Math.max(4, Math.min(height - box.h - 4, cy - box.h / 2 + ((index % 7) - 3) * 12)),
        w: box.w,
        h: box.h,
      }
    }

    placed.push({
      ...best,
      text: word.text,
      count: word.count,
      fontSize,
      rotation,
      color: CLOUD_COLORS[index % CLOUD_COLORS.length],
      key: String(word.text).toLowerCase(),
    })
  })

  return placed
}

/**
 * Mentimeter-style packed word cloud that fills the presentation area.
 */
export function PreviewWordCloud({ words = [], emptyLabel = 'Waiting for answers…' }) {
  const { ref, width, height, ready } = useElementSize(240)
  const seenRef = useRef(new Set())
  const [flashKeys, setFlashKeys] = useState(() => new Set())

  const placed = useMemo(
    () => (ready ? layoutWordCloud(words, width, height) : []),
    [words, width, height, ready],
  )

  useEffect(() => {
    const nextFlash = new Set()
    words.forEach((word) => {
      const key = String(word.text).toLowerCase()
      if (!seenRef.current.has(key)) {
        nextFlash.add(key)
        seenRef.current.add(key)
      }
    })
    if (nextFlash.size) {
      setFlashKeys(nextFlash)
      const timer = window.setTimeout(() => setFlashKeys(new Set()), 1200)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [words])

  if (!words.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-center text-[clamp(1.25rem,3vw,2rem)] font-semibold text-slate-500">
          {emptyLabel}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="relative h-full min-h-0 w-full flex-1 overflow-hidden"
      role="img"
      aria-label="Word cloud"
    >
      {placed.map((item, index) => {
        const isNew = flashKeys.has(item.key)
        return (
          <div
            key={item.key}
            className="absolute flex items-center justify-center"
            style={{
              left: item.x,
              top: item.y,
              width: item.w,
              height: item.h,
            }}
          >
            <span
              className={`preview-cloud-word inline-block font-bold leading-none select-none ${
                isNew ? 'preview-cloud-word--new' : ''
              }`}
              style={{
                fontSize: item.fontSize,
                color: item.color,
                '--preview-cloud-rotate': `${item.rotation}deg`,
                transform: `rotate(${item.rotation}deg)`,
                animationDelay: `${Math.min(index, 12) * 55}ms`,
                textShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
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
