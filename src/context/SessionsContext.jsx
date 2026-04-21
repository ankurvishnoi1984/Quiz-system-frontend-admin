import { createContext, useContext, useEffect, useMemo, useState } from 'react'

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function createDefaultQuestions() {
  return [
    {
      id: uid('q'),
      type: 'MCQ',
      text: 'Which feature matters most to your daily work?',
      media: null,
      points: 10,
      options: [
        { id: uid('opt'), text: 'Performance', isCorrect: true },
        { id: uid('opt'), text: 'UI/UX', isCorrect: false },
        { id: uid('opt'), text: 'Security', isCorrect: false },
      ],
    },
    {
      id: uid('q'),
      type: 'Text',
      text: 'Write one sentence about this sprint.',
      media: null,
      points: 5,
      options: [],
    },
  ]
}

function createDefaultQa() {
  return [
    { id: uid('qa'), text: 'Will the leaderboard update after every question?', moderationStatus: 'pending', answerStatus: 'pending', pinned: false },
    { id: uid('qa'), text: 'Can we extend time for this question?', moderationStatus: 'pending', answerStatus: 'pending', pinned: false },
    { id: uid('qa'), text: 'Is anonymous mode enabled?', moderationStatus: 'pending', answerStatus: 'pending', pinned: false },
  ]
}

const SessionsContext = createContext(null)
const STORAGE_KEY = 'quiz-host:sessions:v1'

const initialSessions = [
  {
    id: 'S-1001',
    title: 'Q2 Townhall Pulse',
    date: '2026-04-10',
    status: 'Live',
    participants: 218,
    progress: 62,
    tags: ['Poll'],
    department: 'Engineering',
    joinRequirement: 'name',
    settings: { anonymous: false, leaderboard: true, maxParticipants: 300, password: '' },
    quizMode: false,
    timeLimitSeconds: 30,
    questions: createDefaultQuestions(),
    qaItems: createDefaultQa(),
  },
  {
    id: 'S-1002',
    title: 'Sales Onboarding Quiz',
    date: '2026-04-08',
    status: 'Draft',
    participants: 0,
    progress: 0,
    tags: ['Quiz'],
    department: 'Sales',
    joinRequirement: 'name_email',
    settings: { anonymous: false, leaderboard: true, maxParticipants: 300, password: '' },
    quizMode: true,
    timeLimitSeconds: 30,
    questions: createDefaultQuestions(),
    qaItems: createDefaultQa(),
  },
  {
    id: 'S-1003',
    title: 'Product Beta Survey',
    date: '2026-04-01',
    status: 'Completed',
    participants: 162,
    progress: 100,
    tags: ['Survey'],
    department: 'Operations',
    joinRequirement: 'anonymous',
    settings: { anonymous: true, leaderboard: false, maxParticipants: 500, password: '' },
    quizMode: false,
    timeLimitSeconds: 0,
    questions: createDefaultQuestions(),
    qaItems: createDefaultQa(),
  },
]

function normalizeSession(session) {
  return {
    ...session,
    settings: session.settings ?? { anonymous: false, leaderboard: true, maxParticipants: 300, password: '' },
    questions: Array.isArray(session.questions) ? session.questions : createDefaultQuestions(),
    qaItems: Array.isArray(session.qaItems) ? session.qaItems : createDefaultQa(),
    joinRequirement: session.joinRequirement ?? 'name',
    quizMode: typeof session.quizMode === 'boolean' ? session.quizMode : false,
    timeLimitSeconds: typeof session.timeLimitSeconds === 'number' ? session.timeLimitSeconds : 30,
  }
}

export function SessionsProvider({ children }) {
  const [sessions, setSessions] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return initialSessions
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return initialSessions
      return parsed.map(normalizeSession)
    } catch {
      return initialSessions
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    } catch {
      // ignore storage errors
    }
  }, [sessions])

  const api = useMemo(() => {
    const getSession = (id) => sessions.find((s) => s.id === id)

    const createSession = ({ title, type, department, date, joinRequirement = 'name' }) => {
      const id = `S-${Math.floor(1000 + Math.random() * 9000)}`
      const newSession = {
        id,
        title,
        date,
        status: 'Draft',
        participants: 0,
        progress: 0,
        tags: [type],
        department,
        joinRequirement,
        settings: { anonymous: joinRequirement === 'anonymous', leaderboard: true, maxParticipants: 300, password: '' },
        quizMode: type === 'Quiz',
        timeLimitSeconds: 30,
        questions: createDefaultQuestions(),
      }
      setSessions((prev) => [newSession, ...prev])
      return id
    }

    const deleteSession = (id) => setSessions((prev) => prev.filter((s) => s.id !== id))

    const duplicateSession = (session) => {
      const id = `S-${Math.floor(1000 + Math.random() * 9000)}`
      const copy = {
        ...session,
        id,
        title: `${session.title} (Copy)`,
        status: 'Draft',
        participants: 0,
        progress: 0,
        date: new Date().toISOString().slice(0, 10),
      }
      setSessions((prev) => [copy, ...prev])
      return id
    }

    const updateSession = (id, patch) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)),
      )
    }

    const saveSession = (id) => {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, lastSavedAt: Date.now() } : s)))
    }

    return { sessions, getSession, createSession, deleteSession, duplicateSession, updateSession, saveSession }
  }, [sessions])

  return <SessionsContext.Provider value={api}>{children}</SessionsContext.Provider>
}

export function useSessions() {
  const ctx = useContext(SessionsContext)
  if (!ctx) throw new Error('useSessions must be used within SessionsProvider')
  return ctx
}

