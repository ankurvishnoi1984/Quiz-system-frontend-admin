import ExcelJS from 'exceljs'
import { formatQuizSubmitTimeParticipant } from './quizResponseTime'

/** Standalone Per-Participant export — kept for restore if reports are split again. */
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

export async function exportPerParticipantExcel(
  report,
  { showScore = true, rawResponseRows = [], emojiSummaryRows = [] } = {},
) {
  if (!report?.session) {
    throw new Error('Report data is missing')
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = showScore
    ? [
        { width: 8 },
        { width: 24 },
        { width: 18 },
        { width: 14 },
        { width: 12 },
        { width: 22 },
      ]
    : [
        { width: 8 },
        { width: 24 },
        { width: 18 },
        { width: 22 },
      ]
  const summaryColumns = showScore
    ? [
        'Rank',
        'Nickname',
        'Questions answered',
        'Correct count',
        'Total score',
        'Avg response time',
      ]
    : [
        'Rank',
        'Nickname',
        'Questions answered',
        'Avg response time',
      ]
  const summaryHeader = summarySheet.addRow(summaryColumns)
  styleHeaderRow(summarySheet, summaryHeader.number, summaryColumns.length)

  const sortedRows = [...(report.summary_rows || [])].sort((a, b) => {
    if (showScore) {
      const scoreDiff = Number(b.total_score || 0) - Number(a.total_score || 0)
      if (scoreDiff !== 0) return scoreDiff
      const correctDiff = Number(b.correct_count || 0) - Number(a.correct_count || 0)
      if (correctDiff !== 0) return correctDiff
    }
    const answeredDiff = Number(b.questions_answered || 0) - Number(a.questions_answered || 0)
    if (answeredDiff !== 0) return answeredDiff
    const aTime =
      a.avg_response_time_ms != null ? Number(a.avg_response_time_ms) : Number.POSITIVE_INFINITY
    const bTime =
      b.avg_response_time_ms != null ? Number(b.avg_response_time_ms) : Number.POSITIVE_INFINITY
    if (aTime !== bTime) return aTime - bTime
    return String(a.nickname || '').localeCompare(String(b.nickname || ''))
  })

  sortedRows.forEach((row, index) => {
    const avgTimeLabel = formatQuizSubmitTimeParticipant(row.avg_response_time_ms)
    summarySheet.addRow(
      showScore
        ? [
            index + 1,
            row.nickname,
            row.questions_answered,
            row.correct_count,
            row.total_score,
            avgTimeLabel,
          ]
        : [
            index + 1,
            row.nickname,
            row.questions_answered,
            avgTimeLabel,
          ],
    )
  })

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
