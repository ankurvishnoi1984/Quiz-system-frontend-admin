const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || ''

export function createRealtimeClient(path, { onOpen, onMessage, onError, onClose } = {}) {
  if (!WS_BASE_URL) return null

  const socket = new WebSocket(`${WS_BASE_URL}${path}`)

  socket.addEventListener('open', () => onOpen?.())
  socket.addEventListener('message', (event) => {
    try {
      const parsed = JSON.parse(event.data)
      onMessage?.(parsed)
    } catch {
      onMessage?.(event.data)
    }
  })
  socket.addEventListener('error', (event) => onError?.(event))
  socket.addEventListener('close', (event) => onClose?.(event))

  return socket
}
