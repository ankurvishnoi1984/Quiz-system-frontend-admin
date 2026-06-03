import ExcelJS from 'exceljs'

function formatCorrect(value) {
  if (value == null) return '—'
  return value ? 'T' : 'F'
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

export async function exportPerParticipantExcel(report) {
  if (!report?.session) {
    throw new Error('Report data is missing')
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { width: 24 },
    { width: 18 },
    { width: 14 },
    { width: 12 },
    { width: 18 },
    { width: 18 },
  ]
  const summaryHeader = summarySheet.addRow([
    'Nickname',
    'Questions answered',
    'Correct count',
    'Total score',
    'Avg response time (s)',
    'Avg response time (ms)',
  ])
  styleHeaderRow(summarySheet, summaryHeader.number, 6)

  for (const row of report.summary_rows || []) {
    summarySheet.addRow([
      row.nickname,
      row.questions_answered,
      row.correct_count,
      row.total_score,
      row.avg_response_time_seconds ?? '—',
      row.avg_response_time_ms ?? '—',
    ])
  }

  const responsesSheet = workbook.addWorksheet('Responses')
  responsesSheet.columns = [
    { width: 24 },
    { width: 42 },
    { width: 36 },
    { width: 12 },
    { width: 14 },
    { width: 16 },
  ]
  const responsesHeader = responsesSheet.addRow([
    'Nickname',
    'Question text',
    'Answer',
    'Correct (T/F)',
    'Points earned',
    'Response time (ms)',
  ])
  styleHeaderRow(responsesSheet, responsesHeader.number, 6)

  for (const row of report.response_rows || []) {
    responsesSheet.addRow([
      row.nickname,
      row.question_text,
      row.answer,
      formatCorrect(row.is_correct),
      row.points_earned,
      row.response_time_ms ?? '—',
    ])
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `session-${report.session.session_id}-participant-report.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
