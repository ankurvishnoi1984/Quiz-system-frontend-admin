import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import Modal from '../ui/Modal'
import {
  importQuestionsApi,
  previewQuestionImportApi,
} from '../../services/builderApi'
import { parseQuestionImportFile } from '../../utils/questionImportParser'
import { downloadQuestionImportTemplate } from '../../utils/questionImportTemplate'

export function QuestionImportModal({
  open,
  onClose,
  accessToken,
  sessionId,
  existingQuestionCount = 0,
  onImported,
}) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('append')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const reset = () => {
    setFile(null)
    setMode('append')
    setPreview(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const close = () => {
    if (isPreviewing || isImporting) return
    reset()
    onClose()
  }

  const generatePreview = async (nextFile = file, nextMode = mode) => {
    if (!nextFile) return
    setIsPreviewing(true)
    setError('')
    try {
      const rows = await parseQuestionImportFile(nextFile)
      const data = await previewQuestionImportApi(
        accessToken,
        sessionId,
        { filename: nextFile.name, rows },
        nextMode,
      )
      setPreview(data)
    } catch (previewError) {
      setPreview(null)
      setError(previewError.message || 'Unable to preview this workbook.')
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleFile = (nextFile) => {
    setFile(nextFile || null)
    setPreview(null)
    setError('')
    if (nextFile) generatePreview(nextFile, mode)
  }

  const handleMode = (nextMode) => {
    setMode(nextMode)
    setPreview(null)
    setError('')
    if (file) generatePreview(file, nextMode)
  }

  const handleImport = async () => {
    if (!preview || preview.invalid_rows > 0 || !preview.rows?.length) return
    setIsImporting(true)
    setError('')
    try {
      const result = await importQuestionsApi(accessToken, sessionId, {
        mode,
        questions: preview.rows.map((row) => row.payload),
      })
      await onImported?.(result)
      reset()
      onClose()
    } catch (importError) {
      const details = Array.isArray(importError.details)
        ? importError.details.flatMap((row) => row.errors || [])
        : []
      setError(
        details[0] ||
          importError.message ||
          'Unable to import questions. Please review the workbook.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Modal open={open} title="Upload questions from Excel" onClose={close}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-navy-700" />
            <div>
              <p className="text-sm font-semibold text-navy-900">Use the provided .xlsx format</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Maximum 500 questions and 5MB. All rows must use one top-level question type;
                Survey rows may mix survey formats.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadQuestionImportTemplate()}
                  className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-blue-50"
                >
                  Download empty template
                </button>
                <button
                  type="button"
                  onClick={() => downloadQuestionImportTemplate({ includeExamples: true })}
                  className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-blue-50"
                >
                  Download sample
                </button>
              </div>
            </div>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-slate-700">Import behavior</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-blue-200/70 p-3">
            <input
              type="radio"
              name="question-import-mode"
              value="append"
              checked={mode === 'append'}
              disabled={isPreviewing || isImporting}
              onChange={() => handleMode('append')}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-navy-900">Append questions</span>
              <span className="block text-xs text-slate-600">
                Keep the existing {existingQuestionCount} question
                {existingQuestionCount === 1 ? '' : 's'} and add imported rows after them.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-red-200/80 bg-red-50/40 p-3">
            <input
              type="radio"
              name="question-import-mode"
              value="replace"
              checked={mode === 'replace'}
              disabled={isPreviewing || isImporting}
              onChange={() => handleMode('replace')}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-red-900">
                Replace all existing questions
              </span>
              <span className="block text-xs text-red-700">
                Permanently remove the current questions when import is confirmed.
              </span>
            </span>
          </label>
        </fieldset>

        <label className="block rounded-2xl border-2 border-dashed border-blue-200 bg-slate-50/70 p-5 text-center transition hover:border-blue-400">
          <Upload className="mx-auto size-7 text-navy-700" />
          <span className="mt-2 block text-sm font-semibold text-navy-900">
            {file?.name || 'Choose an Excel workbook'}
          </span>
          <span className="mt-1 block text-xs text-slate-500">.xlsx only, up to 5MB</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={isPreviewing || isImporting}
            onChange={(event) => handleFile(event.target.files?.[0])}
            className="sr-only"
          />
        </label>

        {isPreviewing ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-navy-800">
            Reading and validating workbook…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {preview ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {preview.total_rows} rows
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {preview.valid_rows} valid
              </span>
              {preview.invalid_rows ? (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                  {preview.invalid_rows} need attention
                </span>
              ) : null}
            </div>
            <div className="max-h-72 overflow-auto rounded-2xl border border-blue-200/70">
              <table className="min-w-full divide-y divide-blue-100 text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 bg-white">
                  {preview.rows.map((row) => (
                    <tr key={row.row} className={row.valid ? '' : 'bg-red-50/50'}>
                      <td className="px-3 py-2 font-semibold text-slate-600">{row.row}</td>
                      <td className="max-w-xs px-3 py-2">
                        <p className="line-clamp-2 font-medium text-slate-800">
                          {row.question_text || 'Untitled'}
                        </p>
                        {!row.valid ? (
                          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-red-700">
                            {row.errors.map((rowError) => (
                              <li key={rowError}>{rowError}</li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                        {row.question_type}
                        {row.survey_subtype ? ` / ${row.survey_subtype}` : ''}
                      </td>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <CheckCircle2 className="size-4 text-emerald-600" aria-label="Valid" />
                        ) : (
                          <AlertTriangle className="size-4 text-red-600" aria-label="Invalid" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-blue-100 pt-4">
          <button
            type="button"
            onClick={close}
            disabled={isPreviewing || isImporting}
            className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={
              isPreviewing ||
              isImporting ||
              !preview ||
              preview.invalid_rows > 0 ||
              !preview.rows?.length
            }
            className="rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting
              ? 'Importing…'
              : mode === 'replace'
                ? `Replace with ${preview?.valid_rows || 0} questions`
                : `Import ${preview?.valid_rows || 0} questions`}
          </button>
        </div>
      </div>
    </Modal>
  )
}

