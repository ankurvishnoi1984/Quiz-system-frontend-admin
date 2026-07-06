import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Eye,
  EyeOff,
  GripVertical,
  ListChecks,
  MessageSquareText,
  Pencil,
  Plus,
  Smile,
  Star,
  Trophy,
  Trash2,
  Vote,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HostQuestionActionButton } from '../components/live/HostQuestionActionButton'
import { QuestionMediaUpload } from '../components/builder/QuestionMediaUpload'
import { QuestionMedia } from '../components/participant-session/QuestionMedia'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'
import {
  createQuestionApi,
  deleteQuestionApi,
  getSessionDetailApi,
  listSessionQuestionsApi,
  reorderQuestionsApi,
  updateQuestionApi,
  updateSessionApi,
} from '../services/builderApi'
import { setQuestionAnswerRevealedApi, setQuestionLeaderboardVisibleApi } from '../services/liveApi'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'
import {
  buildQuestionMediaPayload,
  mapApiMediaToQuestionMedia,
} from '../utils/questionMedia'
import { questionSupportsAnswerReveal } from '../utils/answerReveal'
import { HostNoSessionsEmpty } from '../components/layout/HostNoSessionsEmpty'
import { EmojiReactionEditor } from '../components/builder/EmojiReactionEditor'
import { createDefaultEmojiReactionOptions } from '../utils/emojiReaction'
import { useHostNavSessions, getLatestSessionId } from '../hooks/useHostNavSessions'
import { useShell } from '../context/ShellContext'

function InlineEditableSessionTitle({ title, onSave, isSaving }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!editing) setDraft(title)
  }, [title, editing])

  useEffect(() => {
    if (!editing || !inputRef.current) return
    inputRef.current.focus()
    inputRef.current.select()
  }, [editing])

  const cancel = () => {
    setDraft(title)
    setEditing(false)
  }

  const commit = () => {
    const trimmed = draft.trim()
    setEditing(false)
    if (!trimmed || trimmed === title) return
    onSave(trimmed)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        disabled={isSaving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
        className="mt-1 w-full min-w-[12rem] max-w-2xl border-0 border-b border-blue-300/70 bg-transparent px-0 py-0.5 text-2xl font-bold text-navy-900 outline-none ring-0 placeholder:text-slate-400 focus:border-blue-500 disabled:opacity-60"
        aria-label="Session name"
        maxLength={255}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={isSaving}
      className="group mt-1 flex max-w-full cursor-text items-center gap-2 rounded-lg text-left transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Edit session name"
    >
      <span className="text-2xl font-bold text-navy-900">{title || 'Untitled session'}</span>
      <Pencil
        className="size-4 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </button>
  )
}

const QUESTION_TYPES = [
  { type: 'MCQ', icon: ListChecks, description: 'Multiple choice with options' },
  { type: 'Poll', icon: Vote, description: 'Opinion poll — no right or wrong answers' },
  { type: 'Survey', icon: ClipboardList, description: 'Multi-question survey — mix formats, no timer' },
  { type: 'Word Cloud', icon: Cloud, description: 'Collect words, show cloud' },
  { type: 'Emoji Reaction', icon: Smile, description: 'Quick emoji reactions — no scoring' },
  { type: 'Rating', icon: Star, description: '1–10 rating scale' },
  { type: 'Text', icon: MessageSquareText, description: 'Open-ended response' },
  { type: 'True/False', icon: BadgeCheck, description: 'Binary choice' },
  { type: 'Ranking', icon: BarChart3, description: 'Rank items by preference' },
]

const SURVEY_SUB_TYPES = [
  { id: 'MCQ', label: 'Multiple Choice (MCQ)' },
  { id: 'Poll', label: 'Poll' },
  { id: 'Rating', label: 'Rating' },
  { id: 'Word Cloud', label: 'Word Cloud' },
  { id: 'Text', label: 'Open Text' },
  { id: 'Ranking', label: 'Ranking' },
]

function surveySubTypeLabel(subType) {
  return SURVEY_SUB_TYPES.find((item) => item.id === subType)?.label || subType || 'Multiple Choice (MCQ)'
}

function isSurveyQuestionType(type) {
  return type === 'Survey'
}

function surveySubTypeUsesOptions(subType) {
  return subType === 'MCQ' || subType === 'Poll' || subType === 'Ranking'
}

function defaultOptionsForSurveySubType(subType) {
  if (subType === 'MCQ' || subType === 'Poll' || subType === 'Ranking') {
    return [
      { id: uid('opt'), optionId: null, text: 'Option 1', isCorrect: false },
      { id: uid('opt'), optionId: null, text: 'Option 2', isCorrect: false },
    ]
  }
  return []
}

const DEFAULT_RATING_MIN = 1
const DEFAULT_RATING_MAX = 10

function createRatingQuestionDefaults() {
  return {
    ratingMin: DEFAULT_RATING_MIN,
    ratingMax: DEFAULT_RATING_MAX,
    ratingMinLabel: '',
    ratingMaxLabel: '',
  }
}

function createSurveyQuestionDefaults(surveySubType = 'MCQ') {
  return {
    surveySubType,
    allowMultipleSelect: false,
    ...createRatingQuestionDefaults(),
    options: defaultOptionsForSurveySubType(surveySubType),
  }
}

