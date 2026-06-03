import ExcelJS from 'exceljs'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
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

function questionSheetName(index, type) {
  return `Q${index} ${type}`.slice(0, 31).replace(/[*?:/\\[\]]/g, '-')
}

function formatCorrect(value) {
  if (value == null) return '—'
  return value ? 'T' : 'F'
}

export async function exportPerQuestionBreakdownExcel(report) {
  if (!report?.session) {
    throw new Error('Report data is missing')
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { width: 8 },
    { width: 14 },
    { width: 42 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
  ]
  const summaryHeader = summarySheet.addRow([
    '#',
    'Type',
    'Question',
    'Responses',
    'Response rate %',
    'Correct rate %',
    'Avg time (s)',
  ])
  styleHeaderRow(summarySheet, summaryHeader.number, 7)

  for (const row of report.summary_rows || []) {
    summarySheet.addRow([
      row.question_index,
      row.question_type,
      row.question_text,
      row.response_count,
      row.response_rate_percent,
      row.correct_rate_percent != null ? row.correct_rate_percent : '—',
      row.avg_response_time_seconds != null ? row.avg_response_time_seconds : '—',
    ])
  }

  for (const question of report.questions || []) {
    const sheet = workbook.addWorksheet(questionSheetName(question.question_index, question.question_type))
    sheet.columns = [{ width: 24 }, { width: 36 }, { width: 12 }, { width: 16 }, { width: 22 }]

    sheet.addRow(['Question', question.question_text])
    sheet.addRow(['Type', question.question_type])
    sheet.addRow(['Responses', question.response_count])
    sheet.addRow(['Response rate %', question.response_rate_percent])
    sheet.addRow(['Correct rate %', question.correct_rate_percent ?? '—'])
    sheet.addRow(['Avg response time (s)', question.avg_response_time_seconds ?? '—'])
    sheet.addRow([])

    const header = sheet.addRow([
      'Participant nickname',
      'Answer',
      'Correct (T/F)',
      'Response time (ms)',
      'Submitted at',
    ])
    styleHeaderRow(sheet, header.number, 5)

    for (const response of question.responses || []) {
      sheet.addRow([
        response.nickname,
        response.answer,
        formatCorrect(response.is_correct),
        response.response_time_ms ?? '—',
        formatDateTime(response.submitted_at),
      ])
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `session-${report.session.session_id}-question-breakdown.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
