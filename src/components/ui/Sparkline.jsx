function Sparkline({ points, stroke = '#2563eb' }) {
  const width = 92
  const height = 26
  const pad = 2

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = Math.max(1, max - min)

  const d = points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * (width - pad * 2) + pad
      const y = height - ((value - min) / range) * (height - pad * 2) - pad
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={d} />
    </svg>
  )
}

export default Sparkline

