export const SESSION_REPORT_EXPORTS = [
  {
    id: 'summary',
    label: 'Session Summary Report',
    description: 'Overview metrics, Q&A stats, quiz scores, timeline, and question response breakdown',
    format: 'xlsx',
  },
  // {
  //   id: 'question-breakdown',
  //   label: 'Per-Question Breakdown Report',
  //   description: 'One sheet per question with participant answers, plus a summary sheet',
  //   format: 'xlsx',
  // },
  {
    id: 'participants',
    label: 'Participant Report',
    description: 'Summary per participant plus a responses sheet for HR/training review',
    format: 'xlsx',
  },
  // {
  //   id: 'qa',
  //   label: 'Q&A Analytics Report',
  //   description: 'Full Q&A log including rejected questions, sorted by upvotes',
  //   format: 'xlsx',
  // },
  // {
  //   id: 'raw-responses',
  //   label: 'Raw responses',
  //   description: 'Flat CSV export of every participant response',
  //   format: 'csv',
  // },
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
  {
    id: 'qa-analytics',
    label: 'Q&A Analytics',
  },
]
