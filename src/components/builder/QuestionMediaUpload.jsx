import { FileUp, Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { uploadQuestionMediaApi } from '../../services/mediaApi'
import { compressQuestionImage } from '../../utils/compressQuestionImage'
import {
  QUESTION_MEDIA_ACCEPT,
  QUESTION_MEDIA_BANNER,
  createUploadedQuestionMedia,
  formatBytes,
  resolveQuestionMediaUrl,
  validateQuestionMediaFile,
} from '../../utils/questionMedia'

export function QuestionMediaUpload({
  media,
  onChange,
  disabled = false,
  deptId,
  onError,
}) {
  const inputRef = useRef(null)
  const previewUrlRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localError, setLocalError] = useState('')

  const clearPreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }

  useEffect(() => clearPreviewUrl, [])

  const reportError = (message) => {
    setLocalError(message)
    onError?.(message)
  }

  const handleUpload = async (file) => {
    if (disabled || uploading) return

    const validationError = validateQuestionMediaFile(file)
    if (validationError) {
      reportError(validationError)
      return
    }

    if (!deptId) {
      reportError('Session department is not loaded yet. Try again in a moment.')
      return
    }

    setLocalError('')
    setUploading(true)

    try {
      const preparedFile =
        file.type.startsWith('image/') && file.type !== 'image/gif'
          ? await compressQuestionImage(file)
          : file

      const { assetId, fileUrl } = await uploadQuestionMediaApi(deptId, preparedFile)
      if (!fileUrl) {
        throw new Error('Upload succeeded but no file URL was returned')
      }

      clearPreviewUrl()
      onChange(
        createUploadedQuestionMedia({
          fileUrl,
          assetId,
          file: preparedFile,
          mimeType: preparedFile.type,
        }),
      )
    } catch (err) {
      reportError(err.message || 'Failed to upload media')
    } finally {
      setUploading(false)
    }
  }

  const onFiles = (files) => {
    const file = files?.[0]
    if (!file) return
    handleUpload(file)
  }

  const pickFile = () => {
    if (disabled || uploading) return
    inputRef.current?.click()
  }

  const handleRemove = () => {
    if (disabled || uploading) return
    clearPreviewUrl()
    setLocalError('')
    onChange(null)
  }

  const previewUrl = resolveQuestionMediaUrl(media?.url)
  const displaySize = media?.fileSize ? formatBytes(media.fileSize) : ''
  const displayName = media?.fileName || 'Uploaded media'

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs text-sky-950">
        <p className="font-semibold">{QUESTION_MEDIA_BANNER.title}</p>
        <p className="mt-0.5 text-sky-900/90">
          Images: {QUESTION_MEDIA_BANNER.images} · Videos: {QUESTION_MEDIA_BANNER.videos}
        </p>
        <p className="mt-0.5 text-sky-900/90">
          Audio: {QUESTION_MEDIA_BANNER.audio} · {QUESTION_MEDIA_BANNER.maxSize}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={QUESTION_MEDIA_ACCEPT}
        disabled={disabled || uploading}
        onChange={(e) => {
          onFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div
        className={`rounded-2xl border border-dashed p-4 transition ${
          disabled ? 'pointer-events-none opacity-60' : ''
        } ${dragOver && !disabled ? 'border-blue-400 bg-blue-50/70' : 'border-blue-300 bg-white/60'}`}
        onDragEnter={(e) => {
          if (disabled || uploading) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragOver={(e) => {
          if (disabled || uploading) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (disabled || uploading) return
          e.preventDefault()
          setDragOver(false)
          onFiles(e.dataTransfer.files)
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-linear-to-br from-navy-600 to-navy-500 text-white">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">Question media</p>
              <p className="text-xs text-slate-600">
                {uploading ? 'Uploading and compressing…' : 'Drag & drop or browse an image, video, or audio file'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={pickFile}
            disabled={disabled || uploading}
            className="rounded-xl border border-blue-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Browse'}
          </button>
        </div>

        {localError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {localError}
          </p>
        ) : null}

        {previewUrl ? (
          <div className="mt-4 rounded-2xl border border-blue-200/70 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy-900">{displayName}</p>
                {displaySize ? <p className="text-xs text-slate-600">{displaySize}</p> : null}
              </div>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || uploading}
                className="rounded-xl border border-blue-200/70 p-2 text-slate-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Remove media"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-blue-100 bg-slate-50">
              {media?.kind === 'video' ? (
                <video src={previewUrl} controls className="max-h-72 w-full" />
              ) : media?.kind === 'audio' ? (
                <div className="px-4 py-5">
                  <audio src={previewUrl} controls className="w-full" />
                </div>
              ) : (
                <img src={previewUrl} alt="Question media preview" className="max-h-72 w-full object-contain" />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
