const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000/ws'

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

class RealtimeClient {
  #socket = null
  #url = ''
  #reconnectAttempts = 0
  #handlers = new Map()
  #isConnecting = false
  #manualClose = false

  constructor(url) {
    this.#url = url
  }

  connect() {
    if (this.#socket?.readyState === WebSocket.OPEN || this.#isConnecting) {
      return;
    }
    this.#isConnecting = true;

    try {
      this.#socket = new WebSocket(this.#url);
    } catch (error) {
      this.#isConnecting = false;
      this.#handleError(error);
      return;
    }

    this.#socket.addEventListener("open", () => {
      this.#isConnecting = false;
      this.#reconnectAttempts = 0;
      this.#emit('open', {})
    })

    this.#socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        this.#emit(data.type, data);
      } catch {
        this.#emit('message', event.data)
      }
    })

    this.#socket.addEventListener("error", (event) => {
      this.#handleError(event)
    })

    this.#socket.addEventListener("close", (event) => {
      this.#isConnecting = false;
      this.#emit('close', { code: event.code, reason: event.reason })
      if (!this.#manualClose) this.#attemptReconnect()
    })
  }

  #attemptReconnect() {
    if (this.#reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.#emit('error', { message: 'Max reconnect attempts reached' })
      return
    }
    this.#reconnectAttempts += 1
    this.#emit('reconnecting', { attempt: this.#reconnectAttempts })
    setTimeout(() => this.connect(), RECONNECT_DELAY)
  }

  disconnect() {
    if (this.#socket) {
      this.#manualClose = true
      this.#socket.close(1000, 'Client disconnected')
      this.#socket = null
    }
  }

  send(data) {
    if (this.#socket?.readyState === WebSocket.OPEN) {
      this.#socket.send(JSON.stringify(data))
      return true
    }
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
    this.#emit('error', { message: error.message || 'WebSocket error' })
  }

  get isConnected() {
    return this.#socket?.readyState === WebSocket.OPEN;
  }

  get readyState() {
    return this.#socket?.readyState ?? WebSocket.CLOSED;
  }
}

let globalClient = null

function normalizeBase(base) {
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export function createRealtimeClient(path, options = {}) {
  const { token, session, role } = options
  const params = new URLSearchParams()
  if (session) params.set('session', session)
  if (token) params.set('token', token)
  if (role) params.set('role', role)
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  const url = `${normalizeBase(WS_BASE_URL)}${normalizedPath}?${params.toString()}`
  return new RealtimeClient(url)
}

export function getGlobalClient() {
  return globalClient
}

export function setGlobalClient(client) {
  globalClient = client
}

export function useRealtimeSession(sessionCode, accessToken) {
  const client = createRealtimeClient('', {
    session: sessionCode,
    token: accessToken,
    role: 'host',
  })
  setGlobalClient(client)
  return client
}

export function useRealtimeParticipant(sessionCode, participantToken) {
  const client = createRealtimeClient('', {
    session: sessionCode,
    token: participantToken,
    role: 'participant',
  })
  setGlobalClient(client)
  return client
}

export const RealtimeEvent = {
  CONNECTED: 'connected',
  RESPONSE_RECEIVED: 'response_received',
  SESSION_UPDATED: 'session_updated',
  QUESTION_CHANGED: 'question_changed',
  LEADERBOARD_UPDATE: 'leaderboard_update',
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',
}

export default RealtimeClient