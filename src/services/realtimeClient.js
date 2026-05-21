const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000/ws'

const RECONNECT_BASE_DELAY_MS = 3000
const RECONNECT_MAX_DELAY_MS = 30000
const MAX_RECONNECT_ATTEMPTS = 8
const STRICT_MODE_CONNECT_DELAY_MS = 80

/** Log in dev or when VITE_WS_DEBUG=true */
const WS_DEBUG =
  import.meta.env.DEV || String(import.meta.env.VITE_WS_DEBUG || '').toLowerCase() === 'true'

function wsLog(level, message, meta) {
  if (!WS_DEBUG) return
  const payload = meta !== undefined ? meta : ''
  const fn = console[level] || console.log
  fn.call(console, `[WS] ${message}`, payload)
}

function normalizeBase(base) {
  const trimmed = String(base || '').trim()
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

function readyStateLabel(state) {
  switch (state) {
    case WebSocket.CONNECTING:
      return 'CONNECTING'
    case WebSocket.OPEN:
      return 'OPEN'
    case WebSocket.CLOSING:
      return 'CLOSING'
    case WebSocket.CLOSED:
      return 'CLOSED'
    default:
      return `UNKNOWN(${state})`
  }
}

/**
 * Build WS URL with encoded query params (JWT-safe).
 */
export function buildRealtimeWsUrl(path, options = {}) {
  const { token, session, role } = options
  const parts = []
  if (session != null && session !== '') {
    parts.push(`session=${encodeURIComponent(String(session))}`)
  }
  if (token != null && token !== '') {
    parts.push(`token=${encodeURIComponent(String(token))}`)
  }
  if (role != null && role !== '') {
    parts.push(`role=${encodeURIComponent(String(role))}`)
  }
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  const query = parts.length ? `?${parts.join('&')}` : ''
  return `${normalizeBase(WS_BASE_URL)}${normalizedPath}${query}`
}

class RealtimeClient {
  #socket = null
  #url = ''
  /** Bumped on disconnect / supersede — stale socket events are ignored */
  #generation = 0
  #reconnectAttempts = 0
  #handlers = new Map()
  #isConnecting = false
  #manualClose = false
  #reconnectTimer = null
  #connectDelayTimer = null
  #label = 'client'

  constructor(url, label = 'client') {
    this.#url = url
    this.#label = label
    wsLog('debug', 'client created', { label, url: maskWsUrl(url) })
  }

  connect() {
    if (this.#manualClose) {
      this.#manualClose = false
    }

    if (this.#socket?.readyState === WebSocket.OPEN) {
      wsLog('debug', 'connect skipped — already OPEN', { label: this.#label })
      return
    }

    if (this.#isConnecting) {
      wsLog('debug', 'connect skipped — already CONNECTING', { label: this.#label })
      return
    }

    this.#clearConnectDelayTimer()
    this.#clearReconnectTimer()

    const runConnect = () => {
      const gen = ++this.#generation
      this.#isConnecting = true

      wsLog('info', 'connecting', {
        label: this.#label,
        generation: gen,
        attempt: this.#reconnectAttempts + 1,
        url: maskWsUrl(this.#url),
      })

      let socket
      try {
        socket = new WebSocket(this.#url)
      } catch (error) {
        this.#isConnecting = false
        wsLog('error', 'connect threw', { label: this.#label, message: error.message })
        this.#handleError(error)
        this.#scheduleReconnect()
        return
      }

      this.#socket = socket

      socket.addEventListener('open', () => {
        if (!this.#isActiveSocket(socket, gen)) {
          wsLog('debug', 'onopen ignored (stale)', {
            label: this.#label,
            generation: gen,
            current: this.#generation,
          })
          this.#safeCloseSocket(socket, 1000, 'Superseded')
          return
        }

        this.#isConnecting = false
        this.#reconnectAttempts = 0
        wsLog('info', 'onopen', { label: this.#label, generation: gen })
        this.#emit('open', { generation: gen })
      })

      socket.addEventListener('message', (event) => {
        if (!this.#isActiveSocket(socket, gen)) return
        try {
          const data = JSON.parse(event.data)
          this.#emit(data.type, data)
        } catch {
          this.#emit('message', event.data)
        }
      })

      socket.addEventListener('error', (event) => {
        if (!this.#isActiveSocket(socket, gen)) {
          wsLog('debug', 'onerror ignored (stale)', { label: this.#label, generation: gen })
          return
        }
        wsLog('error', 'onerror', {
          label: this.#label,
          generation: gen,
          readyState: readyStateLabel(socket.readyState),
        })
        this.#handleError(event)
      })

      socket.addEventListener('close', (event) => {
        const stale = !this.#isActiveSocket(socket, gen)
        wsLog(stale ? 'debug' : 'info', stale ? 'onclose ignored (stale)' : 'onclose', {
          label: this.#label,
          generation: gen,
          code: event.code,
          reason: event.reason || '(none)',
          wasClean: event.wasClean,
          readyState: readyStateLabel(socket.readyState),
        })

        if (stale) return

        this.#isConnecting = false
        if (this.#socket === socket) {
          this.#socket = null
        }

        this.#emit('close', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          generation: gen,
        })

        if (!this.#manualClose) {
          this.#scheduleReconnect()
        }
      })
    }

    // Brief delay helps React StrictMode (mount → unmount → remount) avoid racing teardown
    if (STRICT_MODE_CONNECT_DELAY_MS > 0) {
      this.#connectDelayTimer = setTimeout(() => {
        this.#connectDelayTimer = null
        if (this.#manualClose) return
        runConnect()
      }, STRICT_MODE_CONNECT_DELAY_MS)
    } else {
      runConnect()
    }
  }

  #isActiveSocket(socket, gen) {
    return this.#socket === socket && gen === this.#generation && !this.#manualClose
  }

  #safeCloseSocket(socket, code, reason) {
    if (!socket) return
    try {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(code, reason)
      }
    } catch (error) {
      wsLog('debug', 'safeCloseSocket failed', { message: error.message })
    }
  }

  #scheduleReconnect() {
    if (this.#manualClose) return
    if (this.#reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      wsLog('error', 'max reconnect attempts reached', { label: this.#label })
      this.#emit('error', { message: 'Max reconnect attempts reached' })
      return
    }

    this.#reconnectAttempts += 1
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** (this.#reconnectAttempts - 1),
      RECONNECT_MAX_DELAY_MS,
    )

    wsLog('info', 'reconnect scheduled', {
      label: this.#label,
      attempt: this.#reconnectAttempts,
      delayMs: delay,
    })

    this.#emit('reconnecting', { attempt: this.#reconnectAttempts, delayMs: delay })

    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null
      if (this.#manualClose) return
      this.connect()
    }, delay)
  }

  #clearReconnectTimer() {
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer)
      this.#reconnectTimer = null
    }
  }

  #clearConnectDelayTimer() {
    if (this.#connectDelayTimer) {
      clearTimeout(this.#connectDelayTimer)
      this.#connectDelayTimer = null
    }
  }

  disconnect() {
    wsLog('info', 'disconnect called', {
      label: this.#label,
      readyState: this.#socket ? readyStateLabel(this.#socket.readyState) : 'none',
    })

    this.#manualClose = true
    this.#generation += 1
    this.#clearReconnectTimer()
    this.#clearConnectDelayTimer()

    const socket = this.#socket
    this.#socket = null
    this.#isConnecting = false

    if (!socket) return

    // Do NOT call close() while CONNECTING — that triggers
    // "WebSocket is closed before the connection is established".
    // Orphan the socket; if it opens, the stale handler closes it quietly.
    if (socket.readyState === WebSocket.CONNECTING) {
      wsLog('debug', 'disconnect during CONNECTING — orphan socket (no close())', {
        label: this.#label,
      })
      return
    }

    if (socket.readyState === WebSocket.OPEN) {
      this.#safeCloseSocket(socket, 1000, 'Client disconnected')
    }
  }

  send(data) {
    if (this.#socket?.readyState === WebSocket.OPEN) {
      this.#socket.send(JSON.stringify(data))
      return true
    }
    wsLog('debug', 'send skipped — socket not OPEN', {
      label: this.#label,
      readyState: this.#socket ? readyStateLabel(this.#socket.readyState) : 'none',
    })
    return false
  }

  on(event, handler) {
    if (!this.#handlers.has(event)) {
      this.#handlers.set(event, new Set())
    }
    this.#handlers.get(event).add(handler)
    return () => this.off(event, handler)
  }

  off(event, handler) {
    this.#handlers.get(event)?.delete(handler)
  }

  #emit(event, data) {
    this.#handlers.get(event)?.forEach((handler) => handler(data))
    this.#handlers.get('*')?.forEach((handler) => handler({ type: event, ...data }))
  }

  #handleError(error) {
    const message =
      error?.message ||
      (error?.type === 'error' ? 'WebSocket error event' : 'WebSocket error')
    this.#emit('error', { message })
  }

  get isConnected() {
    return this.#socket?.readyState === WebSocket.OPEN
  }

  get readyState() {
    return this.#socket?.readyState ?? WebSocket.CLOSED
  }
}

/** Mask JWT in logs */
function maskWsUrl(url) {
  try {
    const u = new URL(url)
    const token = u.searchParams.get('token')
    if (token) {
      u.searchParams.set('token', `${token.slice(0, 12)}…(${token.length} chars)`)
    }
    return u.toString()
  } catch {
    return url.replace(/token=[^&]+/, 'token=***')
  }
}

let globalClient = null

export function createRealtimeClient(path, options = {}, label) {
  const url = buildRealtimeWsUrl(path, options)
  const role = options.role || 'client'
  return new RealtimeClient(url, label || role)
}

export function getGlobalClient() {
  return globalClient
}

export function setGlobalClient(client) {
  globalClient = client
}

export function useRealtimeSession(sessionCode, accessToken) {
  const client = createRealtimeClient(
    '',
    { session: sessionCode, token: accessToken, role: 'host' },
    'host',
  )
  setGlobalClient(client)
  return client
}

export function useRealtimeParticipant(sessionCode, participantToken) {
  const client = createRealtimeClient(
    '',
    { session: sessionCode, token: participantToken, role: 'participant' },
    'participant',
  )
  setGlobalClient(client)
  return client
}

export const RealtimeEvent = {
  CONNECTED: 'connected',
  RESPONSE_RECEIVED: 'response_received',
  SESSION_UPDATED: 'session_updated',
  QUESTION_CHANGED: 'question_changed',
  ANSWER_REVEALED: 'answer_revealed',
  QUESTION_LEADERBOARD_VISIBILITY: 'question_leaderboard_visibility',
  SESSION_SETTINGS_UPDATED: 'session_settings_updated',
  LEADERBOARD_UPDATE: 'leaderboard_update',
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',
}

export default RealtimeClient
