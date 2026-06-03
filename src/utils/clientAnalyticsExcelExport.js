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

function sheetNameFromDept(name, deptId) {
  return String(name || `Dept ${deptId}`)
    .slice(0, 28)
    .replace(/[*?:/\\[\]]/g, '-')
}

export async function exportClientAnalyticsExcel(report) {
  if (!report?.client) {
    throw new Error('Report data is missing')
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [{ width: 34 }, { width: 24 }]
  const { summary, date_range: dateRange } = report
  const hostUtil = summary.host_utilization

  ;[
    ['Client', report.client.name],
    ['Date from', formatDateTime(dateRange.from)],
    ['Date to', formatDateTime(dateRange.to)],
    ['Total sessions', summary.total_sessions],
    ['Total participants', summary.total_participants],
    ['Total departments', summary.total_departments],
    ['Departments with activity', summary.departments_with_activity],
    ['Active hosts', hostUtil.active_hosts],
    ['Total hosts', hostUtil.total_hosts],
    ['Host utilization %', hostUtil.utilization_percent],
  ].forEach(([label, value], index) => {
    const row = summarySheet.getRow(index + 1)
    row.getCell(1).value = label
    row.getCell(1).font = { bold: true }
    row.getCell(2).value = value ?? '—'
  })

  for (const dept of report.departments || []) {
    const sheet = workbook.addWorksheet(sheetNameFromDept(dept.dept_name, dept.dept_id))
    sheet.columns = [
      { width: 10 },
      { width: 36 },
      { width: 22 },
      { width: 22 },
      { width: 14 },
      { width: 14 },
      { width: 16 },
    ]
    const header = sheet.addRow([
      'Session ID',
      'Title',
      'Date',
      'Host',
      'Status',
      'Participants',
      'Engagement %',
    ])
    styleHeaderRow(sheet, header.number, 7)

    for (const row of dept.sessions || []) {
      sheet.addRow([
        row.session_id,
        row.title,
        formatDateTime(row.date),
        row.host_name,
        row.status,
        row.participant_count,
        row.engagement_rate_percent,
      ])
    }
  }

  const allSheet = workbook.addWorksheet('All Sessions')
  allSheet.columns = [
    { width: 10 },
    { width: 20 },
    { width: 36 },
    { width: 22 },
    { width: 22 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
  ]
  const allHeader = allSheet.addRow([
    'Session ID',
    'Department',
    'Title',
    'Date',
    'Host',
    'Status',
    'Participants',
    'Engagement %',
  ])
  styleHeaderRow(allSheet, allHeader.number, 8)

  for (const row of report.all_sessions || []) {
    allSheet.addRow([
      row.session_id,
      row.dept_name,
      row.title,
      formatDateTime(row.date),
      row.host_name,
      row.status,
      row.participant_count,
      row.engagement_rate_percent,
    ])
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `client-${report.client.client_id}-aggregated-report.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}
