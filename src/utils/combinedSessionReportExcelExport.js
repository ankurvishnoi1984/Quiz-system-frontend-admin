import ExcelJS from 'exceljs'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function addKeyValueRows(sheet, rows, startRow = 1) {
  rows.forEach(([label, value], index) => {
    const row = sheet.getRow(startRow + index)
    row.getCell(1).value = label
    row.getCell(1).font = { bold: true }
    row.getCell(2).value = value ?? '—'
  })
  return startRow + rows.length
}

function styleHeaderRow(sheet, rowNumber, columnCount) {
  const row = sheet.getRow(rowNumber)
  row.font = { bold: true }
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EEF7' },
  }
  for (let col = 1; col <= columnCount; col += 1) {
    row.getCell(col).border = {
      bottom: { style: 'thin', color: { argb: 'FFB8C4DC' } },
    }
  }
}

function addBreakdownSection(sheet, title, questions, startRow) {
  sheet.getRow(startRow).getCell(1).value = title
  sheet.getRow(startRow).getCell(1).font = { bold: true, size: 12 }
  let row = startRow + 1
  const header = sheet.getRow(row)
  header.getCell(1).value = 'Question #'
  header.getCell(2).value = 'Format'
  header.getCell(3).value = 'Question'
  header.getCell(4).value = 'Item'
  header.getCell(5).value = 'Count'
  header.getCell(6).value = 'Percent'
  styleHeaderRow(sheet, row, 6)
  row += 1

  for (const question of questions || []) {
    const options = question.options?.length
      ? question.options
      : [{ option_text: '—', count: 0, percent: 0 }]
    options.forEach((option, index) => {
      const dataRow = sheet.getRow(row)
      dataRow.getCell(1).value = index === 0 ? question.question_index : ''
      dataRow.getCell(2).value = index === 0 ? question.type_label || question.chart_type : ''
      dataRow.getCell(3).value = index === 0 ? question.question_text : ''
      dataRow.getCell(4).value = option.option_text
      dataRow.getCell(5).value = option.count
      dataRow.getCell(6).value = option.percent != null ? `${option.percent}%` : '—'
      row += 1
    })
  }
  return row + 1
}

const RAW_RESPONSE_COLUMNS = [
  'sessionId',
  'sessionTitle',
  'questionIndex',
  'questionType',
  'survey_sub_type',
  'questionText',
  'participant',
  'response',
  'points',
  'Correct',
]

const EMOJI_SUMMARY_COLUMNS = [
  'sessionId',
  'sessionTitle',
  'questionIndex',
  'questionText',
  'emoji_1',
  'emoji_2',
  'emoji_3',
  'emoji_4',
  'emoji_5',
  'count_1',
  'count_2',
  'count_3',
  'count_4',
  'count_5',
]

function downloadWorkbook(workbook, filename) {
  return workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  })
}

/**
 * Combined Session Summary + Participant report (single Excel download).
 * Sheets: Summary, Question Summary, Participants, Responses
 */
