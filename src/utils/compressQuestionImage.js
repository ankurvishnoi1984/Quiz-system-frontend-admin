import {
  QUESTION_MEDIA_IMAGE_TARGET_BYTES,
  QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES,
} from './questionMedia'

export async function compressQuestionImage(
  file,
  { maxBytes = QUESTION_MEDIA_IMAGE_TARGET_BYTES, maxDimension = 1920, quality = 0.86 } = {},
) {
  if (!file || file.type === 'image/gif') return file
  if (!QUESTION_MEDIA_SUPPORTED_IMAGE_TYPES.includes(file.type)) return file
  if (file.size <= maxBytes) return file

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height, 1))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close?.()
    return file
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, outputType, quality)
  })

  if (!blob || blob.size >= file.size) return file

  const extension = outputType === 'image/png' ? '.png' : '.jpg'
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'

  return new File([blob], `${baseName}${extension}`, { type: outputType })
}
