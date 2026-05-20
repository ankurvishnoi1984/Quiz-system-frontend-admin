import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  FileUp,
  GripVertical,
  ListChecks,
  MessageSquareText,
  Plus,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'
import {
  createQuestionApi,
  deleteQuestionApi,
  getSessionDetailApi,
  listDepartmentSessionsApi,
  listSessionQuestionsApi,
  reorderQuestionsApi,
  updateQuestionApi,
  updateSessionApi,
} from '../services/builderApi'
import { setQuestionAnswerRevealedApi } from '../services/liveApi'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'
import { questionSupportsAnswerReveal } from '../utils/answerReveal'

const QUESTION_TYPES = [
  { type: 'MCQ', icon: ListChecks, description: 'Multiple choice with options' },
  { type: 'Word Cloud', icon: Cloud, description: 'Collect words, show cloud' },
  { type: 'Rating', icon: Star, description: '1–5 rating' },
  { type: 'Text', icon: MessageSquareText, description: 'Open-ended response' },
  { type: 'True/False', icon: BadgeCheck, description: 'Binary choice' },
  { type: 'Ranking', icon: BarChart3, description: 'Rank items by preference' },
]

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
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
  return type === 'MCQ' || type === 'True/False'
}

function buildOptionsPayload(question) {
  if (question.type === 'MCQ') {
    return (question.options || []).map((option, optionIndex) => ({
      ...(option.optionId != null ? { option_id: option.optionId } : {}),
      option_text: option.text || `Option ${optionIndex + 1}`,
      is_correct: Boolean(option.isCorrect),
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
  return []
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
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

function MediaUpload({ media, onChange, disabled = false }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const pickFile = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const onFiles = (files) => {
    if (disabled) return
    const file = files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const kind = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'file'
    onChange({ file, url, kind })
  }

  useEffect(() => {
    return () => {
      if (media?.url) URL.revokeObjectURL(media.url)
    }
  }, [media?.url])

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*"
        onChange={(e) => onFiles(e.target.files)}
      />

      <div
        className={`rounded-2xl border border-dashed p-4 transition ${
          disabled ? 'pointer-events-none opacity-60' : ''
        } ${dragOver && !disabled ? 'border-blue-400 bg-blue-50/70' : 'border-blue-300 bg-white/60'}`}
        onDragEnter={(e) => {
          if (disabled) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragOver={(e) => {
          if (disabled) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (disabled) return
          e.preventDefault()
          setDragOver(false)
          onFiles(e.dataTransfer.files)
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-linear-to-br from-navy-600 to-navy-500 text-white">
              <FileUp className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">Media upload</p>
              <p className="text-xs text-slate-600">Drag & drop or browse (image/video/audio)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={pickFile}
            disabled={disabled}
            className="rounded-xl border border-blue-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Browse
          </button>
        </div>

        {media?.url && (
          <div className="mt-4 rounded-2xl border border-blue-200/70 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy-900">{media.file?.name ?? 'Uploaded file'}</p>
                <p className="text-xs text-slate-600">{media.file ? formatBytes(media.file.size) : ''}</p>
              </div>
              <button
                type="button"
                onClick={() => !disabled && onChange(null)}
                disabled={disabled}
                className="rounded-xl border border-blue-200/70 p-2 text-slate-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Remove media"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-blue-100 bg-slate-50">
              {media.kind === 'image' && <img src={media.url} alt="Preview" className="max-h-72 w-full object-contain" />}
              {media.kind === 'video' && (
                <video src={media.url} controls className="max-h-72 w-full" />
              )}
              {media.kind === 'audio' && <audio src={media.url} controls className="w-full p-3" />}
              {media.kind === 'file' && (
                <div className="p-3 text-sm text-slate-600">Preview not available for this file type.</div>
              )}
            </div>
          </div>
        )}
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

function OptionsEditor({ question, quizMode, onChange, structureLocked }) {
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
          disabled={structureLocked}
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

      {structureLocked ? (
        <div className="space-y-2">{optionRows}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={question.options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {question.options.map((opt) => (
                <SortableRow key={opt.id} id={opt.id}>
                  <div className="flex flex-wrap items-center gap-2">
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

function ParticipantPreview({ question, quizMode }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Participant View</p>
        <h3 className="mt-2 text-lg font-bold text-navy-900">{question.text || 'Untitled question'}</h3>
        <p className="mt-1 text-sm text-slate-600">Type: {question.type}</p>
        {question.media?.url && question.media.kind === 'image' && (
          <img src={question.media.url} alt="Preview" className="mt-3 max-h-72 w-full rounded-xl border border-blue-100 object-contain" />
        )}
      </div>

      {question.type === 'MCQ' && (
        <div className="grid gap-2">
          {question.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="flex items-center justify-between rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              {o.text}
              {quizMode && o.isCorrect && <span className="text-xs font-bold text-emerald-700">Correct</span>}
            </button>
          ))}
        </div>
      )}

      {question.type === 'Text' && (
        <textarea
          className="h-28 w-full resize-none rounded-2xl border border-blue-200/70 bg-white p-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
          placeholder="Type your answer..."
          readOnly
        />
      )}

      {question.type === 'Rating' && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              <Star className="size-4 text-amber-500" /> {i + 1}
            </button>
          ))}
        </div>
      )}

      {question.type === 'True/False' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {normalizeTrueFalseOptions(
            (question.options || []).map((o) => ({
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
              {quizMode && o.isCorrect && (
                <span className="ml-2 text-xs font-bold text-emerald-700">Correct</span>
              )}
            </button>
          ))}
        </div>
      )}

      {(question.type === 'Word Cloud' || question.type === 'Ranking') && (
        <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-8 text-center text-sm text-slate-600">
          Preview for <strong>{question.type}</strong> will be implemented next.
        </div>
      )}
    </div>
  )
}

function BuilderPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || ''
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
  const [settings, setSettings] = useState({ anonymous: false, leaderboard: true, maxParticipants: 300, password: '' })
  const [joinRequirement, setJoinRequirement] = useState('name')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [lastSavedLabel, setLastSavedLabel] = useState('Never')
  const [initialQuestionIds, setInitialQuestionIds] = useState([])

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

  const deptSessionsQuery = useQuery({
    queryKey: ['builder-dept-sessions', sessionQuery.data?.dept_id],
    queryFn: () => listDepartmentSessionsApi(accessToken, sessionQuery.data?.dept_id),
    enabled: Boolean(accessToken && sessionQuery.data?.dept_id),
  })

  const apiToUiType = (apiType) => {
    const mapping = {
      mcq: 'MCQ',
      word_cloud: 'Word Cloud',
      rating: 'Rating',
      open_text: 'Text',
      true_false: 'True/False',
      ranking: 'Ranking',
      fill_blank: 'Text',
    }
    return mapping[apiType] || 'Text'
  }

  const uiToApiType = (uiType) => {
    const mapping = {
      MCQ: 'mcq',
      'Word Cloud': 'word_cloud',
      Rating: 'rating',
      Text: 'open_text',
      'True/False': 'true_false',
      Ranking: 'ranking',
    }
    return mapping[uiType] || 'open_text'
  }

  const mapQuestionFromApi = (question) => {
    const uiType = apiToUiType(question.question_type)
    const apiOptions = question.question_options || []
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
      media: question.media_url
        ? {
            url: question.media_url,
            kind: question.media_type?.includes('video') ? 'video' : 'image',
            file: null,
          }
        : null,
      points: question.points_value ?? 10,
      answerRevealed: Boolean(question.answer_revealed),
      options,
    }
  }

  useEffect(() => {
    if (!questionsQuery.data) return
    const mapped = questionsQuery.data.map(mapQuestionFromApi)
    setQuestions(mapped)
    setSelectedId(mapped[0]?.id ?? null)
    setInitialQuestionIds(mapped.map((item) => item.questionId))
    setDirty(false)
    setSaveError('')
  }, [questionsQuery.data])

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
    client.connect()
    return () => {
      offAnswerReveal()
      client.disconnect()
    }
  }, [sessionQuery.data?.session_code, sessionQuery.data?.status, accessToken, queryClient, sessionId])

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
      timeLimitSeconds: 30,
    }
  }, [sessionQuery.data])

  const isDraftSession = session?.rawStatus === 'draft'

  const quizMode = true
  const timeLimitSeconds = 30
  const [timeLimitMode, setTimeLimitMode] = useState('30s')
  const [customTime, setCustomTime] = useState(45)

  useEffect(() => {
    if (!sessionId) return
    if (timeLimitSeconds === 0) setTimeLimitMode('Off')
    else if (timeLimitSeconds === 15) setTimeLimitMode('15s')
    else if (timeLimitSeconds === 30) setTimeLimitMode('30s')
    else if (timeLimitSeconds === 60) setTimeLimitMode('60s')
    else if (timeLimitSeconds === 120) setTimeLimitMode('120s')
    else {
      setTimeLimitMode('Custom')
      setCustomTime(timeLimitSeconds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const selected = useMemo(
    () => questions.find((q) => q.id === selectedId) ?? questions[0],
    [questions, selectedId],
  )
  const sessionQuestionType = questions[0]?.type ?? null
  const hasMixedQuestionTypes = useMemo(() => {
    if (questions.length <= 1) return false
    const firstType = questions[0]?.type
    return questions.some((q) => q.type !== firstType)
  }, [questions])

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
      points: 10,
      options:
        type === 'MCQ'
          ? [
              { id: uid('opt'), optionId: null, text: 'Option 1', isCorrect: false },
              { id: uid('opt'), optionId: null, text: 'Option 2', isCorrect: false },
            ]
          : type === 'True/False'
            ? createTrueFalseOptions(true)
            : [],
    }
    setQuestions((prev) => [q, ...prev])
    setSelectedId(q.id)
  }

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

  const effectiveTimeLimitSeconds =
    timeLimitMode === 'Off'
      ? 0
      : timeLimitMode === '15s'
        ? 15
        : timeLimitMode === '30s'
          ? 30
          : timeLimitMode === '60s'
            ? 60
            : timeLimitMode === '120s'
              ? 120
              : Math.max(1, Number(customTime || 1))

  useEffect(() => {
    if (!session) return
    if (effectiveTimeLimitSeconds !== timeLimitSeconds) setDirty(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTimeLimitSeconds])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) return
      const isDraft = session.rawStatus === 'draft'
      if (hasMixedQuestionTypes) {
        throw new Error('Only one question type is allowed per session. Please keep all questions the same type before saving.')
      }

      for (const question of questions) {
        if (question.type === 'MCQ' || question.type === 'True/False') {
          const opts =
            question.type === 'True/False'
              ? normalizeTrueFalseOptions(
                  (question.options || []).map((o) => ({
                    option_id: o.optionId,
                    option_text: o.text,
                    is_correct: o.isCorrect,
                  })),
                )
              : question.options || []
          const correctCount = opts.filter((opt) => opt.isCorrect).length
          if (quizMode && correctCount !== 1) {
            throw new Error(
              `Question "${question.text || 'Untitled'}" must have exactly one correct answer (True or False).`,
            )
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

        const payload = {
          question_type: uiToApiType(question.type),
          question_text: question.text || 'Untitled question',
          is_quiz_mode: quizMode,
          points_value: Number(question.points || 0),
          time_limit_seconds: effectiveTimeLimitSeconds || null,
          allow_multiple_select: false,
          options: questionTypeUsesOptions(question.type) ? buildOptionsPayload(question) : [],
          display_order: index + 1,
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

      if (isDraft) {
        await updateSessionApi(accessToken, sessionNumericId, {
          is_anonymous_default: settings.anonymous,
          leaderboard_enabled: settings.leaderboard,
          max_participants: settings.maxParticipants,
        })
      }
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
          <h2 className="mt-1 text-2xl font-bold text-navy-900">{session.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Session {session.id}</span>
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
                {s.title} ({s.id})
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
            <p className="text-sm font-semibold text-navy-900">Add question</p>
            <p className="mt-1 text-xs text-slate-600">
              {sessionQuestionType ? `Session type locked to: ${sessionQuestionType}` : 'Choose a type to lock this session.'}
            </p>
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
                              </div>
                              <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-navy-900">
                                {q.text?.trim() ? q.text : `Untitled ${q.type}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                {q.media?.url ? 'Has media • ' : ''}
                                {questionTypeUsesOptions(q.type) ? `${q.options?.length ?? 0} options` : 'No options'}
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
                            </div>
                            <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-navy-900">
                              {q.text?.trim() ? q.text : `Untitled ${q.type}`}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              {q.media?.url ? 'Has media • ' : ''}
                              {questionTypeUsesOptions(q.type) ? `${q.options?.length ?? 0} options` : 'No options'}
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
                <h3 className="mt-1 text-lg font-bold text-navy-900">{selected.type}</h3>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!isDraftSession}
                  onClick={() => {
                    setDirty(true)
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title={!isDraftSession ? 'Quiz mode is locked while the session is live' : undefined}
                >
                  {quizMode ? <ToggleRight className="size-4 text-emerald-600" /> : <ToggleLeft className="size-4 text-slate-500" />}
                  Quiz mode
                </button>
                {questionSupportsAnswerReveal(selected.type, quizMode) ? (
                  <button
                    type="button"
                    disabled={isDraftSession || !selected.questionId || answerRevealMutation.isPending}
                    onClick={() =>
                      answerRevealMutation.mutate({
                        questionId: selected.questionId,
                        revealed: !selected.answerRevealed,
                      })
                    }
                    title={
                      isDraftSession
                        ? 'Reveal answer is available when the session is live'
                        : undefined
                    }
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected.answerRevealed
                        ? 'bg-linear-to-r from-slate-600 to-slate-700'
                        : 'bg-linear-to-r from-amber-500 to-orange-600'
                    }`}
                  >
                    {selected.answerRevealed ? (
                      <>
                        <EyeOff className="size-4" />
                        Hide Answer
                      </>
                    ) : (
                      <>
                        <Eye className="size-4" />
                        Reveal Answer
                      </>
                    )}
                  </button>
                ) : null}
                <div className="flex items-center gap-2 rounded-2xl border border-blue-200/70 bg-white px-3 py-2">
                  <p className="text-sm font-semibold text-slate-700">Points</p>
                  <input
                    type="number"
                    min={0}
                    disabled={!quizMode || !isDraftSession}
                    value={selected.points ?? 0}
                    onChange={(e) => updateQuestion({ ...selected, points: Number(e.target.value || 0) })}
                    className={`h-9 w-20 rounded-xl border px-2 text-sm outline-none ${
                      quizMode && isDraftSession
                        ? 'border-blue-200/70 bg-white text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Question text</label>
                <textarea
                  value={selected.text}
                  onChange={(e) => updateQuestion({ ...selected, text: e.target.value })}
                  placeholder="Type your question..."
                  className="mt-1 h-24 w-full resize-none rounded-2xl border border-blue-200/70 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <MediaUpload
                media={selected.media}
                onChange={(media) => updateQuestion({ ...selected, media })}
                disabled={!isDraftSession}
              />

              {selected.type === 'MCQ' && (
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

              <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">Time limit</p>
                    <p className="text-xs text-slate-600">Per question timing</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={timeLimitMode}
                      disabled={!isDraftSession}
                      onChange={(e) => setTimeLimitMode(e.target.value)}
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
                        onChange={(e) => setCustomTime(Number(e.target.value || 1))}
                        className="h-10 w-24 rounded-xl border border-blue-200/70 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Effective time limit:{' '}
                  <span className="font-semibold text-navy-900">{effectiveTimeLimitSeconds === 0 ? 'Off' : `${effectiveTimeLimitSeconds}s`}</span>
                </p>
              </div>
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
                  <p className="text-sm font-semibold text-slate-700">Leaderboard</p>
                  <p className="text-xs text-slate-500">Show top scores</p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isDraftSession}
                  checked={settings.leaderboard}
                  onChange={(e) => {
                    setDirty(true)
                    setSettings((prev) => ({ ...prev, leaderboard: e.target.checked }))
                  }}
                  className="h-5 w-5 rounded border-slate-300 text-navy-700 focus:ring-blue-500/40 disabled:cursor-not-allowed"
                />
              </label>

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

              <div className="rounded-2xl border border-blue-200/70 bg-white p-3">
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
              </div>

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

