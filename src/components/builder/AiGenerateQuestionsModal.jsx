import {
  Check,
  CheckCircle2,
  Circle,
  Info,
  ListChecks,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import { generateQuestionsWithAiApi } from '../../services/aiApi'

const AI_QUESTION_TYPES = [
  'MCQ',
  'Poll',
  'Word Cloud',
  'Rating',
  'Text',
  'True/False',
  'Ranking',
]

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', hint: 'Intro / awareness' },
  { id: 'mixed', label: 'Mixed', hint: 'Balanced set' },
  { id: 'hard', label: 'Hard', hint: 'Deeper knowledge' },
]

const TYPE_HINTS = {
  MCQ: 'Multiple choice with one correct answer',
  Poll: 'Opinion options — no right or wrong',
  'Word Cloud': 'Short prompts for one-word answers',
  Rating: 'Numeric scale questions',
  Text: 'Open-ended written responses',
  'True/False': 'Binary true or false statements',
  Ranking: 'Items participants put in order',
}

function optionLetter(index) {
  return String.fromCharCode(65 + index)
}

/**
 * Collect topic / count / type, call Cursor AI, then let the host pick questions to add.
 */
export function AiGenerateQuestionsModal({
  open,
  onClose,
  accessToken,
  lockedType = null,
  onAddSelected,
}) {
  const availableTypes = useMemo(() => {
    if (lockedType && AI_QUESTION_TYPES.includes(lockedType)) {
      return [lockedType]
    }
    if (lockedType) {
      return []
    }
    return AI_QUESTION_TYPES
  }, [lockedType])

  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(5)
  const [questionType, setQuestionType] = useState(availableTypes[0] || 'MCQ')
  const [difficulty, setDifficulty] = useState('mixed')
  const [step, setStep] = useState('form')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [candidates, setCandidates] = useState([])
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [lastTopic, setLastTopic] = useState('')

  useEffect(() => {
    if (!open) return
    setTopic('')
    setCount(5)
    setQuestionType(availableTypes[0] || 'MCQ')
    setDifficulty('mixed')
    setStep('form')
    setGenerating(false)
    setError('')
    setCandidates([])
    setSelectedKeys(new Set())
    setLastTopic('')
  }, [open, availableTypes])

  const toggleKey = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAll = () => {
    setSelectedKeys(new Set(candidates.map((_, i) => String(i))))
  }

  const selectNone = () => setSelectedKeys(new Set())

  const handleGenerate = async () => {
    const trimmed = topic.trim()
    if (!trimmed) {
      setError('Enter a topic so AI knows what to write about.')
      return
    }
    if (!questionType) {
      setError('Choose a question type for this batch.')
      return
    }
    setError('')
    setGenerating(true)
    try {
      const data = await generateQuestionsWithAiApi(accessToken, {
        topic: trimmed,
        count: Number(count) || 5,
        questionType,
        difficulty,
      })
      const list = Array.isArray(data?.questions) ? data.questions : []
      if (!list.length) {
        setError('No questions came back. Try a clearer topic or a smaller count.')
        return
      }
      setCandidates(list)
      setSelectedKeys(new Set(list.map((_, i) => String(i))))
      setLastTopic(trimmed)
      setStep('results')
    } catch (err) {
      setError(err?.message || 'Generation failed. Check CURSOR_API_KEY on the server.')
    } finally {
      setGenerating(false)
    }
  }

  const handleAdd = () => {
    const picked = candidates.filter((_, i) => selectedKeys.has(String(i)))
    if (!picked.length) {
      setError('Select at least one question to add to your session.')
      return
    }
    onAddSelected?.(picked)
    onClose?.()
  }

  const modalTitle = step === 'results' ? 'Review AI questions' : 'Generate questions with AI'
  const modalSubtitle =
    step === 'results'
      ? `Pick what to keep for “${lastTopic || topic}”. Uncheck anything you don’t want, then add the rest to this draft.`
      : 'Describe your topic and format. AI drafts a batch — you choose which questions to keep.'

  if (!availableTypes.length) {
    return (
      <Modal
        open={open}
        title="Generate questions with AI"
        subtitle="This session type can’t use AI generation yet."
        onClose={onClose}
        size="lg"
      >
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Session locked to {lockedType}</p>
          <p className="mt-1 text-amber-900/90">
            AI currently supports MCQ, Poll, Word Cloud, Rating, Text, True/False, and Ranking.
            Remove existing questions to switch type, or start a new draft session.
          </p>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-blue-200/70 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
          >
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} title={modalTitle} subtitle={modalSubtitle} onClose={onClose} size="lg">
      <div className="flex min-h-0 flex-1 flex-col">
        {step === 'form' ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/90 px-4 py-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-800">
                <Wand2 className="size-4" />
              </span>
              <div className="min-w-0 text-sm leading-relaxed text-sky-950">
                <p className="font-semibold">How it works</p>
                <p className="mt-0.5 text-sky-900/85">
                  1) Set topic & type → 2) AI drafts questions → 3) You select which ones to add.
                  Nothing is saved until you click <strong>Save</strong> on the builder.
                </p>
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Topic
              </span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. JavaScript basics for beginners"
                className="input-modern"
                disabled={generating}
                autoFocus
              />
              <span className="block text-xs text-slate-500">
                Be specific — audience and focus help AI write better questions.
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  How many
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                  className="input-modern"
                  disabled={generating}
                />
                <span className="block text-xs text-slate-500">1–20 questions</span>
              </label>

              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Question type
                </span>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="input-modern"
                  disabled={generating || Boolean(lockedType)}
                >
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <span className="block text-xs text-slate-500">
                  {TYPE_HINTS[questionType] || 'Choose the format for this batch.'}
                  {lockedType ? ' (locked to this session’s type)' : ''}
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Difficulty
              </span>
              <div className="grid gap-2 sm:grid-cols-3">
                {DIFFICULTIES.map((item) => {
                  const active = difficulty === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={generating}
                      onClick={() => setDifficulty(item.id)}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        active
                          ? 'border-navy-700 bg-navy-900 text-white shadow-md shadow-navy-900/20'
                          : 'border-blue-200/70 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/70'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span
                        className={`mt-0.5 block text-xs ${active ? 'text-white/75' : 'text-slate-500'}`}
                      >
                        {item.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                  <ListChecks className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-950">
                    {candidates.length} question{candidates.length === 1 ? '' : 's'} ready
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-900/80">
                    {selectedKeys.size} selected · {questionType}
                    {lastTopic ? ` · ${lastTopic}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="rounded-xl border border-emerald-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="rounded-xl border border-emerald-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50"
                >
                  Clear
                </button>
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Click a card to select or deselect. Correct answers are marked with a green check.
            </p>

            <ul className="max-h-[min(52vh,480px)] space-y-3 overflow-y-auto pr-1">
              {candidates.map((q, index) => {
                const key = String(index)
                const checked = selectedKeys.has(key)
                const hasOptions = Array.isArray(q.options) && q.options.length > 0

                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => toggleKey(key)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        checked
                          ? 'border-navy-600 bg-linear-to-br from-navy-50 to-sky-50/80 shadow-sm shadow-navy-900/10 ring-1 ring-navy-600/20'
                          : 'border-blue-200/70 bg-white hover:border-blue-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex gap-3">
                        <span
                          className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${
                            checked
                              ? 'border-navy-700 bg-navy-900 text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}
                          aria-hidden
                        >
                          {checked ? <Check className="size-3.5" strokeWidth={3} /> : <Circle className="size-3.5" />}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                              Q{index + 1}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                              {q.type || questionType}
                            </span>
                            {checked ? (
                              <span className="text-[11px] font-semibold text-emerald-700">Selected</span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">Tap to select</span>
                            )}
                          </div>

                          <p className="mt-2 text-[15px] font-semibold leading-snug text-navy-900">
                            {q.text}
                          </p>

                          {hasOptions ? (
                            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                              {q.options.map((opt, optIdx) => (
                                <li
                                  key={`${key}-${optIdx}`}
                                  className={`flex items-start gap-2 rounded-xl px-2.5 py-2 text-sm ${
                                    opt.isCorrect
                                      ? 'bg-emerald-50 text-emerald-950'
                                      : 'bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-bold ${
                                      opt.isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white text-slate-500 ring-1 ring-slate-200'
                                    }`}
                                  >
                                    {optionLetter(optIdx)}
                                  </span>
                                  <span className="min-w-0 flex-1 leading-snug">
                                    {opt.text}
                                    {opt.isCorrect ? (
                                      <CheckCircle2 className="ml-1 inline size-3.5 text-emerald-600" aria-label="Correct" />
                                    ) : null}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          {q.type === 'Rating' ? (
                            <p className="mt-2 text-xs font-medium text-slate-500">
                              Rating scale {q.ratingMin ?? 1}–{q.ratingMax ?? 5}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">Couldn’t finish</p>
            <p className="mt-0.5 text-red-700/90">{error}</p>
          </div>
        ) : null}

        <div className="mt-5 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-4">
          {step === 'results' ? (
            <button
              type="button"
              onClick={() => {
                setStep('form')
                setError('')
              }}
              className="rounded-xl border border-blue-200/70 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              ← Edit settings
            </button>
          ) : (
            <p className="max-w-[14rem] text-xs leading-snug text-slate-500">
              {generating
                ? 'Keep this window open while AI works…'
                : 'Takes up to a couple of minutes.'}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-blue-200/70 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
            >
              Cancel
            </button>
            {step === 'form' ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate questions
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={selectedKeys.size === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="size-4" />
                Add selected ({selectedKeys.size})
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