function apiSurveySubTypeToUi(subType) {
  const mapping = {
    mcq: 'MCQ',
    poll: 'Poll',
    rating: 'Rating',
    open_text: 'Text',
    word_cloud: 'Word Cloud',
    ranking: 'Ranking',
  }
  return mapping[subType] || 'MCQ'
}

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function normalizeTimeLimitSeconds(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function timeLimitSecondsToMode(seconds) {
  const n = normalizeTimeLimitSeconds(seconds)
  if (n === 0) return 'Off'
  if (n === 15) return '15s'
  if (n === 30) return '30s'
  if (n === 60) return '60s'
  if (n === 120) return '120s'
  return 'Custom'
}

function timeLimitModeToSeconds(mode, customTime) {
  if (mode === 'Off') return 0
  if (mode === '15s') return 15
  if (mode === '30s') return 30
  if (mode === '60s') return 60
  if (mode === '120s') return 120
  return Math.max(1, Number(customTime || 1))
}

function areAllQuestionsUntimed(questions) {
  return (questions || []).every((q) => normalizeTimeLimitSeconds(q.timeLimitSeconds) === 0)
}

function resolveDefaultTimeLimitForNewQuestion(questions) {
  if (!questions.length) return 0
  if (areAllQuestionsUntimed(questions)) return 0
  const limits = questions.map((q) => normalizeTimeLimitSeconds(q.timeLimitSeconds))
  const unique = new Set(limits)
  if (unique.size === 1) return limits[0]
  return 0
}

function isSessionQuizTotalTimeEnabled(sessionData) {
  if (!sessionData) return false
  const minutes = Number(sessionData.quiz_total_time_minutes)
  return (
    sessionData.participant_navigation_enabled !== false &&
    Number.isFinite(minutes) &&
    minutes > 0
  )
}

function createTrueFalseOptions(correctIsTrue = true) {
  return [
    { id: uid('opt'), optionId: null, text: 'True', isCorrect: correctIsTrue },
    { id: uid('opt'), optionId: null, text: 'False', isCorrect: !correctIsTrue },
  ]
}

function normalizeTrueFalseOptions(apiOptions = []) {
  const byKey = {}
  for (const o of apiOptions || []) {
    const key = String(o.option_text || '').trim().toLowerCase()
    if (key === 'true' || key === 'false') byKey[key] = o
  }
  const trueRow = byKey.true
  const falseRow = byKey.false
  return [
    {
      id: trueRow ? String(trueRow.option_id) : uid('opt'),
      optionId: trueRow?.option_id ?? null,
      text: 'True',
      isCorrect: Boolean(trueRow?.is_correct),
    },
    {
      id: falseRow ? String(falseRow.option_id) : uid('opt'),
      optionId: falseRow?.option_id ?? null,
      text: 'False',
      isCorrect: Boolean(falseRow?.is_correct),
    },
  ]
}

function questionTypeUsesOptions(type) {
  return (
    type === 'MCQ' ||
    type === 'Poll' ||
    type === 'True/False' ||
    type === 'Ranking' ||
    type === 'Emoji Reaction'
  )
}

function isEmojiReactionQuestionType(type) {
  return type === 'Emoji Reaction'
}

function isPollQuestionType(type) {
  return type === 'Poll'
}

function buildSurveyOptionsPayload(question) {
  if (!surveySubTypeUsesOptions(question.surveySubType)) return []
  const subType = question.surveySubType
  if (subType === 'Poll') {
    return (question.options || []).map((option, optionIndex) => ({
      ...(option.optionId != null ? { option_id: option.optionId } : {}),
      option_text: option.text || `Option ${optionIndex + 1}`,
      is_correct: false,
      display_order: optionIndex + 1,
    }))
  }
  return buildOptionsPayload({ ...question, type: subType })
}

function buildOptionsPayload(question) {
  if (question.type === 'MCQ' || question.type === 'Poll') {
    return (question.options || []).map((option, optionIndex) => ({
      ...(option.optionId != null ? { option_id: option.optionId } : {}),
      option_text: option.text || `Option ${optionIndex + 1}`,
      is_correct: question.type === 'Poll' ? false : Boolean(option.isCorrect),
      display_order: optionIndex + 1,
    }))
  }
  if (question.type === 'Emoji Reaction') {
    return (question.options || []).slice(0, 5).map((option, optionIndex) => ({
      ...(option.optionId != null ? { option_id: option.optionId } : {}),
      option_text: option.text || `👍`,
      is_correct: false,
      display_order: optionIndex + 1,
    }))
  }
  if (question.type === 'True/False') {
    return normalizeTrueFalseOptions(
      (question.options || []).map((o) => ({
        option_id: o.optionId,
        option_text: o.text,
        is_correct: o.isCorrect,
      })),
    ).map((option, optionIndex) => ({
      ...(option.optionId != null ? { option_id: option.optionId } : {}),
      option_text: option.text,
      is_correct: Boolean(option.isCorrect),
      display_order: optionIndex + 1,
    }))
  }
  if (question.type === 'Ranking') {
    return (question.options || []).map((option, optionIndex) => ({
      ...(option.optionId != null ? { option_id: option.optionId } : {}),
      option_text: option.text || `Option ${optionIndex + 1}`,
      is_correct: false,
      display_order: optionIndex + 1,
    }))
  }
  return []
}

function SortableRow({ id, children, className = '' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5 backdrop-blur transition ${
        isDragging ? 'opacity-70' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-slate-600">
        <button
          type="button"
          className="cursor-grab rounded-xl p-2 text-slate-500 transition hover:bg-blue-50"
          aria-label="Drag"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function TrueFalseOptionsEditor({ question, quizMode, onChange, structureLocked }) {
  const options = normalizeTrueFalseOptions(
    (question.options || []).map((o) => ({
      option_id: o.optionId,
      option_text: o.text,
      is_correct: o.isCorrect,
    })),
  )

  const setCorrect = (label) => {
    if (!quizMode || structureLocked) return
    onChange({
      ...question,
      options: options.map((o) => ({
        ...o,
        isCorrect: o.text === label,
      })),
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-navy-900">Answer key</p>
      <p className="text-xs text-slate-600">True/False always has two fixed choices. Mark exactly one as correct.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.text}
            type="button"
            disabled={structureLocked || !quizMode}
            onClick={() => setCorrect(opt.text)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              structureLocked || !quizMode
                ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500'
                : opt.isCorrect
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
            }`}
          >
            <span>{opt.text}</span>
            {opt.isCorrect && <CheckCircle2 className="size-4 text-emerald-600" />}
          </button>
        ))}
      </div>
      {!quizMode && (
        <p className="text-xs text-amber-700">Enable Quiz mode to select the correct answer.</p>
      )}
    </div>
  )
}

function OptionsEditor({ question, quizMode, onChange, structureLocked, hideCorrectToggle = false }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const setOptionText = (id, text) => {
    onChange({
      ...question,
      options: question.options.map((o) => (o.id === id ? { ...o, text } : o)),
    })
  }

  const addOption = () => {
    if (structureLocked) return
    if (question.type === 'Ranking' && question.options.length >= 10) return
    onChange({
      ...question,
      options: [...question.options, { id: uid('opt'), text: `Option ${question.options.length + 1}`, isCorrect: false }],
    })
  }

  const removeOption = (id) => {
    if (structureLocked) return
    onChange({ ...question, options: question.options.filter((o) => o.id !== id) })
  }

  const toggleCorrect = (id) => {
    if (!quizMode || structureLocked) return
    onChange({
      ...question,
      // MCQ supports a single correct answer at a time.
      options: question.options.map((o) => ({ ...o, isCorrect: o.id === id })),
    })
  }

  const onDragEnd = (event) => {
    if (structureLocked) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = question.options.findIndex((o) => o.id === active.id)
    const newIndex = question.options.findIndex((o) => o.id === over.id)
    onChange({ ...question, options: arrayMove(question.options, oldIndex, newIndex) })
  }

  const optionRows = question.options.map((opt) => (
    <div key={opt.id} className="flex flex-wrap items-center gap-2">
      {question.type === 'MCQ' && !hideCorrectToggle ? (
        <button
          type="button"
          onClick={() => toggleCorrect(opt.id)}
          disabled={structureLocked}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
            structureLocked
              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
              : quizMode
                ? opt.isCorrect
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
                : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500'
          }`}
          title={
            structureLocked
              ? 'Correct answers cannot be changed after the session is live'
              : quizMode
                ? 'Toggle correct answer'
                : 'Enable Quiz Mode to select correct answers'
          }
          aria-label="Toggle correct"
        >
          <CheckCircle2 className="size-4" />
          {structureLocked ? (opt.isCorrect ? 'Correct' : '—') : quizMode ? (opt.isCorrect ? 'Correct' : 'Mark correct') : 'Quiz mode off'}
        </button>
      ) : null}
      <input
        className="h-10 min-w-[220px] flex-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
        value={opt.text}
        onChange={(e) => setOptionText(opt.id, e.target.value)}
      />
      <button
        type="button"
        onClick={() => removeOption(opt.id)}
        disabled={structureLocked}
        className={`rounded-xl border p-2 transition ${
          structureLocked
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300'
            : 'border-red-200 bg-white text-red-700 hover:bg-red-50'
        }`}
        aria-label="Delete option"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  ))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-navy-900">Options</p>
        <button
          type="button"
          onClick={addOption}
          disabled={structureLocked || (question.type === 'Ranking' && question.options.length >= 10)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
            structureLocked
              ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
          }`}
        >
          <Plus className="size-4" />
          Add option
        </button>
      </div>
      {question.type === 'Ranking' ? (
        <p className="text-xs text-slate-600">Provide 2 to 10 options. Participants will rank all options.</p>
      ) : null}

      {structureLocked ? (
        <div className="space-y-2">{optionRows}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={question.options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {question.options.map((opt) => (
                <SortableRow key={opt.id} id={opt.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    {question.type === 'MCQ' && !hideCorrectToggle ? (
                      <button
                        type="button"
                        onClick={() => toggleCorrect(opt.id)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          quizMode
                            ? opt.isCorrect
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
                            : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                        title={quizMode ? 'Toggle correct answer' : 'Enable Quiz Mode to select correct answers'}
                        aria-label="Toggle correct"
                      >
                        <CheckCircle2 className="size-4" />
                        {quizMode ? (opt.isCorrect ? 'Correct' : 'Mark correct') : 'Quiz mode off'}
                      </button>
                    ) : null}
                    <input
                      className="h-10 min-w-[220px] flex-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                      value={opt.text}
                      onChange={(e) => setOptionText(opt.id, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(opt.id)}
                      className="rounded-xl border border-red-200 bg-white p-2 text-red-700 transition hover:bg-red-50"
                      aria-label="Delete option"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SurveySelectModeToggle({ value, onChange, disabled }) {
  return (
    <div className="inline-flex rounded-xl border border-blue-200/70 bg-slate-100 p-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          !value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy-900'
        }`}
      >
        Single select
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy-900'
        }`}
      >
        Multi select
      </button>
    </div>
  )
}

function clampRatingValue(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function RatingNumberInput({ value, fallback, min, max, disabled, onChange, className }) {
  const [draft, setDraft] = useState(() => String(value ?? fallback))

  useEffect(() => {
    setDraft(String(value ?? fallback))
  }, [value, fallback])

  const handleDraftChange = (next) => {
    if (next === '') {
      setDraft('')
      return
    }
    if (!/^\d+$/.test(next)) return
    const parsed = Number(next)
    if (parsed < min || parsed > max) return
    setDraft(next)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed === '') {
      const next = clampRatingValue(value ?? fallback, min, max)
      setDraft(String(next))
      onChange(next)
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      const next = clampRatingValue(value ?? fallback, min, max)
      setDraft(String(next))
      onChange(next)
      return
    }
    const clamped = clampRatingValue(parsed, min, max)
    onChange(clamped)
    setDraft(String(clamped))
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      disabled={disabled}
      value={draft}
      onChange={(e) => handleDraftChange(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={className}
    />
  )
}

function applySurveySubTypeChange(question, nextSubType) {
  return {
    ...question,
    surveySubType: nextSubType,
    allowMultipleSelect: false,
    options: defaultOptionsForSurveySubType(nextSubType),
    ...(nextSubType === 'Rating' ? createRatingQuestionDefaults() : {}),
  }
}

function SurveyQuestionFormatSelect({ question, onChange, structureLocked }) {
  const subType = question.surveySubType || 'MCQ'

  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">Question Format</label>
      <select
        value={subType}
        disabled={structureLocked}
        onChange={(e) => onChange(applySurveySubTypeChange(question, e.target.value))}
        className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        {SURVEY_SUB_TYPES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function RatingScaleInfoBanner({ ratingMin, ratingMax, minLabel, maxLabel }) {
  const min = Number(ratingMin ?? DEFAULT_RATING_MIN)
  const max = Number(ratingMax ?? DEFAULT_RATING_MAX)
  const isValidScale = Number.isFinite(min) && Number.isFinite(max) && min < max
  const choiceCount = isValidScale ? max - min + 1 : 0

  return (
    <div className="rounded-2xl border border-sky-200/80 bg-linear-to-r from-sky-50/90 to-blue-50/60 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm shadow-sky-900/5">
          <Star className="size-4 text-amber-500" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy-900">Rating scale</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Participants choose one number between your minimum and maximum (allowed range{' '}
            <strong>{DEFAULT_RATING_MIN}–{DEFAULT_RATING_MAX}</strong>). Defaults are{' '}
            <strong>{DEFAULT_RATING_MIN}</strong> (lowest) and <strong>{DEFAULT_RATING_MAX}</strong> (highest).
            Optional end labels help clarify what each extreme means.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-navy-800 shadow-sm shadow-sky-900/5">
              {isValidScale ? `${min} → ${max}` : 'Set min below max'}
            </span>
            {isValidScale ? (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-900">
                {choiceCount} choice{choiceCount === 1 ? '' : 's'}
              </span>
            ) : null}
            {minLabel || maxLabel ? (
              <span className="text-xs text-slate-500">
                {minLabel ? `"${minLabel}"` : min} … {maxLabel ? `"${maxLabel}"` : max}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function validateRatingScale(question, labelPrefix) {
  const min = Number(question.ratingMin ?? DEFAULT_RATING_MIN)
  const max = Number(question.ratingMax ?? DEFAULT_RATING_MAX)
  if (min < DEFAULT_RATING_MIN || max > DEFAULT_RATING_MAX) {
    return `${labelPrefix} rating values must stay between ${DEFAULT_RATING_MIN} and ${DEFAULT_RATING_MAX}.`
  }
  if (min >= max) {
    return `${labelPrefix} rating scale max must be greater than min.`
  }
  return null
}

function buildRatingScalePayload(question) {
  return {
    rating_min: question.ratingMin ?? DEFAULT_RATING_MIN,
    rating_max: question.ratingMax ?? DEFAULT_RATING_MAX,
    rating_min_label: question.ratingMinLabel || null,
    rating_max_label: question.ratingMaxLabel || null,
  }
}

function RatingScaleEditor({ question, onChange, structureLocked }) {
  return (
    <>
      <RatingScaleInfoBanner
        ratingMin={question.ratingMin}
        ratingMax={question.ratingMax}
        minLabel={question.ratingMinLabel}
        maxLabel={question.ratingMaxLabel}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-700">Min value</label>
          <RatingNumberInput
            min={DEFAULT_RATING_MIN}
            max={DEFAULT_RATING_MAX}
            fallback={DEFAULT_RATING_MIN}
            value={question.ratingMin}
            disabled={structureLocked}
            onChange={(ratingMin) => onChange({ ...question, ratingMin })}
            className="mt-1 h-10 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Max value</label>
          <RatingNumberInput
            min={DEFAULT_RATING_MIN}
            max={DEFAULT_RATING_MAX}
            fallback={DEFAULT_RATING_MAX}
            value={question.ratingMax}
            disabled={structureLocked}
            onChange={(ratingMax) => onChange({ ...question, ratingMax })}
            className="mt-1 h-10 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Min label (optional)</label>
          <input
            type="text"
            disabled={structureLocked}
            value={question.ratingMinLabel || ''}
            onChange={(e) => onChange({ ...question, ratingMinLabel: e.target.value })}
            placeholder="e.g. Not satisfied"
            className="mt-1 h-10 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Max label (optional)</label>
          <input
            type="text"
            disabled={structureLocked}
            value={question.ratingMaxLabel || ''}
            onChange={(e) => onChange({ ...question, ratingMaxLabel: e.target.value })}
            placeholder="e.g. Very satisfied"
            className="mt-1 h-10 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"
          />
        </div>
      </div>
    </>
  )
}

function SurveyQuestionConfig({ question, onChange, structureLocked }) {
  const subType = question.surveySubType || 'MCQ'
  const editorQuestion = { ...question, type: subType }

  return (
    <div className="space-y-4">
      {subType === 'Rating' && (
        <RatingScaleEditor
          question={question}
          onChange={onChange}
          structureLocked={structureLocked}
        />
      )}

      {(subType === 'MCQ' || subType === 'Poll') && (
        <div className="space-y-3 rounded-2xl border border-blue-200/70 bg-white/70 p-4">
          {subType === 'MCQ' ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3">
              <p className="text-sm font-semibold text-slate-700">Selection mode</p>
              <SurveySelectModeToggle
                value={Boolean(question.allowMultipleSelect)}
                disabled={structureLocked}
                onChange={(allowMultipleSelect) => onChange({ ...question, allowMultipleSelect })}
              />
            </div>
          ) : null}
          <OptionsEditor
            question={editorQuestion}
            quizMode={false}
            hideCorrectToggle={subType === 'MCQ'}
            onChange={(next) => onChange({ ...question, options: next.options })}
            structureLocked={structureLocked}
          />
        </div>
      )}

      {subType === 'Ranking' && (
        <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-4">
          <OptionsEditor
            question={editorQuestion}
            quizMode={false}
            onChange={(next) => onChange({ ...question, options: next.options })}
            structureLocked={structureLocked}
          />
        </div>
      )}
    </div>
  )
}

function ParticipantPreview({ question, quizMode }) {
  const previewQuestion =
    question.type === 'Survey'
      ? { ...question, type: question.surveySubType || 'MCQ' }
      : question
  const previewQuizMode = question.type === 'Survey' ? false : quizMode

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Participant View</p>
        <h3 className="mt-2 text-lg font-bold text-navy-900">{previewQuestion.text || 'Untitled question'}</h3>
        <p className="mt-1 text-sm text-slate-600">
          Type: {question.type === 'Survey' ? `Survey · ${surveySubTypeLabel(question.surveySubType)}` : previewQuestion.type}
        </p>
      </div>

      {previewQuestion.media?.url ? (
        <QuestionMedia media={previewQuestion.media} />
      ) : null}

      {previewQuestion.type === 'MCQ' && (
        <div className="grid gap-2">
          {previewQuestion.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="flex items-center justify-between rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              {o.text}
              {previewQuizMode && o.isCorrect && <span className="text-xs font-bold text-emerald-700">Correct</span>}
            </button>
          ))}
        </div>
      )}

      {previewQuestion.type === 'Poll' && (
        <div className="grid gap-2">
          {previewQuestion.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              {o.text}
            </button>
          ))}
        </div>
      )}

      {previewQuestion.type === 'Emoji Reaction' && (
        <div className="flex flex-wrap justify-center gap-3">
          {previewQuestion.options.map((o) => (
            <span
              key={o.id}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200/70 bg-white text-3xl"
            >
              {o.text}
            </span>
          ))}
        </div>
      )}

      {previewQuestion.type === 'Ranking' && (
        <div className="grid gap-2">
          {previewQuestion.options.map((o, idx) => (
            <div
              key={o.id}
              className="flex items-center rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              <span className="mr-3 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-navy-700">#{idx + 1}</span>
              {o.text}
            </div>
          ))}
        </div>
      )}

      {previewQuestion.type === 'Text' && (
        <textarea
          className="h-28 w-full resize-none rounded-2xl border border-blue-200/70 bg-white p-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
          placeholder="Type your answer..."
          readOnly
        />
      )}

      {previewQuestion.type === 'Rating' && (
        <div className="space-y-2">
          {(previewQuestion.ratingMinLabel || previewQuestion.ratingMaxLabel) && (
            <div className="flex justify-between text-xs text-slate-600">
              <span>{previewQuestion.ratingMinLabel || String(previewQuestion.ratingMin ?? DEFAULT_RATING_MIN)}</span>
              <span>{previewQuestion.ratingMaxLabel || String(previewQuestion.ratingMax ?? DEFAULT_RATING_MAX)}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {Array.from({
              length: Math.max(
                1,
                (previewQuestion.ratingMax ?? DEFAULT_RATING_MAX) -
                  (previewQuestion.ratingMin ?? DEFAULT_RATING_MIN) +
                  1,
              ),
            }).map((_, i) => {
              const value = (previewQuestion.ratingMin ?? DEFAULT_RATING_MIN) + i
              return (
                <button
                  key={value}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
                >
                  <Star className="size-4 text-amber-500" /> {value}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {previewQuestion.type === 'True/False' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {normalizeTrueFalseOptions(
            (previewQuestion.options || []).map((o) => ({
              option_id: o.optionId,
              option_text: o.text,
              is_correct: o.isCorrect,
            })),
          ).map((o) => (
            <button
              key={o.text}
              type="button"
              className="rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              {o.text}
              {previewQuizMode && o.isCorrect && (
                <span className="ml-2 text-xs font-bold text-emerald-700">Correct</span>
              )}
            </button>
          ))}
        </div>
      )}

      {previewQuestion.type === 'Word Cloud' && (
        <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-8 text-center text-sm text-slate-600">
          Participants submit words or short phrases for the word cloud.
        </div>
      )}
    </div>
  )
}

function BuilderPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || ''
  const navSessionsQuery = useHostNavSessions()
  const { departmentId } = useShell()
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const [selectedId, setSelectedId] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [questions, setQuestions] = useState([])
  const [settings, setSettings] = useState({
    anonymous: false,
    leaderboard: false,
    maxParticipants: 300,
    password: '',
  })
  const [joinRequirement, setJoinRequirement] = useState('name')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [lastSavedLabel, setLastSavedLabel] = useState('Never')
  const [initialQuestionIds, setInitialQuestionIds] = useState([])
  const prevDepartmentIdRef = useRef(departmentId)

  const sessionQuery = useQuery({
    queryKey: ['builder-session', sessionId],
    queryFn: () => getSessionDetailApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
  })

  const questionsQuery = useQuery({
    queryKey: ['builder-questions', sessionId],
    queryFn: () => listSessionQuestionsApi(accessToken, sessionId),
    enabled: Boolean(accessToken && sessionId),
  })

  const deptSessionsQuery = navSessionsQuery

  useEffect(() => {
    if (!departmentId) return
    if (navSessionsQuery.isFetching) return

    const sessions = navSessionsQuery.data ?? []
    const departmentChanged = prevDepartmentIdRef.current !== departmentId

    if (departmentChanged) {
      prevDepartmentIdRef.current = departmentId
      setQuestions([])
      setSelectedId(null)
      setDirty(false)
      setSaveError('')
      setSaveSuccess('')

      const nextSessionId = getLatestSessionId(sessions)
      if (nextSessionId && String(sessionId) !== nextSessionId) {
        navigate(`/builder?session=${encodeURIComponent(nextSessionId)}`, { replace: true })
        return
      }
      if (!nextSessionId && sessionId) {
        navigate('/builder', { replace: true })
      }
      return
    }

    if (!sessionId && sessions.length > 0) {
      const nextSessionId = getLatestSessionId(sessions)
      if (nextSessionId) {
        navigate(`/builder?session=${encodeURIComponent(nextSessionId)}`, { replace: true })
      }
      return
    }

    if (
      sessionId &&
      sessions.length > 0 &&
      !sessions.some((item) => String(item.session_id) === String(sessionId))
    ) {
      const nextSessionId = getLatestSessionId(sessions)
      if (nextSessionId) {
        navigate(`/builder?session=${encodeURIComponent(nextSessionId)}`, { replace: true })
      }
    }
  }, [
    departmentId,
    sessionId,
    navSessionsQuery.data,
    navSessionsQuery.isFetching,
    navigate,
  ])

  const apiToUiType = (apiType) => {
    const mapping = {
      mcq: 'MCQ',
      poll: 'Poll',
      survey: 'Survey',
      word_cloud: 'Word Cloud',
      rating: 'Rating',
      open_text: 'Text',
      true_false: 'True/False',
      ranking: 'Ranking',
      emoji_reaction: 'Emoji Reaction',
      fill_blank: 'Text',
    }
    return mapping[apiType] || 'Text'
  }

  const uiToApiType = (uiType) => {
    const mapping = {
      MCQ: 'mcq',
      Poll: 'poll',
      Survey: 'survey',
      'Word Cloud': 'word_cloud',
      'Emoji Reaction': 'emoji_reaction',
      Rating: 'rating',
      Text: 'open_text',
      'True/False': 'true_false',
      Ranking: 'ranking',
    }
    return mapping[uiType] || 'open_text'
  }

  const mapQuestionFromApi = (question) => {
    if (question.question_type === 'survey') {
      const surveySubType = apiSurveySubTypeToUi(question.survey_subtype)
      const apiOptions = question.question_options || question.QuestionOptions || []
      const options = apiOptions.map((option) => ({
        id: String(option.option_id),
        optionId: option.option_id,
        text: option.option_text,
        isCorrect: false,
      }))

      return {
        id: String(question.question_id),
        questionId: question.question_id,
        type: 'Survey',
        surveySubType,
        allowMultipleSelect: Boolean(question.allow_multiple_select),
        text: question.question_text || '',
        media: mapApiMediaToQuestionMedia(question),
        points: 0,
        ratingMin: question.rating_min ?? DEFAULT_RATING_MIN,
        ratingMax: question.rating_max ?? DEFAULT_RATING_MAX,
        ratingMinLabel: question.rating_min_label || '',
        ratingMaxLabel: question.rating_max_label || '',
        answerRevealed: Boolean(question.answer_revealed),
        showLeaderboard: Boolean(question.show_leaderboard),
        timeLimitSeconds: 0,
        options,
      }
    }

    const uiType = apiToUiType(question.question_type)
    const apiOptions = question.question_options || question.QuestionOptions || []
    const options =
      uiType === 'True/False'
        ? normalizeTrueFalseOptions(apiOptions)
        : apiOptions.map((option) => ({
            id: String(option.option_id),
            optionId: option.option_id,
            text: option.option_text,
            isCorrect: Boolean(option.is_correct),
          }))

    return {
      id: String(question.question_id),
      questionId: question.question_id,
      type: uiType,
      text: question.question_text || '',
      media: mapApiMediaToQuestionMedia(question),
      points:
        uiType === 'Poll' || uiType === 'Emoji Reaction' ? 0 : question.points_value ?? 10,
      ...(uiType === 'Rating'
        ? {
            ratingMin: question.rating_min ?? DEFAULT_RATING_MIN,
            ratingMax: question.rating_max ?? DEFAULT_RATING_MAX,
            ratingMinLabel: question.rating_min_label || '',
            ratingMaxLabel: question.rating_max_label || '',
          }
        : {}),
      answerRevealed: Boolean(question.answer_revealed),
      showLeaderboard: Boolean(question.show_leaderboard),
      timeLimitSeconds: normalizeTimeLimitSeconds(question.time_limit_seconds),
      options,
    }
  }

  useEffect(() => {
    if (!sessionId) {
      setQuestions([])
      setSelectedId(null)
      setInitialQuestionIds([])
      return
    }
    if (!questionsQuery.data) return
    const mapped = questionsQuery.data.map(mapQuestionFromApi)
    setQuestions(mapped)
    setSelectedId(mapped[0]?.id ?? null)
    setInitialQuestionIds(mapped.map((item) => item.questionId))
    setDirty(false)
    setSaveError('')
  }, [sessionId, questionsQuery.data])

  useEffect(() => {
    if (!sessionQuery.data) return
    setSettings({
      anonymous: Boolean(sessionQuery.data.is_anonymous_default),
      leaderboard: Boolean(sessionQuery.data.leaderboard_enabled),
      maxParticipants: Number(sessionQuery.data.max_participants || 300),
      password: '',
    })
    setJoinRequirement(sessionQuery.data.is_anonymous_default ? 'anonymous' : 'name')
  }, [sessionQuery.data])

  useEffect(() => {
    const sessionCode = sessionQuery.data?.session_code
    const isLive = sessionQuery.data?.status === 'live' || sessionQuery.data?.status === 'paused'
    if (!sessionCode || !accessToken || !isLive) return

    const client = createRealtimeClient('', {
      session: sessionCode,
      token: accessToken,
      role: 'host',
    })
    const offAnswerReveal = client.on(RealtimeEvent.ANSWER_REVEALED, () => {
      queryClient.invalidateQueries({ queryKey: ['builder-questions', sessionId] })
    })
    const offSessionSettings = client.on(RealtimeEvent.SESSION_SETTINGS_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['builder-session', sessionId] })
    })
    const offQuestionLb = client.on(RealtimeEvent.QUESTION_LEADERBOARD_VISIBILITY, () => {
      queryClient.invalidateQueries({ queryKey: ['builder-questions', sessionId] })
    })
    const offSession = client.on('session_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['builder-session', sessionId] })
    })
    const offQuestion = client.on('question_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['builder-questions', sessionId] })
    })
    const offConnected = client.on(RealtimeEvent.CONNECTED, () => {
      queryClient.invalidateQueries({ queryKey: ['builder-session', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['builder-questions', sessionId] })
    })
    client.connect()
    return () => {
      offAnswerReveal()
      offSessionSettings()
      offQuestionLb()
      offSession()
      offQuestion()
      offConnected()
      client.disconnect()
    }
  }, [sessionQuery.data?.session_code, sessionQuery.data?.status, accessToken, queryClient, sessionId])

  const sessionSettingsMutation = useMutation({
    mutationFn: (payload) => updateSessionApi(accessToken, sessionId, payload),
    onSuccess: (updated) => {
      if (updated) {
        setSettings((prev) => ({
          ...prev,
          leaderboard: Boolean(updated.leaderboard_enabled),
        }))
      }
      queryClient.invalidateQueries({ queryKey: ['builder-session', sessionId] })
      setSaveError('')
    },
    onError: (error) => {
      setSaveError(error.message || 'Unable to update session settings')
    },
  })

  const sessionTitleMutation = useMutation({
    mutationFn: (title) => updateSessionApi(accessToken, sessionId, { title: title.trim() }),
    onSuccess: (updated) => {
      if (updated?.title) {
        queryClient.setQueryData(['builder-session', sessionId], (old) =>
          old ? { ...old, title: updated.title } : old,
        )
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['builder-session', sessionId] })
      setSaveError('')
    },
    onError: (error) => {
      setSaveError(error.message || 'Unable to update session name')
    },
  })

  const patchSessionSettings = (partial) => {
    const next = {
      leaderboard: partial.leaderboard ?? settings.leaderboard,
    }
    setSettings((prev) => ({ ...prev, ...partial }))
    sessionSettingsMutation.mutate({
      leaderboard_enabled: next.leaderboard,
    })
  }

  const questionLeaderboardMutation = useMutation({
    mutationFn: ({ questionId, visible }) =>
      setQuestionLeaderboardVisibleApi(accessToken, questionId, visible),
    onSuccess: (updated) => {
      if (updated?.question_id && selectedId) {
        setQuestions((prev) =>
          prev.map((q) =>
            String(q.questionId) === String(updated.question_id)
              ? { ...q, showLeaderboard: Boolean(updated.show_leaderboard) }
              : q,
          ),
        )
      }
      queryClient.invalidateQueries({ queryKey: ['builder-questions', sessionId] })
      setSaveError('')
    },
    onError: (error) => {
      setSaveError(error.message || 'Unable to update question rankings')
    },
  })

  const answerRevealMutation = useMutation({
    mutationFn: ({ questionId, revealed }) =>
      setQuestionAnswerRevealedApi(accessToken, questionId, revealed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-questions', sessionId] })
    },
    onError: (error) => {
      setSaveError(error.message || 'Unable to reveal answer')
    },
  })

  const session = useMemo(() => {
    if (!sessionQuery.data) return null
    const statusMap = {
      draft: 'Draft',
      live: 'Live',
      paused: 'Live',
      completed: 'Completed',
      archived: 'Completed',
    }
    return {
      id: String(sessionQuery.data.session_id),
      title: sessionQuery.data.title,
      status: statusMap[sessionQuery.data.status] || 'Draft',
      rawStatus: sessionQuery.data.status,
      date: (sessionQuery.data.created_at || '').slice(0, 10),
    }
  }, [sessionQuery.data])

  const isDraftSession = session?.rawStatus === 'draft'
  const sessionQuizTotalTimeEnabled = isSessionQuizTotalTimeEnabled(sessionQuery.data)
  const sessionQuizTotalTimeMinutes = sessionQuizTotalTimeEnabled
    ? Number(sessionQuery.data?.quiz_total_time_minutes)
    : null

  const [timeLimitMode, setTimeLimitMode] = useState('Off')
  const [customTime, setCustomTime] = useState(45)

  const selected = useMemo(
    () => questions.find((q) => q.id === selectedId) ?? questions[0],
    [questions, selectedId],
  )
  const quizMode = selected?.type !== 'Poll' && selected?.type !== 'Survey' && selected?.type !== 'Emoji Reaction'
  const sessionAllUntimed = areAllQuestionsUntimed(questions)
  const selectedTimeLimitSeconds = selected
    ? normalizeTimeLimitSeconds(selected.timeLimitSeconds)
    : 0

  useEffect(() => {
    if (!selected || selected.type === 'Survey') return
    const mode = timeLimitSecondsToMode(selected.timeLimitSeconds)
    setTimeLimitMode(mode)
    if (mode === 'Custom') {
      setCustomTime(normalizeTimeLimitSeconds(selected.timeLimitSeconds) || 45)
    }
  }, [selected?.id, selected?.timeLimitSeconds, selected?.type])
  const sessionQuestionType = questions[0]?.type ?? null
  const hasMixedQuestionTypes = useMemo(() => {
    if (questions.length <= 1) return false
    if (sessionQuestionType === 'Survey') return false
    const firstType = questions[0]?.type
    return questions.some((q) => q.type !== firstType)
  }, [questions, sessionQuestionType])

  useEffect(() => {
    if (!selected || !sessionQuestionType) return
    if (selected.type === sessionQuestionType) return
    const firstMatching = questions.find((q) => q.type === sessionQuestionType)
    if (firstMatching) setSelectedId(firstMatching.id)
  }, [selected, sessionQuestionType, questions])

  const updateQuestion = (next) => {
    setDirty(true)
    setQuestions((prev) => prev.map((q) => (q.id === next.id ? next : q)))
  }

  const applyQuestionTimeLimit = (seconds) => {
    if (!selected || selected.type === 'Survey') return
    const normalized = normalizeTimeLimitSeconds(seconds)
    const applyToAll = areAllQuestionsUntimed(questions)
    setDirty(true)
    if (applyToAll) {
      setQuestions((prev) =>
        prev.map((q) => (q.type === 'Survey' ? q : { ...q, timeLimitSeconds: normalized })),
      )
      return
    }
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === selected.id && q.type !== 'Survey' ? { ...q, timeLimitSeconds: normalized } : q,
      ),
    )
  }

  const handleTimeLimitModeChange = (mode) => {
    setTimeLimitMode(mode)
    applyQuestionTimeLimit(timeLimitModeToSeconds(mode, customTime))
  }

  const handleCustomTimeChange = (value) => {
    const next = Math.max(1, Number(value || 1))
    setCustomTime(next)
    if (timeLimitMode === 'Custom') {
      applyQuestionTimeLimit(next)
    }
  }

  const addQuestion = (type) => {
    if (!session || session.rawStatus !== 'draft') return
    if (sessionQuestionType && sessionQuestionType !== type) {
      setSaveError(`Only one question type is allowed per session. This session is using ${sessionQuestionType}.`)
      return
    }
    setSaveError('')
    setDirty(true)
    const q = {
      id: uid('q'),
      questionId: null,
      type,
      text: '',
      media: null,
      points: type === 'Survey' || type === 'Poll' || type === 'Emoji Reaction' ? 0 : 10,
      timeLimitSeconds: sessionQuizTotalTimeEnabled
        ? 0
        : resolveDefaultTimeLimitForNewQuestion(questions),
      ...(type === 'Survey' ? createSurveyQuestionDefaults('MCQ') : {}),
      ...(type === 'Rating' ? createRatingQuestionDefaults() : {}),
      options:
        type === 'Emoji Reaction'
          ? createDefaultEmojiReactionOptions(uid)
          : type === 'MCQ' || type === 'Poll'
          ? [
              { id: uid('opt'), optionId: null, text: 'Option 1', isCorrect: false },
              { id: uid('opt'), optionId: null, text: 'Option 2', isCorrect: false },
            ]
          : type === 'True/False'
            ? createTrueFalseOptions(true)
            : type === 'Ranking'
              ? [
                  { id: uid('opt'), optionId: null, text: 'Option 1', isCorrect: false },
                  { id: uid('opt'), optionId: null, text: 'Option 2', isCorrect: false },
                ]
              : [],
    }
    setQuestions((prev) => [...prev, q])
    setSelectedId(q.id)
  }

  const handleQuickAddQuestion = () => {
    if (!sessionQuestionType) return
    addQuestion(sessionQuestionType)
  }

  const canQuickAddQuestion = isDraftSession && Boolean(sessionQuestionType)

  const deleteQuestion = (id) => {
    if (!session || session.rawStatus !== 'draft') return
    setDirty(true)
    const remaining = questions.filter((q) => q.id !== id)
    setQuestions(remaining)
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id)
    }
  }

  const onQuestionsDragEnd = (event) => {
    if (!session || session.rawStatus !== 'draft') return
    setDirty(true)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = questions.findIndex((q) => q.id === active.id)
    const newIndex = questions.findIndex((q) => q.id === over.id)
    setQuestions((prev) => arrayMove(prev, oldIndex, newIndex))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) return
      const isDraft = session.rawStatus === 'draft'
      if (hasMixedQuestionTypes) {
        throw new Error('Only one question type is allowed per session. Please keep all questions the same type before saving.')
      }

      for (const question of questions) {
        if (question.type === 'Poll') {
          if ((question.options || []).length < 2) {
            throw new Error(
              `Question "${question.text || 'Untitled'}" must have at least 2 poll options.`,
            )
          }
        }
        if (question.type === 'Survey') {
          const st = question.surveySubType || 'MCQ'
          if (st === 'MCQ' || st === 'Poll') {
            if ((question.options || []).length < 2) {
              throw new Error(
                `Survey item "${question.text || 'Untitled'}" must have at least 2 options.`,
              )
            }
          }
          if (st === 'Rating') {
            const ratingError = validateRatingScale(
              question,
              `Survey item "${question.text || 'Untitled'}"`,
            )
            if (ratingError) throw new Error(ratingError)
          }
          if (st === 'Ranking') {
            const opts = question.options || []
            if (opts.length < 2) {
              throw new Error(
                `Survey item "${question.text || 'Untitled'}" must have at least 2 ranking options.`,
              )
            }
            if (opts.length > 10) {
              throw new Error(
                `Survey item "${question.text || 'Untitled'}" cannot have more than 10 ranking options.`,
              )
            }
          }
        }
        if (question.type === 'Emoji Reaction') {
          const opts = (question.options || []).slice(0, 5)
          if (opts.length !== 5 || opts.some((opt) => !String(opt.text || '').trim())) {
            throw new Error(
              `Question "${question.text || 'Untitled'}" must have exactly 5 emoji options.`,
            )
          }
        }
        if (question.type === 'Rating') {
          const ratingError = validateRatingScale(
            question,
            `Question "${question.text || 'Untitled'}"`,
          )
          if (ratingError) throw new Error(ratingError)
        }
        if (question.type === 'MCQ') {
          const opts = question.options || []
          const correctCount = opts.filter((opt) => opt.isCorrect).length
          if (correctCount !== 1) {
            throw new Error(
              `Question "${question.text || 'Untitled'}" must have exactly one correct answer.`,
            )
          }
        }
        if (question.type === 'True/False') {
          const opts = normalizeTrueFalseOptions(
            (question.options || []).map((o) => ({
              option_id: o.optionId,
              option_text: o.text,
              is_correct: o.isCorrect,
            })),
          )
          const correctCount = opts.filter((opt) => opt.isCorrect).length
          if (correctCount !== 1) {
            throw new Error(
              `Question "${question.text || 'Untitled'}" must have exactly one correct answer (True or False).`,
            )
          }
        }
        if (question.type === 'Ranking') {
          const opts = question.options || []
          if (opts.length < 2) {
            throw new Error(`Question "${question.text || 'Untitled'}" must have at least 2 ranking options.`)
          }
          if (opts.length > 10) {
            throw new Error(`Question "${question.text || 'Untitled'}" cannot have more than 10 ranking options.`)
          }
        }
      }

      const sessionNumericId = Number(session.id)

      const removedIds = initialQuestionIds.filter(
        (questionId) => !questions.some((item) => item.questionId === questionId),
      )
      if (isDraft) {
        for (const questionId of removedIds) {
          await deleteQuestionApi(accessToken, questionId)
        }
      } else if (removedIds.length > 0) {
        throw new Error('Cannot remove questions while the session is live.')
      }

      const orderedIds = []
      for (let index = 0; index < questions.length; index += 1) {
        const question = questions[index]
        if (!isDraft && !question.questionId) {
          throw new Error('Cannot add new questions while the session is live.')
        }

        const isPoll = isPollQuestionType(question.type)
        const isSurvey = isSurveyQuestionType(question.type)
        const isEmojiReaction = isEmojiReactionQuestionType(question.type)
        const surveySubType = question.surveySubType || 'MCQ'
        const payload = {
          question_type: uiToApiType(question.type),
          question_text: question.text || 'Untitled question',
          ...buildQuestionMediaPayload(question.media),
          is_quiz_mode: isPoll || isSurvey || isEmojiReaction ? false : true,
          points_value: isPoll || isSurvey || isEmojiReaction ? 0 : Number(question.points || 0),
          time_limit_seconds: isSurvey
            ? null
            : sessionQuizTotalTimeEnabled
              ? null
              : normalizeTimeLimitSeconds(question.timeLimitSeconds) || null,
          allow_multiple_select:
            isSurvey && (surveySubType === 'MCQ' || surveySubType === 'Poll')
              ? Boolean(question.allowMultipleSelect)
              : false,
          options:
            isSurvey
              ? buildSurveyOptionsPayload(question)
              : questionTypeUsesOptions(question.type)
                ? buildOptionsPayload(question)
                : [],
          display_order: index + 1,
          ...(isSurvey
            ? {
                survey_subtype: uiToApiType(surveySubType),
                ...buildRatingScalePayload(question),
              }
            : {}),
          ...(question.type === 'Rating' ? buildRatingScalePayload(question) : {}),
        }

        if (question.questionId) {
          const updated = await updateQuestionApi(accessToken, question.questionId, payload)
          orderedIds.push(updated.question_id)
        } else {
          const created = await createQuestionApi(accessToken, sessionNumericId, payload)
          orderedIds.push(created.question_id)
        }
      }

      if (isDraft && orderedIds.length > 0) {
        await reorderQuestionsApi(accessToken, sessionNumericId, orderedIds)
      }

      await updateSessionApi(accessToken, sessionNumericId, {
        ...(isDraft
          ? {
              is_anonymous_default: settings.anonymous,
              max_participants: settings.maxParticipants,
            }
          : {}),
        leaderboard_enabled: settings.leaderboard,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['builder-questions', sessionId] })
      await queryClient.invalidateQueries({ queryKey: ['builder-session', sessionId] })
      setDirty(false)
      setSaveError('')
      setSaveSuccess('Questions saved successfully')
      setLastSavedLabel(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
    },
    onError: (error) => {
      setSaveError(error.message || 'Unable to save builder changes')
      setSaveSuccess('')
    },
  })

  useEffect(() => {
    if (!saveSuccess) return
    const timer = window.setTimeout(() => setSaveSuccess(''), 2600)
    return () => window.clearTimeout(timer)
  }, [saveSuccess])

  if (!sessionId) {
    if (navSessionsQuery.isLoading) {
      return (
        <div className="rounded-2xl border border-blue-200 bg-white p-8 text-center text-slate-600">
          Loading sessions...
        </div>
      )
    }
    if (!navSessionsQuery.data?.length) {
      return <HostNoSessionsEmpty pageLabel="Question Builder" />
    }
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600 shadow-sm">
        No session selected. Go to <strong>Dashboard</strong> and click <strong>Edit</strong> on a
        session.
      </div>
    )
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600 shadow-sm">
        No session selected. Go to <strong>Dashboard</strong> and click <strong>Edit</strong> on a session.
      </div>
    )
  }

 /* if (session.rawStatus !== 'draft') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center text-amber-800 shadow-sm">
        This session is in <strong>{session.status}</strong> state. Question Builder editing is allowed only for
        <strong> Draft</strong> sessions.
      </div>
    )
  }*/

  const mappedDeptSessions = (deptSessionsQuery.data || []).map((item) => ({
    id: String(item.session_id),
    title: item.title,
    date: (item.created_at || '').slice(0, 10),
    status: item.status,
  }))

  const filteredSessions = mappedDeptSessions
    .filter((s) => {
      if (!fromDate && !toDate) return true
      const d = new Date(s.date ?? '').getTime()
      const from = fromDate ? new Date(fromDate).getTime() : -Infinity
      const to = toDate ? new Date(toDate).getTime() : Infinity
      return d >= from && d <= to
    })
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Question Builder</p>
          <InlineEditableSessionTitle
            title={session.title}
            isSaving={sessionTitleMutation.isPending}
            onSave={(nextTitle) => sessionTitleMutation.mutate(nextTitle)}
          />
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-navy-700">{session.status}</span>
            <span className="text-xs">Last saved: {lastSavedLabel}</span>
            {dirty ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Unsaved changes</span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Saved</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={session.id}
            onChange={(e) => navigate(`/builder?session=${encodeURIComponent(e.target.value)}`)}
            className="h-11 rounded-2xl border border-blue-200/70 bg-white/90 px-3 text-sm font-semibold text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            aria-label="Select session"
          >
            {filteredSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="hidden h-11 rounded-2xl border border-blue-200/70 bg-white/90 px-3 text-sm text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 lg:block"
            aria-label="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="hidden h-11 rounded-2xl border border-blue-200/70 bg-white/90 px-3 text-sm text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 lg:block"
            aria-label="To date"
          />

          <button
            type="button"
            onClick={() => {
              saveMutation.mutate()
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm shadow-blue-900/5 transition hover:bg-blue-50"
          >
            <Eye className="size-4" />
            Preview
          </button>
        </div>
      </div>

      {saveError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      ) : null}
      {hasMixedQuestionTypes ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This session contains mixed question types from older data. Keep only <strong>{sessionQuestionType}</strong>{' '}
          questions to continue.
        </div>
      ) : null}
      {saveSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveSuccess}
        </div>
      ) : null}
      {!isDraftSession ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          This session is <strong>live</strong>. You can update <strong>question text</strong> and <strong>answer labels</strong> only. Correct
          answers, ordering, new questions, and session settings stay locked until the session is back in draft.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[440px_minmax(560px,1fr)_360px]">
        {/* Left: Question list */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-900">Add question</p>
                <p className="mt-1 text-xs text-slate-600">
                  {sessionQuestionType
                    ? `Session type locked to ${sessionQuestionType}. Use the button or pick the type again.`
                    : 'Choose a type below to start, or use Add question after the first one.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickAddQuestion}
                disabled={!canQuickAddQuestion}
                title={
                  !isDraftSession
                    ? 'Add questions is available only while the session is in draft.'
                    : !sessionQuestionType
                      ? 'Add your first question by choosing a type below.'
                      : `Add another ${sessionQuestionType} question`
                }
                className="inline-flex shrink-0 items-center gap-2 self-center rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="size-4" />
                Add question
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {QUESTION_TYPES.map((t) => {
                const Icon = t.icon
                const isDisabled = Boolean(sessionQuestionType && sessionQuestionType !== t.type) || !isDraftSession
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => addQuestion(t.type)}
                    disabled={isDisabled}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      isDisabled
                        ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500'
                        : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
                    }`}
                    title={
                      !isDraftSession
                        ? 'Add questions is available only while the session is in draft.'
                        : isDisabled
                          ? `Session locked to ${sessionQuestionType}. Remove existing questions to switch type.`
                          : t.description
                    }
                  >
                    <span
                      className={`grid size-9 place-items-center rounded-2xl ${
                        isDisabled ? 'bg-slate-300 text-white' : 'bg-linear-to-br from-navy-900 to-navy-600 text-white'
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 truncate">{t.type}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-navy-900">Questions</p>
                <p className="mt-1 text-xs text-slate-600">
                  {isDraftSession ? 'Drag to reorder • Click to edit' : 'Click to edit wording (reorder & delete are locked while live)'}
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-navy-700">
                {questions.length}
              </span>
            </div>

            <div className="mt-4 max-h-[calc(100vh-270px)] space-y-2 overflow-auto pr-1">
              {isDraftSession ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onQuestionsDragEnd}>
                <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {questions.map((q, idx) => (
                      <div key={q.id} className={`rounded-2xl ${q.id === selectedId ? 'ring-2 ring-blue-500/25' : ''}`}>
                        <SortableRow id={q.id} className="border-blue-200/70">
                          {(() => {
                            const isTypeMismatch = Boolean(sessionQuestionType && q.type !== sessionQuestionType)
                            return (
                          <button
                            type="button"
                            onClick={() => {
                              if (isTypeMismatch) return
                              setSelectedId(q.id)
                            }}
                            className={`flex w-full items-start justify-between gap-3 rounded-xl px-2 py-2 text-left ${
                              isTypeMismatch ? 'cursor-not-allowed opacity-60' : ''
                            }`}
                            disabled={isTypeMismatch}
                            title={isTypeMismatch ? `Session locked to ${sessionQuestionType}.` : undefined}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                  {idx + 1}
                                </span>
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-navy-700">
                                  {q.type}
                                </span>
                                {q.type === 'Survey' && q.surveySubType ? (
                                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
                                    {surveySubTypeLabel(q.surveySubType)}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-navy-900">
                                {q.text?.trim() ? q.text : `Untitled ${q.type}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                {q.media?.url ? 'Has media • ' : ''}
                                {q.type === 'Survey'
                                  ? surveySubTypeUsesOptions(q.surveySubType)
                                    ? `${q.options?.length ?? 0} options`
                                    : 'No options'
                                  : questionTypeUsesOptions(q.type)
                                    ? `${q.options?.length ?? 0} options`
                                    : 'No options'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteQuestion(q.id)
                              }}
                              className="rounded-xl border border-red-200 bg-white p-2 text-red-700 transition hover:bg-red-50"
                              aria-label="Delete question"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </button>
                            )
                          })()}
                        </SortableRow>
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              ) : (
              <div className="space-y-2">
                {questions.map((q, idx) => {
                  const isTypeMismatch = Boolean(sessionQuestionType && q.type !== sessionQuestionType)
                  return (
                    <div
                      key={q.id}
                      className={`rounded-2xl border border-blue-200/70 bg-white/90 shadow-sm shadow-blue-900/5 backdrop-blur ${
                        q.id === selectedId ? 'ring-2 ring-blue-500/25' : ''
                      }`}
                    >
                      <div className="px-3 py-2">
                        <div className="flex w-full items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (isTypeMismatch) return
                              setSelectedId(q.id)
                            }}
                            className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-left ${
                              isTypeMismatch ? 'cursor-not-allowed opacity-60' : ''
                            }`}
                            disabled={isTypeMismatch}
                            title={isTypeMismatch ? `Session locked to ${sessionQuestionType}.` : undefined}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {idx + 1}
                              </span>
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-navy-700">
                                {q.type}
                              </span>
                              {q.type === 'Survey' && q.surveySubType ? (
                                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900">
                                  {surveySubTypeLabel(q.surveySubType)}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-navy-900">
                              {q.text?.trim() ? q.text : `Untitled ${q.type}`}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              {q.media?.url ? 'Has media • ' : ''}
                              {q.type === 'Survey'
                                ? surveySubTypeUsesOptions(q.surveySubType)
                                  ? `${q.options?.length ?? 0} options`
                                  : 'No options'
                                : questionTypeUsesOptions(q.type)
                                  ? `${q.options?.length ?? 0} options`
                                  : 'No options'}
                            </p>
                          </button>
                          <button
                            type="button"
                            disabled
                            className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-300"
                            aria-label="Delete question (locked while live)"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Editor */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-6 shadow-sm shadow-blue-900/5 backdrop-blur">
            {!selected ? (
              <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-8 text-center text-slate-600">
                No questions in this session yet. Use <strong>Add question</strong> from the left panel, then click
                <strong> Save</strong>.
              </div>
            ) : (
              <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Editing</p>
                <h3 className="mt-1 text-lg font-bold text-navy-900">
                  {selected.type === 'Survey' && selected.surveySubType
                    ? `Survey · ${surveySubTypeLabel(selected.surveySubType)}`
                    : selected.type}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!isDraftSession && quizMode && selected.questionId ? (
                  <HostQuestionActionButton
                    disabled={questionLeaderboardMutation.isPending}
                    onClick={() =>
                      questionLeaderboardMutation.mutate({
                        questionId: selected.questionId,
                        visible: !selected.showLeaderboard,
                      })
                    }
                    icon={Trophy}
                    label="Rankings"
                    title={
                      selected.showLeaderboard
                        ? 'Hide ranking for this question'
                        : 'Show ranking for this question only'
                    }
                    active={selected.showLeaderboard}
                    tone="amber"
                  />
                ) : null}

                {!isDraftSession && selected.type === 'Survey' && selected.questionId ? (
                  <HostQuestionActionButton
                    disabled={questionLeaderboardMutation.isPending}
                    onClick={() =>
                      questionLeaderboardMutation.mutate({
                        questionId: selected.questionId,
                        visible: !selected.showLeaderboard,
                      })
                    }
                    icon={BarChart3}
                    label={selected.showLeaderboard ? 'Hide results' : 'Show results'}
                    title={
                      selected.showLeaderboard
                        ? 'Hide anonymous survey results on participant screens'
                        : 'Show anonymous survey results on participant screens'
                    }
                    active={selected.showLeaderboard}
                    tone="sky"
                  />
                ) : null}

                {questionSupportsAnswerReveal(selected.type, quizMode) ? (
                  <HostQuestionActionButton
                    disabled={isDraftSession || !selected.questionId || answerRevealMutation.isPending}
                    onClick={() =>
                      answerRevealMutation.mutate({
                        questionId: selected.questionId,
                        revealed: !selected.answerRevealed,
                      })
                    }
                    icon={selected.answerRevealed ? EyeOff : Eye}
                    label={selected.answerRevealed ? 'Hide answer' : 'Reveal answer'}
                    title={
                      isDraftSession
                        ? 'Reveal answer is available when the session is live'
                        : selected.answerRevealed
                          ? 'Correct answer is visible to participants'
                          : 'Show the correct answer on participant screens'
                    }
                    active={selected.answerRevealed}
                    tone="violet"
                  />
                ) : null}
                {quizMode ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-white px-3 py-2">
                    <p className="text-sm font-semibold text-slate-700">Points</p>
                    <input
                      type="number"
                      min={0}
                      disabled={!isDraftSession}
                      value={selected.points ?? 0}
                      onChange={(e) => updateQuestion({ ...selected, points: Number(e.target.value || 0) })}
                      className={`h-9 w-20 rounded-xl border px-2 text-sm outline-none ${
                        isDraftSession
                          ? 'border-blue-200/70 bg-white text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    />
                  </div>
                ) : selected?.type === 'Survey' ? (
                  <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900">
                    Survey — no timer or scoring
                  </span>
                ) : selected?.type === 'Emoji Reaction' ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
                    Emoji reaction — no scoring
                  </span>
                ) : (
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">
                    Poll — no points or correct answer
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {selected.type === 'Survey' && (
                <SurveyQuestionFormatSelect
                  question={selected}
                  onChange={updateQuestion}
                  structureLocked={!isDraftSession}
                />
              )}

              <div>
                <label className="text-sm font-semibold text-slate-700">Question text</label>
                <textarea
                  value={selected.text}
                  onChange={(e) => updateQuestion({ ...selected, text: e.target.value })}
                  placeholder={
                    selected.type === 'Emoji Reaction'
                      ? 'How are you feeling about this topic? (optional)'
                      : 'Type your question...'
                  }
                  className="mt-1 h-24 w-full resize-none rounded-2xl border border-blue-200/70 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              {selected.type === 'Survey' && (
                <SurveyQuestionConfig
                  question={selected}
                  onChange={updateQuestion}
                  structureLocked={!isDraftSession}
                />
              )}

              {selected.type === 'Rating' && (
                <div className="space-y-4 rounded-2xl border border-blue-200/70 bg-white/70 p-4">
                  <RatingScaleEditor
                    question={selected}
                    onChange={updateQuestion}
                    structureLocked={!isDraftSession}
                  />
                </div>
              )}

              {selected.type === 'Emoji Reaction' && (
                <EmojiReactionEditor
                  question={selected}
                  onChange={updateQuestion}
                  structureLocked={!isDraftSession}
                  uid={uid}
                />
              )}

              {(selected.type === 'MCQ' || selected.type === 'Poll' || selected.type === 'Ranking') && (
                <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-4">
                  <OptionsEditor
                    question={selected}
                    quizMode={quizMode}
                    onChange={updateQuestion}
                    structureLocked={!isDraftSession}
                  />
                </div>
              )}

              {selected.type === 'True/False' && (
                <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-4">
                  <TrueFalseOptionsEditor
                    question={selected}
                    quizMode={quizMode}
                    onChange={updateQuestion}
                    structureLocked={!isDraftSession}
                  />
                </div>
              )}

              <QuestionMediaUpload
                media={selected.media}
                deptId={departmentId || sessionQuery.data?.dept_id}
                onChange={(media) => updateQuestion({ ...selected, media })}
                disabled={!isDraftSession}
              />

              {selected.type !== 'Survey' && sessionQuizTotalTimeEnabled ? (
                <div className="rounded-2xl border border-sky-200/70 bg-sky-50/80 p-4">
                  <p className="text-sm font-semibold text-sky-950">Session quiz total time</p>
                  <p className="mt-1 text-xs text-sky-900/80">
                    This session uses a {sessionQuizTotalTimeMinutes}-minute quiz window. Per-question
                    time limits are disabled while quiz total time is enabled.
                  </p>
                </div>
              ) : null}

              {selected.type !== 'Survey' && !sessionQuizTotalTimeEnabled ? (
              <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">Time limit</p>
                    <p className="text-xs text-slate-600">
                      {sessionAllUntimed
                        ? 'All questions are untimed — changing this applies to every question.'
                        : 'Per-question timing — adjust individually or turn off for specific questions.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={timeLimitMode}
                      disabled={!isDraftSession}
                      onChange={(e) => handleTimeLimitModeChange(e.target.value)}
                      className="h-10 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      {['Off', '15s', '30s', '60s', '120s', 'Custom'].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                    {timeLimitMode === 'Custom' && (
                      <input
                        type="number"
                        min={1}
                        disabled={!isDraftSession}
                        value={customTime}
                        onChange={(e) => handleCustomTimeChange(e.target.value)}
                        className="h-10 w-24 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  This question:{' '}
                  <span className="font-semibold text-navy-900">
                    {selectedTimeLimitSeconds === 0 ? 'Off' : `${selectedTimeLimitSeconds}s`}
                  </span>
                </p>
              </div>
              ) : null}
            </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Session settings */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-5 shadow-sm shadow-blue-900/5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Session settings</p>
            <h3 className="mt-1 text-lg font-bold text-navy-900">Controls</h3>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-blue-200/70 bg-white p-3">
                <label className="text-sm font-semibold text-slate-700">Join requirements</label>
                <p className="text-xs text-slate-500">What participants must enter to join</p>
                <select
                  value={joinRequirement}
                  disabled={!isDraftSession}
                  onChange={(e) => {
                    const next = e.target.value
                    setDirty(true)
                    setJoinRequirement(next)
                    setSettings((prev) => ({ ...prev, anonymous: next === 'anonymous' }))
                  }}
                  className="mt-2 h-10 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="anonymous">Anonymous (no name/email)</option>
                  <option value="name">Name only</option>
                  <option value="name_email">Name + Email</option>
                </select>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Anonymous mode</p>
                  <p className="text-xs text-slate-500">Hide participant identities</p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isDraftSession}
                  checked={settings.anonymous}
                  onChange={(e) => {
                    setDirty(true)
                    setSettings((prev) => ({ ...prev, anonymous: e.target.checked }))
                  }}
                  className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40 disabled:cursor-not-allowed"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-white p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Overall rankings (Q&A)</p>
                  <p className="text-xs text-slate-500">Session-wide rankings on the Overall Rankings tab</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.leaderboard}
                  onChange={(e) => {
                    const next = e.target.checked
                    if (isDraftSession) {
                      setDirty(true)
                      setSettings((prev) => ({ ...prev, leaderboard: next }))
                    } else {
                      patchSessionSettings({ leaderboard: next })
                    }
                  }}
                  className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40"
                />
              </label>

              <div className="rounded-2xl border border-blue-200/70 bg-sky-50/80 p-3 text-xs text-slate-600">
                Per-question rankings visibility is controlled from the question editor (or Live page) for each
                quiz question while the session is live.
              </div>

              <div className="rounded-2xl border border-blue-200/70 bg-white p-3">
                <label className="text-sm font-semibold text-slate-700">Max participants</label>
                <input
                  type="number"
                  min={1}
                  disabled={!isDraftSession}
                  value={settings.maxParticipants}
                  onChange={(e) => {
                    setDirty(true)
                    setSettings((prev) => ({ ...prev, maxParticipants: Number(e.target.value || 1) }))
                  }}
                  className="mt-2 h-10 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              {/* <div className="rounded-2xl border border-blue-200/70 bg-white p-3">
                <label className="text-sm font-semibold text-slate-700">Session password</label>
                <input
                  type="text"
                  disabled={!isDraftSession}
                  value={settings.password}
                  onChange={(e) => {
                    setDirty(true)
                    setSettings((prev) => ({ ...prev, password: e.target.value }))
                  }}
                  placeholder="Optional"
                  className="mt-2 h-10 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div> */}

              <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-4 text-sm text-slate-600">
                Tip: Use <strong>Quiz mode</strong> + correct answers + points for scored quizzes.
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Modal open={previewOpen} title="Preview Participant View" onClose={() => setPreviewOpen(false)}>
        {selected ? (
          <ParticipantPreview question={selected} quizMode={quizMode} />
        ) : (
          <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-6 text-center text-slate-600">
            Add at least one question to open preview.
          </div>
        )}
      </Modal>
    </section>
  )
}

export default BuilderPage

