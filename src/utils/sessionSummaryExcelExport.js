import ExcelJS from 'exceljs'

/** Standalone Session Summary export — kept for restore if reports are split again. */
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

  const questionBreakdowns = [
    ...(report.survey_question_breakdowns || []),
    ...(report.standalone_question_breakdowns || []),
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
