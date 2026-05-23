import { useEffect, useRef, useState } from 'react'

/**
 * Measure a container so Recharts gets real width/height (avoids -1 sizing in flex layouts).
 */
export function useElementSize(minHeight = 280) {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const update = () => {
      const rect = element.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.max(minHeight, Math.floor(rect.height))
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      )
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [minHeight])

  const ready = size.width > 0 && size.height > 0

  return { ref, width: size.width, height: size.height, ready }
}
