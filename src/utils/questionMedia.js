export const QUESTION_MEDIA_MAX_BYTES = 10 * 1024 * 1024
export const QUESTION_MEDIA_IMAGE_TARGET_BYTES = 5 * 1024 * 1024

export const QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export const QUESTION_MEDIA_SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

export const QUESTION_MEDIA_SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
]

export const QUESTION_MEDIA_ACCEPT = [
  ...QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES,
  ...QUESTION_MEDIA_SUPPORTED_VIDEO_TYPES,
  ...QUESTION_MEDIA_SUPPORTED_AUDIO_TYPES,
].join(',')

export const QUESTION_MEDIA_BANNER = {
  title: 'Images, videos, and audio',
  images: 'JPEG, PNG, WebP, GIF',
  videos: 'MP4, WebM, MOV',
  audio: 'MP3, WAV, M4A, AAC, OGG, WebM',
  maxSize: '10 MB max per file (images are compressed before upload)',
}

function getUploadsOrigin() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
  try {
    return new URL(apiBase).origin
  } catch {
    return 'http://localhost:5000'
  }
}

/** Turn stored `/uploads/...` or absolute URLs into a browser-loadable URL. */
export function resolveQuestionMediaUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      if (parsed.pathname.startsWith('/uploads/')) {
        return `${getUploadsOrigin()}${parsed.pathname}`
      }
    } catch {
      return trimmed
    }
    return trimmed
  }

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${getUploadsOrigin()}${path}`
}

/** Persist path-only URLs so environments can resolve the correct host on read. */
export function normalizeQuestionMediaUrlForStorage(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('/uploads/')) return trimmed

  try {
    const parsed = new URL(trimmed)
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname
    }
  } catch {
    // fall through
  }

  return trimmed
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export function getQuestionMediaKind(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') return null
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('image/')) return 'image'
  return null
}

export function getQuestionMediaKindFromApiType(mediaType) {
  if (!mediaType) return 'image'
  const normalized = String(mediaType).toLowerCase()
  if (normalized.includes('video')) return 'video'
  if (normalized.includes('audio')) return 'audio'
  return 'image'
}

export function mapMimeToQuestionMediaType(mimeType) {
  if (mimeType === 'image/gif') return 'gif'
  if (mimeType?.startsWith('image/')) return 'image'
  if (mimeType?.startsWith('video/')) return 'video_file'
  if (mimeType?.startsWith('audio/')) return 'audio_file'
  return null
}

export function mapApiMediaToQuestionMedia(question) {
  if (!question?.media_url) return null

  return {
    url: resolveQuestionMediaUrl(question.media_url),
    kind: getQuestionMediaKindFromApiType(question.media_type),
    mimeType: question.media_type || null,
    mediaType: question.media_type || null,
    fileName: null,
    fileSize: null,
    assetId: null,
  }
}

export function buildQuestionMediaPayload(media) {
  if (!media?.url) {
    return {
      media_url: null,
      media_type: null,
      media_thumbnail_url: null,
    }
  }

  const mediaType =
    media.mediaType ||
    mapMimeToQuestionMediaType(media.mimeType) ||
    (media.kind === 'video' ? 'video_file' : media.kind === 'audio' ? 'audio_file' : 'image')

  return {
    media_url: media.url,
    media_type: mediaType,
    media_thumbnail_url: media.thumbnailUrl || null,
  }
}

export function validateQuestionMediaFile(file) {
  if (!file) return 'No file selected'

  const kind = getQuestionMediaKind(file.type)
  if (!kind) {
    return `Unsupported file type. Allowed: ${QUESTION_MEDIA_BANNER.images}, ${QUESTION_MEDIA_BANNER.videos}, ${QUESTION_MEDIA_BANNER.audio}`
  }

  const allowedTypes =
    kind === 'video'
      ? QUESTION_MEDIA_SUPPORTED_VIDEO_TYPES
      : kind === 'audio'
        ? QUESTION_MEDIA_SUPPORTED_AUDIO_TYPES
        : QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES

  if (!allowedTypes.includes(file.type)) {
    return `Unsupported ${kind} format. Allowed: ${
      kind === 'video'
        ? QUESTION_MEDIA_BANNER.videos
        : kind === 'audio'
          ? QUESTION_MEDIA_BANNER.audio
          : QUESTION_MEDIA_BANNER.images
    }`
  }

  if (file.size > QUESTION_MEDIA_MAX_BYTES) {
    return `File is too large (${formatBytes(file.size)}). Maximum size is ${formatBytes(QUESTION_MEDIA_MAX_BYTES)}.`
  }

  return null
}

export function createUploadedQuestionMedia({ fileUrl, assetId, file, mimeType }) {
  const kind = getQuestionMediaKind(mimeType || file.type)
  return {
    url: resolveQuestionMediaUrl(fileUrl),
    kind,
    mimeType: mimeType || file.type,
    mediaType: mapMimeToQuestionMediaType(mimeType || file.type),
    fileName: file.name,
    fileSize: file.size,
    assetId: assetId ?? null,
  }
}
