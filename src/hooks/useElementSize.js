import { useEffect, useRef, useState } from 'react'

/**
 * Measure a container so charts get real width/height (avoids -1 sizing in flex layouts).
 * @param {number} fallbackMinHeight used only when the element still reports 0 height
 * @param {{ useExactHeight?: boolean }} [options] when true, never inflate height above the real box
 */
export function useElementSize(fallbackMinHeight = 280, options = {}) {
  const useExactHeight = Boolean(options.useExactHeight)
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const update = () => {
      const rect = element.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const measured = Math.floor(rect.height)
      const height = useExactHeight
        ? measured > 0
          ? measured
          : fallbackMinHeight
        : Math.max(fallbackMinHeight, measured)
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
  }, [fallbackMinHeight, useExactHeight])

  const ready = size.width > 0 && size.height > 0

  return { ref, width: size.width, height: size.height, ready }
}