export async function exportCombinedSessionReportExcel({
  summaryReport,
  participantsReport,
  showScore = true,
  rawResponseRows = [],
  emojiSummaryRows = [],
} = {}) {
  if (!summaryReport?.session) {
    throw new Error('Report data is missing')
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [{ width: 28 }, { width: 40 }]

  let nextRow = addKeyValueRows(summarySheet, [
    ['Session title', summaryReport.session.title],
    ['Host', summaryReport.session.host_name],
    ['Department', summaryReport.session.department_name],
    ['Date', formatDateTime(summaryReport.session.date)],
    ['Duration', summaryReport.session.duration_label],
    ['Status', summaryReport.session.status],
    ['Total joined', summaryReport.summary.total_joined],
    ['Total responded', summaryReport.summary.total_responded],
    ['Avg engagement rate', `${summaryReport.summary.avg_engagement_rate_percent}%`],
    ['Questions activated', summaryReport.summary.total_questions_activated],
    ['Q&A asked', summaryReport.qa_summary.asked],
    ['Q&A approved', summaryReport.qa_summary.approved],
    ['Q&A answered', summaryReport.qa_summary.answered],
  ])

  if (summaryReport.quiz_stats?.has_quiz_mode) {
    nextRow = addKeyValueRows(
      summarySheet,
      [
        ['Top score', summaryReport.quiz_stats.top_score],
        ['Average score', summaryReport.quiz_stats.avg_score],
      ],
      nextRow + 1,
    )
  }

  nextRow += 2
  summarySheet.getRow(nextRow).getCell(1).value = 'Response timeline'
  summarySheet.getRow(nextRow).getCell(1).font = { bold: true, size: 12 }
  nextRow += 1

  const timelineHeader = summarySheet.getRow(nextRow)
  timelineHeader.getCell(1).value = 'Time bucket'
  timelineHeader.getCell(2).value = 'Responses'
  styleHeaderRow(summarySheet, nextRow, 2)
  nextRow += 1

  for (const bucket of summaryReport.response_timeline || []) {
    const row = summarySheet.getRow(nextRow)
    row.getCell(1).value = bucket.bucket_label
    row.getCell(2).value = bucket.count
    nextRow += 1
  }

  const questionBreakdowns = [
    ...(summaryReport.survey_question_breakdowns || []),
    ...(summaryReport.standalone_question_breakdowns || []),
  ].sort((a, b) => Number(a.question_index || 0) - Number(b.question_index || 0))

  const questionSheet = workbook.addWorksheet('Question Summary')
  questionSheet.columns = [
    { width: 10 },
    { width: 18 },
    { width: 42 },
    { width: 28 },
    { width: 10 },
    { width: 10 },
  ]
  addBreakdownSection(questionSheet, 'Question Summary', questionBreakdowns, 1)

  // Richer participant summary (from participant report). Replaces the older
  // summary-only Participants sheet (nickname / responses / score).
  const participantsSheet = workbook.addWorksheet('Participants')
  participantsSheet.columns = showScore
    ? [
        { width: 24 },
        { width: 18 },
        { width: 14 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
      ]
    : [
        { width: 24 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
      ]
  const participantColumns = showScore
    ? [
        'Nickname',
        'Questions answered',
        'Correct count',
        'Total score',
        'Avg response time (s)',
        'Avg response time (ms)',
      ]
    : [
        'Nickname',
        'Questions answered',
        'Avg response time (s)',
        'Avg response time (ms)',
      ]
  const participantHeader = participantsSheet.addRow(participantColumns)
  styleHeaderRow(participantsSheet, participantHeader.number, participantColumns.length)

  const participantRows =
    participantsReport?.summary_rows ||
    (summaryReport.participant_summaries || []).map((row) => ({
      nickname: row.nickname,
      questions_answered: row.responses_submitted,
      correct_count: null,
      total_score: row.score,
      avg_response_time_seconds: null,
      avg_response_time_ms: null,
    }))

  for (const row of participantRows) {
    participantsSheet.addRow(
      showScore
        ? [
            row.nickname,
            row.questions_answered,
            row.correct_count ?? '—',
            row.total_score ?? '—',
            row.avg_response_time_seconds ?? '—',
            row.avg_response_time_ms ?? '—',
          ]
        : [
            row.nickname,
            row.questions_answered,
            row.avg_response_time_seconds ?? '—',
            row.avg_response_time_ms ?? '—',
          ],
    )
  }

  const rawSheet = workbook.addWorksheet('Responses')
  rawSheet.columns = RAW_RESPONSE_COLUMNS.map((header) => ({
    width: header === 'questionText' || header === 'response' ? 42 : header === 'sessionTitle' ? 28 : 16,
  }))
  const rawHeader = rawSheet.addRow(RAW_RESPONSE_COLUMNS)
  styleHeaderRow(rawSheet, rawHeader.number, RAW_RESPONSE_COLUMNS.length)

  for (const row of rawResponseRows) {
    rawSheet.addRow(row)
  }

  if (emojiSummaryRows.length) {
    rawSheet.addRow([])
    const emojiHeader = rawSheet.addRow(EMOJI_SUMMARY_COLUMNS)
    styleHeaderRow(rawSheet, emojiHeader.number, EMOJI_SUMMARY_COLUMNS.length)
    for (const row of emojiSummaryRows) {
      rawSheet.addRow(row)
    }
  }

  const sessionId =
    summaryReport.session.session_id ||
    participantsReport?.session?.session_id ||
    'session'
  await downloadWorkbook(workbook, `session-${sessionId}-report.xlsx`)
}
