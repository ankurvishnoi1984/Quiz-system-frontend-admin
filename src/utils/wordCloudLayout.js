/**
 * Mentimeter-style word-cloud packing.
 * Pure layout + sizing — safe to share across Live / Present / Preview / Analytics.
 *
 * Key rule: never dump failed placements into the center (that causes staggered overlap).
 * Instead shrink the whole cloud until every word finds a non-overlapping slot.
 */

export const WORD_CLOUD_COLORS = [
  '#3d5a1e',
  '#e85d04',
  '#c2410c',
  '#9f1239',
  '#78350f',
  '#15803d',
  '#b45309',
  '#7c2d12',
  '#365314',
  '#ea580c',
  '#1e3a2f',
  '#be123c',
]

const MAX_VISIBLE_WORDS = 80
const GAP = 8
const EDGE = 6

function hashSeed(text) {
  let h = 0
  const s = String(text || '')
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function overlaps(a, b, pad = GAP) {
  return !(
    a.x + a.w + pad < b.x ||
    b.x + b.w + pad < a.x ||
    a.y + a.h + pad < b.y ||
    b.y + b.h + pad < a.y
  )
}

/** Axis-aligned bounding box for a rotated bold sans-serif label (conservative). */
export function estimateWordBox(text, fontSize, rotationDeg) {
  const len = Math.max(1, String(text).length)
  // Bold system UI fonts often render wider than 0.5em — pad generously so glyphs never collide.
  const width = fontSize * (0.68 * len + 0.55)
  const height = fontSize * 1.2
  const rad = (Math.abs(rotationDeg) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    w: Math.abs(width * cos) + Math.abs(height * sin),
    h: Math.abs(width * sin) + Math.abs(height * cos),
  }
}

/**
 * Starting font range before shrink-to-fit.
 * Kept intentionally modest so a handful of words don’t consume the whole canvas.
 */
export function computeFontRange(wordCount, width, height) {
  const shortSide = Math.min(width, height)
  const n = Math.max(1, wordCount)
  const density = Math.max(0.32, Math.min(1, 5.2 / Math.sqrt(n + 4)))

  const maxPx = Math.min(shortSide * 0.28 * density, shortSide * 0.34, width * 0.45)
  const minPx = Math.max(12, Math.min(maxPx * 0.42, shortSide * 0.07))

  return { minPx, maxPx }
}

function pickRotation(seed, index, wordCount) {
  // Mostly horizontal; a few true verticals once the cloud is busy.
  if (wordCount >= 8 && seed % 6 === 0) return seed % 2 === 0 ? 90 : -90
  if (wordCount >= 14 && index > 0 && seed % 9 === 0) return seed % 2 === 0 ? 90 : -90
  return 0
}

function tryPlaceWord({ box, seed, placed, width, height, cx, cy }) {
  const maxR = Math.hypot(width, height) * 0.7
  const step = Math.max(4, Math.min(box.w, box.h) * 0.08)
  const angleStep = 0.24

  for (let t = 0; t < 2200; t += 1) {
    const angle = t * angleStep + (seed % 23) * 0.13
    const radius = step * t * 0.16
    if (radius > maxR) break
    const x = cx + Math.cos(angle) * radius - box.w / 2
    const y = cy + Math.sin(angle) * radius - box.h / 2
    if (x < EDGE || y < EDGE || x + box.w > width - EDGE || y + box.h > height - EDGE) continue
    const candidate = { x, y, w: box.w, h: box.h }
    if (placed.every((p) => !overlaps(candidate, p))) return candidate
  }

  // Grid scan fallback — still non-overlapping, never center-stack.
  const grid = Math.max(6, Math.min(18, Math.floor(Math.min(box.w, box.h) * 0.35)))
  for (let y = EDGE; y <= height - box.h - EDGE; y += grid) {
    for (let x = EDGE; x <= width - box.w - EDGE; x += grid) {
      const candidate = { x, y, w: box.w, h: box.h }
      if (placed.every((p) => !overlaps(candidate, p))) return candidate
    }
  }

  return null
}

function attemptLayout(sorted, width, height, scale) {
  const maxCount = Math.max(...sorted.map((w) => Number(w.count) || 1), 1)
  const { minPx, maxPx } = computeFontRange(sorted.length, width, height)
  const scaledMax = Math.max(10, maxPx * scale)
  const scaledMin = Math.max(9, Math.min(minPx * scale, scaledMax * 0.85))

  const placed = []
  const cx = width / 2
  const cy = height / 2

  for (let index = 0; index < sorted.length; index += 1) {
    const word = sorted[index]
    const count = Math.max(1, Number(word.count) || 1)
    const ratio = Math.sqrt(count / maxCount)
    const fontSize = Math.round(scaledMin + ratio * (scaledMax - scaledMin))
    const seed = hashSeed(word.text)
    const rotation = pickRotation(seed, index, sorted.length)
    const box = estimateWordBox(word.text, fontSize, rotation)

    // If a single word can’t fit the canvas at this scale, abort and shrink.
    if (box.w > width - EDGE * 2 || box.h > height - EDGE * 2) {
      return { ok: false, placed: [] }
    }

    const spot = tryPlaceWord({ box, seed, placed, width, height, cx, cy })
    if (!spot) return { ok: false, placed: [] }

    placed.push({
      ...spot,
      text: String(word.text),
      count,
      fontSize,
      rotation,
      color: WORD_CLOUD_COLORS[index % WORD_CLOUD_COLORS.length],
      key: String(word.text).toLowerCase(),
    })
  }

  return { ok: true, placed }
}

/**
 * @param {{ text: string, count: number }[]} words
 * @param {number} width
 * @param {number} height
 */
export function layoutWordCloud(words, width, height) {
  if (!words?.length || width < 40 || height < 40) return []

  const sorted = [...words]
    .filter((w) => w && String(w.text || '').trim())
    .sort((a, b) => b.count - a.count || String(a.text).localeCompare(String(b.text)))
    .slice(0, MAX_VISIBLE_WORDS)

  // Shrink-to-fit: keep trying until every word has a real slot (no center dump).
  for (let i = 0; i < 14; i += 1) {
    const scale = Math.pow(0.82, i)
    const result = attemptLayout(sorted, width, height, scale)
    if (result.ok) return result.placed
  }

  // Ultimate fallback: place left-to-right rows at tiny size (always readable, never stacked).
  return layoutWordCloudRows(sorted, width, height)
}

function layoutWordCloudRows(sorted, width, height) {
  const maxCount = Math.max(...sorted.map((w) => Number(w.count) || 1), 1)
  const fontSize = Math.max(11, Math.min(22, Math.floor(Math.min(width, height) / 14)))
  const placed = []
  let x = EDGE
  let y = EDGE
  let rowH = 0

  sorted.forEach((word, index) => {
    const count = Math.max(1, Number(word.count) || 1)
    const ratio = Math.sqrt(count / maxCount)
    const size = Math.round(fontSize * (0.85 + ratio * 0.45))
    const box = estimateWordBox(word.text, size, 0)

    if (x + box.w > width - EDGE && x > EDGE) {
      x = EDGE
      y += rowH + GAP
      rowH = 0
    }
    if (y + box.h > height - EDGE) return

    placed.push({
      x,
      y,
      w: box.w,
      h: box.h,
      text: String(word.text),
      count,
      fontSize: size,
      rotation: 0,
      color: WORD_CLOUD_COLORS[index % WORD_CLOUD_COLORS.length],
      key: String(word.text).toLowerCase(),
    })
    x += box.w + GAP
    rowH = Math.max(rowH, box.h)
  })

  return placed
}

export function wordCloudSignature(words) {
  return (words || [])
    .map((w) => `${String(w.text || '').toLowerCase()}:${Number(w.count) || 0}`)
    .sort()
    .join('|')
}
