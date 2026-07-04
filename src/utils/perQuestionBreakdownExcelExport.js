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
  return value ? 'Yes' : 'No'
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
    'Format',
    'Question',
    'Responses',
    'Response rate %',
    'Correct rate %',
    'Avg rating',
    'Avg time (s)',
  ])
  styleHeaderRow(summarySheet, summaryHeader.number, 9)

  for (const row of report.summary_rows || []) {
    summarySheet.addRow([
      row.question_index,
      row.question_type,
      row.type_label || row.chart_type || '—',
      row.question_text,
      row.response_count,
      row.response_rate_percent,
      row.is_survey ? '—' : row.correct_rate_percent != null ? row.correct_rate_percent : '—',
      row.average_rating ?? '—',
      row.avg_response_time_seconds != null ? row.avg_response_time_seconds : '—',
    ])
  }

  for (const question of report.questions || []) {
    const label = question.type_label || question.chart_type || question.question_type
    const sheet = workbook.addWorksheet(questionSheetName(question.question_index, label))
    sheet.columns = [{ width: 24 }, { width: 36 }, { width: 12 }, { width: 16 }, { width: 22 }]

    sheet.addRow(['Question', question.question_text])
    sheet.addRow(['Type', question.question_type])
    sheet.addRow(['Format', label])
    if (question.survey_subtype) {
      sheet.addRow(['Survey sub-type', question.survey_subtype])
    }
    sheet.addRow(['Responses', question.response_count])
    sheet.addRow(['Response rate %', question.response_rate_percent])
    if (!question.is_survey) {
      sheet.addRow(['Correct rate %', question.correct_rate_percent ?? '—'])
    }
    if (question.average_rating != null) {
      sheet.addRow(['Average rating', question.average_rating])
    }
    sheet.addRow(['Avg response time (s)', question.avg_response_time_seconds ?? '—'])
    sheet.addRow([])

    const responseColumns =
      question.is_survey || question.chart_type === 'emoji_reaction'
        ? ['Participant nickname', 'Answer', 'Response time (ms)', 'Submitted at']
        : ['Participant nickname', 'Answer', 'Correct', 'Response time (ms)', 'Submitted at']
    const header = sheet.addRow(responseColumns)
    styleHeaderRow(sheet, header.number, responseColumns.length)

    for (const response of question.responses || []) {
      const row =
        question.is_survey || question.chart_type === 'emoji_reaction'
          ? [
              response.nickname,
              response.answer,
              response.response_time_ms ?? '—',
              formatDateTime(response.submitted_at),
            ]
          : [
              response.nickname,
              response.answer,
              formatCorrect(response.is_correct),
              response.response_time_ms ?? '—',
              formatDateTime(response.submitted_at),
            ]
      sheet.addRow(row)
    }

    if (question.chart_type === 'emoji_reaction') {
      const distribution = new Map()
      for (const response of question.responses || []) {
        const emoji = String(response.answer || '').trim()
        if (!emoji) continue
        distribution.set(emoji, (distribution.get(emoji) || 0) + 1)
      }
      if (distribution.size) {
        sheet.addRow([])
        sheet.addRow(['Emoji summary'])
        const header = sheet.addRow(['Emoji', 'Count'])
        styleHeaderRow(sheet, header.number, 2)
        for (const [emoji, count] of distribution.entries()) {
          sheet.addRow([emoji, count])
        }
      }
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
