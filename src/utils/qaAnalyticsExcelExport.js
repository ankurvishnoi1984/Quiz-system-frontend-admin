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

export async function exportQaAnalyticsExcel(report) {
  if (!report?.session) {
    throw new Error('Report data is missing')
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [{ width: 28 }, { width: 40 }]
  summarySheet.addRow(['Session', report.session.title])
  summarySheet.addRow(['Total asked', report.summary.total_asked])
  summarySheet.addRow(['Approval rate %', report.summary.approval_rate_percent])
  summarySheet.addRow(['Unanswered', report.summary.unanswered_count])
  summarySheet.addRow(['Anonymous submissions', report.submission_ratio.anonymous])
  summarySheet.addRow(['Named submissions', report.submission_ratio.named])
  summarySheet.addRow([])

  const logSheet = workbook.addWorksheet('Q&A Log')
  logSheet.columns = [
    { width: 48 },
    { width: 24 },
    { width: 10 },
    { width: 14 },
    { width: 22 },
    { width: 22 },
  ]
  const header = logSheet.addRow([
    'Question text',
    'Submitter',
    'Upvotes',
    'Status',
    'Submitted at',
    'Answered at',
  ])
  styleHeaderRow(logSheet, header.number, 6)

  for (const row of report.qa_log || []) {
    logSheet.addRow([
      row.question_text,
      row.submitter,
      row.upvotes,
      row.status,
      formatDateTime(row.submitted_at),
      formatDateTime(row.answered_at),
    ])
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `session-${report.session.session_id}-qa-analytics.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
