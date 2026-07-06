import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { listDepartmentSessionsApi } from '../services/dashboardApi'
import { listDepartmentsApi } from '../services/dashboardApi'

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
    { id: uid('qa'), text: 'Will the rankings update after every question?', moderationStatus: 'pending', answerStatus: 'pending', pinned: false },
    { id: uid('qa'), text: 'Can we extend time for this question?', moderationStatus: 'pending', answerStatus: 'pending', pinned: false },
    { id: uid('qa'), text: 'Is anonymous mode enabled?', moderationStatus: 'pending', answerStatus: 'pending', pinned: false },
  ]
}

function mapApiSessionToLocal(session) {
  return {
    id: session.session_id,
    session_id: session.session_id,
    title: session.title,
    date: session.created_at ? session.created_at.split('T')[0] : '',
    status: session.status === 'live' ? 'Live' : session.status === 'completed' ? 'Completed' : session.status === 'draft' ? 'Draft' : session.status === 'paused' ? 'Paused' : session.status,
    participants: session.participants_count ?? 0,
    progress: session.completion_progress ?? 0,
    tags: [],
    department: session.department?.name ?? '',
    joinRequirement: session.join_type ?? 'name',
    settings: {
      anonymous: session.join_type === 'anonymous',
      leaderboard: session.leaderboard_enabled ?? false,
      maxParticipants: session.max_participants ?? 300,
      password: '',
    },
    quizMode: false,
    timeLimitSeconds: 30,
    questions: createDefaultQuestions(),
    qaItems: createDefaultQa(),
    host: session.host ? { id: session.host.user_id, name: session.host.full_name } : null,
    dept_id: session.dept_id,
  }
}

const SessionsContext = createContext(null)

export function SessionsProvider({ children }) {
  const { accessToken, user } = useAuthStore()

  const userRole = user?.role
  const userDeptId = user?.dept_id

  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ['all-sessions', userRole, userDeptId],
    queryFn: async () => {
      if (!accessToken) return []

      if (userRole === 'host' && userDeptId) {
        const sessions = await listDepartmentSessionsApi(accessToken, userDeptId)
        return sessions.map(mapApiSessionToLocal)
      }

      if (userRole === 'dept_admin' && userDeptId) {
        const sessions = await listDepartmentSessionsApi(accessToken, userDeptId)
        return sessions.map(mapApiSessionToLocal)
      }

      if (userRole === 'super_admin' || userRole === 'client_admin') {
        const departments = await listDepartmentsApi(accessToken)
        if (departments.length === 0) return []

        const allResults = await Promise.all(
          departments.map((dept) => listDepartmentSessionsApi(accessToken, dept.dept_id))
        )
        return allResults.flat().map(mapApiSessionToLocal)
      }

      return []
    },
    enabled: !!accessToken && !!userRole,
  })

  const [localSessions, setLocalSessions] = useState([])

  const sessions = allSessions.length > 0 ? allSessions : localSessions

  useEffect(() => {
    if (!accessToken || !user) {
      setLocalSessions([])
    }
  }, [accessToken, user])

  const api = useMemo(() => {
    const getSession = (id) => sessions.find((s) => s.id === id || s.session_id === id)

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
        settings: { anonymous: joinRequirement === 'anonymous', leaderboard: false, maxParticipants: 300, password: '' },
        quizMode: type === 'Quiz',
        timeLimitSeconds: 30,
        questions: createDefaultQuestions(),
      }
      setLocalSessions((prev) => [newSession, ...prev])
      return id
    }

    const deleteSession = (id) => {
      if (allSessions.length > 0) {
        return
      }
      setLocalSessions((prev) => prev.filter((s) => s.id !== id))
    }

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
      setLocalSessions((prev) => [copy, ...prev])
      return id
    }

    const updateSession = (id, patch) => {
      if (allSessions.length > 0) {
        return
      }
      setLocalSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)),
      )
    }

    const saveSession = (id) => {
      if (allSessions.length > 0) {
        return
      }
      setLocalSessions((prev) => prev.map((s) => (s.id === id ? { ...s, lastSavedAt: Date.now() } : s)))
    }

    return { sessions, getSession, createSession, deleteSession, duplicateSession, updateSession, saveSession, isLoading }
  }, [sessions, allSessions.length])

  return <SessionsContext.Provider value={api}>{children}</SessionsContext.Provider>
}

export function useSessions() {
  const ctx = useContext(SessionsContext)
  if (!ctx) throw new Error('useSessions must be used within SessionsProvider')
  return ctx
}

