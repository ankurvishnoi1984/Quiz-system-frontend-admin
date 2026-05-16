/** Split comma-separated word-cloud submissions into individual words. */
export function splitWordCloudText(raw) {
  if (raw == null || raw === '') return []
  return String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * Aggregate word frequencies from text blobs or response rows.
 * @param {Array<string|{ text_response?: string | null }>} sources
 * @returns {{ text: string, count: number }[]}
 */
export function aggregateWordCloudCounts(sources) {
  const byKey = new Map()

  const addTexts = (items) => {
    for (const raw of items) {
      for (const word of splitWordCloudText(raw)) {
        const key = word.toLowerCase()
        const cur = byKey.get(key)
        if (!cur) {
          byKey.set(key, { text: word, count: 1 })
        } else {
          cur.count += 1
        }
      }
    }
  }

  if (!sources?.length) return []

  if (typeof sources[0] === 'string') {
    addTexts(sources)
  } else {
    addTexts(sources.map((row) => row?.text_response ?? ''))
  }

  return [...byKey.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
}

export function wordCountsFromResponses(responses) {
  return aggregateWordCloudCounts(responses || [])
}

export function wordCountsFromApiResults(results) {
  if (Array.isArray(results?.word_counts) && results.word_counts.length) {
    return [...results.word_counts].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
  }
  return []
}
