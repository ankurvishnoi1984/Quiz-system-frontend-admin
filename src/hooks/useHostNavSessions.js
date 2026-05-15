import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useShell } from '../context/ShellContext'
import { useAuthStore } from '../store/authStore'
import { listDepartmentSessionsApi } from '../services/dashboardApi'

/**
 * Reuses the same query key as Dashboard so cache stays in sync.
 */
export function useHostNavSessions() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { departmentId } = useShell()

  return useQuery({
    queryKey: ['dashboard-sessions', departmentId],
    queryFn: () => listDepartmentSessionsApi(accessToken, departmentId),
    enabled: Boolean(accessToken && departmentId),
  })
}

/** Backend list is ordered by `session_id` DESC — first row is the newest session. */
export function getLatestSessionId(sessions) {
  const id = sessions?.[0]?.session_id
  return id != null ? String(id) : null
}

/** Prefer an active presenter session; otherwise fall back to the newest session. */
export function getLivePresenterSessionId(sessions) {
  if (!sessions?.length) return null
  const active = sessions.find((s) => s.status === 'live' || s.status === 'paused')
  const id = active?.session_id ?? sessions[0].session_id
  return id != null ? String(id) : null
}

export function getBuilderNavTo(sessions) {
  const id = getLatestSessionId(sessions)
  return id ? `/builder?session=${encodeURIComponent(id)}` : '/dashboard'
}

export function getLiveNavTo(sessions) {
  const id = getLivePresenterSessionId(sessions)
  return id ? `/live?session=${encodeURIComponent(id)}` : '/dashboard'
}

const STATUS_LABEL = {
  draft: 'Draft',
  live: 'Live',
  paused: 'Live',
  completed: 'Completed',
  archived: 'Completed',
}

/** Map API session rows for Reports / Analytics (respects navbar department). */
export function mapDepartmentSessionsForHost(apiSessions, departmentName = '') {
  return (apiSessions || []).map((session) => ({
    id: String(session.session_id),
    session_id: session.session_id,
    title: session.title,
    date: session.created_at ? String(session.created_at).split('T')[0] : '',
    status: STATUS_LABEL[session.status] || session.status || 'Draft',
    participants: session.participants_count ?? 0,
    progress: session.completion_progress ?? 0,
    tags: [],
    department: departmentName || session.department?.name || '',
    joinRequirement: session.join_type ?? 'name',
    questions: [],
  }))
}

export function useDepartmentSessionsList() {
  const { departmentId, department, departments } = useShell()
  const query = useHostNavSessions()

  const sessions = useMemo(() => {
    const deptName =
      departments.find((d) => String(d.dept_id) === String(departmentId))?.name || department || ''
    return mapDepartmentSessionsForHost(query.data, deptName)
  }, [query.data, departmentId, department, departments])

  return { ...query, sessions }
}
