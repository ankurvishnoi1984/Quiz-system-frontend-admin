export const SESSION_REPORT_EXPORTS = [
  {
    id: 'summary',
    label: 'Session Summary Report',
    description: 'Overview metrics, Q&A stats, quiz scores, timeline, and detailed breakdown sheets',
    format: 'xlsx',
  },
  {
    id: 'question-breakdown',
    label: 'Per-Question Breakdown Report',
    description: 'One sheet per question with participant answers, plus a summary sheet',
    format: 'xlsx',
  },
  {
    id: 'raw-responses',
    label: 'Raw responses',
    description: 'Flat CSV export of every participant response',
    format: 'csv',
  },
]

export const SESSION_REPORT_VIEWS = [
  {
    id: 'summary',
    label: 'Session Summary',
  },
  {
    id: 'question-breakdown',
    label: 'Question Breakdown',
  },
]
