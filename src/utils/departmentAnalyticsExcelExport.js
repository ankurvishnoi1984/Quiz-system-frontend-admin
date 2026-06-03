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

export async function exportDepartmentAnalyticsExcel(report) {
  if (!report?.department) {
    throw new Error('Report data is missing')
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [{ width: 32 }, { width: 24 }]
  const { summary, date_range: dateRange, most_active_host: host } = report

  const summaryRows = [
    ['Department', report.department.name],
    ['Date from', formatDateTime(dateRange.from)],
    ['Date to', formatDateTime(dateRange.to)],
    ['Total sessions', summary.total_sessions],
    ['Total participants', summary.total_participants],
    ['Avg engagement rate %', summary.avg_engagement_rate_percent],
    ['Sessions trend %', summary.sessions_trend_percent],
    ['Participants trend %', summary.participants_trend_percent],
    ['Engagement trend (pts)', summary.engagement_trend_percent],
    ['Most active host', host ? `${host.host_name} (${host.session_count} sessions)` : '—'],
  ]

  summaryRows.forEach(([label, value], index) => {
    const row = summarySheet.getRow(index + 1)
    row.getCell(1).value = label
    row.getCell(1).font = { bold: true }
    row.getCell(2).value = value ?? '—'
  })

  const sessionsSheet = workbook.addWorksheet('Sessions')
  sessionsSheet.columns = [
    { width: 10 },
    { width: 36 },
    { width: 22 },
    { width: 22 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
  ]
  const sessionsHeader = sessionsSheet.addRow([
    'Session ID',
    'Title',
    'Date',
    'Host',
    'Status',
    'Participants',
    'Engagement %',
  ])
  styleHeaderRow(sessionsSheet, sessionsHeader.number, 7)

  for (const row of report.sessions || []) {
    sessionsSheet.addRow([
      row.session_id,
      row.title,
      formatDateTime(row.date),
      row.host_name,
      row.status,
      row.participant_count,
      row.engagement_rate_percent,
    ])
  }

  const responsesSheet = workbook.addWorksheet('Responses')
  responsesSheet.columns = [
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 40 },
    { width: 22 },
  ]
  const responsesHeader = responsesSheet.addRow([
    'Session ID',
    'Question ID',
    'Participant ID',
    'Answer',
    'Submitted at',
  ])
  styleHeaderRow(responsesSheet, responsesHeader.number, 5)

  for (const row of report.response_rows || []) {
    responsesSheet.addRow([
      row.session_id,
      row.question_id,
      row.participant_id,
      row.answer,
      formatDateTime(row.submitted_at),
    ])
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `dept-${report.department.dept_id}-analytics-report.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
