import ExcelJS from 'exceljs'

function formatCorrect(value) {
  if (value == null) return '—'
  return value ? 'Yes' : 'No'
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

export async function exportPerParticipantExcel(report, { showScore = true } = {}) {
  if (!report?.session) {
    throw new Error('Report data is missing')
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = showScore
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
  const summaryColumns = showScore
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
  const summaryHeader = summarySheet.addRow(summaryColumns)
  styleHeaderRow(summarySheet, summaryHeader.number, summaryColumns.length)

  for (const row of report.summary_rows || []) {
    summarySheet.addRow(
      showScore
        ? [
            row.nickname,
            row.questions_answered,
            row.correct_count,
            row.total_score,
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

  const responsesSheet = workbook.addWorksheet('Responses')
  responsesSheet.columns = showScore
    ? [
        { width: 24 },
        { width: 42 },
        { width: 36 },
        { width: 12 },
        { width: 14 },
        { width: 16 },
      ]
    : [
        { width: 24 },
        { width: 42 },
        { width: 36 },
        { width: 16 },
      ]
  const responsesColumns = showScore
    ? ['Nickname', 'Question text', 'Answer', 'Correct', 'Points earned', 'Response time (ms)']
    : ['Nickname', 'Question text', 'Answer', 'Response time (ms)']
  const responsesHeader = responsesSheet.addRow(responsesColumns)
  styleHeaderRow(responsesSheet, responsesHeader.number, responsesColumns.length)

  for (const row of report.response_rows || []) {
    responsesSheet.addRow(
      showScore
        ? [
            row.nickname,
            row.question_text,
            row.answer,
            formatCorrect(row.is_correct),
            row.points_earned,
            row.response_time_ms ?? '—',
          ]
        : [
            row.nickname,
            row.question_text,
            row.answer,
            row.response_time_ms ?? '—',
          ],
    )
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
