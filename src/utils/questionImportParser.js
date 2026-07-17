import ExcelJS from 'exceljs'

const MAX_IMPORT_ROWS = 500
const MAX_FILE_BYTES = 5 * 1024 * 1024
const OPTION_COLUMNS = Array.from({ length: 10 }, (_, index) => `option_${index + 1}`)
const ALLOWED_TYPES = new Set([
  'mcq',
  'poll',
  'survey',
  'word_cloud',
  'rating',
  'open_text',
  'true_false',
  'ranking',
  'emoji_reaction',
])
const ALLOWED_SURVEY_SUBTYPES = new Set([
  'mcq',
  'poll',
  'rating',
  'open_text',
  'word_cloud',
  'ranking',
  'true_false',
  'emoji_reaction',
])

function cellText(value) {
  if (value == null) return ''
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('').trim()
    }
    if (value.text != null) return String(value.text).trim()
    if (value.result != null) return String(value.result).trim()
    if (value.hyperlink != null) return String(value.text || value.hyperlink).trim()
  }
  return String(value).trim()
}

function normalizeHeader(value) {
  return cellText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeType(value) {
  const normalized = cellText(value)
    .toLowerCase()
    .replaceAll('/', '_')
    .replace(/[\s-]+/g, '_')
  const aliases = {
    multiple_choice: 'mcq',
    multiple_choice_mcq: 'mcq',
    text: 'open_text',
    open_ended: 'open_text',
    wordcloud: 'word_cloud',
    truefalse: 'true_false',
    emoji: 'emoji_reaction',
  }
  return aliases[normalized] || normalized
}

function optionalNumber(value) {
  const text = cellText(value)
  if (!text) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

function booleanValue(value, fallback = false) {
  const normalized = cellText(value).toLowerCase()
  if (!normalized) return fallback
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true
  if (['false', 'no', 'n', '0'].includes(normalized)) return false
  return fallback
}

function correctOptionIndexes(value) {
  return new Set(
    cellText(value)
      .split(/[,\s;|]+/)
      .map(Number)
      .filter((number) => Number.isInteger(number) && number > 0),
  )
}

function inferMediaType(url) {
  const normalized = String(url || '').toLowerCase().split('?')[0]
  if (!normalized) return null
  if (/\.(gif)$/.test(normalized)) return 'gif'
  if (/\.(png|jpe?g|webp|svg)$/.test(normalized)) return 'image'
  if (/\.(mp3|wav|ogg|m4a|aac)$/.test(normalized)) return 'audio_file'
  if (/\.(mp4|webm|mov|m4v)$/.test(normalized)) return 'video_file'
  if (/youtu\.?be|youtube\.com|vimeo\.com/.test(normalized)) return 'video_embed'
  return null
}

function usesOptions(type, subtype) {
  const effectiveType = type === 'survey' ? subtype : type
  return ['mcq', 'poll', 'true_false', 'ranking', 'emoji_reaction'].includes(effectiveType)
}

function parseRow(values, rowNumber) {
  const questionType = normalizeType(values.question_type)
  const surveySubtype = questionType === 'survey' ? normalizeType(values.survey_subtype) : null
  const questionText = cellText(values.question_text)
  const nonScored = ['poll', 'survey', 'emoji_reaction'].includes(questionType)
  const correctIndexes = correctOptionIndexes(values.correct_option)
  const mediaUrl = cellText(values.media_url) || null
  const optionTexts = OPTION_COLUMNS.map((column) => cellText(values[column])).filter(Boolean)
  const options = usesOptions(questionType, surveySubtype)
    ? optionTexts.map((optionText, index) => ({
        option_text: optionText,
        is_correct: nonScored ? false : correctIndexes.has(index + 1),
        display_order: index + 1,
      }))
    : []

  const payload = {
    question_type: questionType,
    survey_subtype: surveySubtype,
    question_text: questionText,
    options,
    is_quiz_mode: nonScored ? false : true,
    points_value: nonScored
      ? 0
      : Math.max(0, Math.round(optionalNumber(values.points_value) ?? 10)),
    time_limit_seconds:
      questionType === 'survey'
        ? null
        : Math.max(0, Math.round(optionalNumber(values.time_limit_seconds) ?? 0)) || null,
    allow_multiple_select:
      questionType === 'survey' && ['mcq', 'poll'].includes(surveySubtype)
        ? booleanValue(values.allow_multiple_select)
        : false,
    rating_min: Math.round(optionalNumber(values.rating_min) ?? 1),
    rating_max: Math.round(optionalNumber(values.rating_max) ?? 10),
    rating_min_label: cellText(values.rating_min_label) || null,
    rating_max_label: cellText(values.rating_max_label) || null,
    media_url: mediaUrl,
    media_type: mediaUrl ? inferMediaType(mediaUrl) : null,
    display_order: Math.max(
      1,
      Math.round(optionalNumber(values.question_number) ?? rowNumber - 1),
    ),
  }

  const errors = []
  if (!ALLOWED_TYPES.has(questionType)) {
    errors.push(`question_type "${questionType || '(blank)'}" is not supported`)
  }
  if (!questionText) errors.push('question_text is required')
  if (
    questionType === 'survey' &&
    (!surveySubtype || !ALLOWED_SURVEY_SUBTYPES.has(surveySubtype))
  ) {
    errors.push('survey_subtype is required and must be supported')
  }
  if (mediaUrl && !payload.media_type) {
    errors.push('media_url format is not supported')
  }
  if (payload.rating_min >= payload.rating_max) {
    errors.push('rating_min must be less than rating_max')
  }
  if (payload.is_quiz_mode && ['mcq', 'true_false'].includes(questionType)) {
    if (correctIndexes.size !== 1) {
      errors.push('correct_option must contain exactly one option number')
    } else if ([...correctIndexes].some((index) => index > options.length)) {
      errors.push('correct_option points to a missing option')
    }
  }

  return {
    row: rowNumber,
    question_number: payload.display_order,
    question_text: questionText,
    question_type: questionType,
    survey_subtype: surveySubtype,
    valid: errors.length === 0,
    errors,
    payload,
  }
}

export async function parseQuestionImportFile(file) {
  if (!file) throw new Error('Choose an Excel workbook.')
  if (!file.name?.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Only .xlsx Excel files are supported.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Excel file size exceeds the 5MB limit.')
  }

  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new Error('The workbook could not be read. Download a fresh template and try again.')
  }

  const worksheet = workbook.getWorksheet('Questions') || workbook.worksheets[0]
  if (!worksheet) throw new Error('Workbook must contain a Questions sheet.')

  const headers = new Map()
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const header = normalizeHeader(cell.value)
    if (header) headers.set(columnNumber, header)
  })
  if (![...headers.values()].includes('question_text')) {
    throw new Error('Questions sheet must include a question_text column.')
  }

  const rows = []
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const values = {}
    headers.forEach((header, columnNumber) => {
      values[header] = row.getCell(columnNumber).value
    })
    if (!Object.values(values).some((value) => cellText(value))) continue
    rows.push(parseRow(values, rowNumber))
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new Error(`A workbook can contain at most ${MAX_IMPORT_ROWS} questions.`)
    }
  }
  if (!rows.length) throw new Error('No question rows were found in the workbook.')

  return rows.sort(
    (a, b) => Number(a.question_number || a.row) - Number(b.question_number || b.row),
  )
}

