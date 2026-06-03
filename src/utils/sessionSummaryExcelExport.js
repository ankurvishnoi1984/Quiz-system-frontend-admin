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

export async function exportSessionSummaryExcel(report) {
  if (!report?.session) {
    throw new Error('Report data is missing')
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [{ width: 28 }, { width: 40 }]

  let nextRow = addKeyValueRows(summarySheet, [
    ['Session title', report.session.title],
    ['Host', report.session.host_name],
    ['Department', report.session.department_name],
    ['Date', formatDateTime(report.session.date)],
    ['Duration', report.session.duration_label],
    ['Status', report.session.status],
    ['Total joined', report.summary.total_joined],
    ['Total responded', report.summary.total_responded],
    ['Avg engagement rate', `${report.summary.avg_engagement_rate_percent}%`],
    ['Questions activated', report.summary.total_questions_activated],
    ['Q&A asked', report.qa_summary.asked],
    ['Q&A approved', report.qa_summary.approved],
    ['Q&A answered', report.qa_summary.answered],
  ])

  if (report.quiz_stats?.has_quiz_mode) {
    nextRow = addKeyValueRows(
      summarySheet,
      [
        ['Top score', report.quiz_stats.top_score],
        ['Average score', report.quiz_stats.avg_score],
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

  for (const bucket of report.response_timeline || []) {
    const row = summarySheet.getRow(nextRow)
    row.getCell(1).value = bucket.bucket_label
    row.getCell(2).value = bucket.count
    nextRow += 1
  }

  const breakdownSheet = workbook.addWorksheet('Question Breakdown')
  breakdownSheet.columns = [
    { width: 10 },
    { width: 14 },
    { width: 42 },
    { width: 28 },
    { width: 10 },
    { width: 10 },
  ]
  const breakdownHeader = breakdownSheet.addRow([
    'Question #',
    'Type',
    'Question',
    'Option',
    'Count',
    'Percent',
  ])
  styleHeaderRow(breakdownSheet, breakdownHeader.number, 6)

  for (const question of report.question_breakdowns || []) {
    const options = question.options?.length
      ? question.options
      : [{ option_text: '—', count: 0, percent: 0 }]

    options.forEach((option, index) => {
      breakdownSheet.addRow([
        index === 0 ? question.question_index : '',
        index === 0 ? question.question_type : '',
        index === 0 ? question.question_text : '',
        option.option_text,
        option.count,
        option.percent != null ? `${option.percent}%` : '—',
      ])
    })
  }

  const qaSheet = workbook.addWorksheet('Q&A Log')
  qaSheet.columns = [{ width: 48 }, { width: 10 }, { width: 14 }, { width: 22 }, { width: 22 }]
  const qaHeader = qaSheet.addRow(['Question', 'Upvotes', 'Status', 'Submitted', 'Answered'])
  styleHeaderRow(qaSheet, qaHeader.number, 5)

  for (const row of report.qa_log || []) {
    qaSheet.addRow([
      row.question_text,
      row.upvotes,
      row.status,
      formatDateTime(row.created_at),
      formatDateTime(row.answered_at),
    ])
  }

  const participantsSheet = workbook.addWorksheet('Participants')
  participantsSheet.columns = [{ width: 28 }, { width: 18 }, { width: 12 }]
  const participantHeader = participantsSheet.addRow(['Nickname', 'Responses submitted', 'Score'])
  styleHeaderRow(participantsSheet, participantHeader.number, 3)

  for (const row of report.participant_summaries || []) {
    participantsSheet.addRow([row.nickname, row.responses_submitted, row.score])
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `session-${report.session.session_id}-summary-report.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
