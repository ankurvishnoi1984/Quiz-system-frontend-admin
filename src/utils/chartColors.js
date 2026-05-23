export const CHART_COLORS = [
  '#4F46E5',
  '#0D9488',
  '#D97706',
  '#DB2777',
  '#7C3AED',
  '#0369A1',
  '#EA580C',
  '#059669',
]

export const TRUE_FALSE_CHART_COLORS = {
  true: '#059669',
  false: '#E11D48',
}

export const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  fontSize: 13,
}

export const RESPONSE_RATE_PIE_COLORS = {
  responded: '#4F46E5',
  empty: '#CBD5E1',
}

export function getChartColor(name, index, rawType) {
  if (rawType === 'true_false') {
    const key = String(name).trim().toLowerCase()
    if (key === 'true') return TRUE_FALSE_CHART_COLORS.true
    if (key === 'false') return TRUE_FALSE_CHART_COLORS.false
  }
  return CHART_COLORS[index % CHART_COLORS.length]
}
