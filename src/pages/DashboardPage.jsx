import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SessionCard from '../components/dashboard/SessionCard'
import SessionFormModal from '../components/dashboard/SessionFormModal'
import ShareSessionPanel from '../components/dashboard/ShareSessionPanel'
import StatCard from '../components/dashboard/StatCard'
import Tabs from '../components/dashboard/Tabs'
import { HostAlertModal } from '../components/live/HostAlertModal'
import Modal from '../components/ui/Modal'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuthStore } from '../store/authStore'
import { useShell } from '../context/ShellContext'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'
import {
  archiveSessionApi,
  createSessionApi,
  duplicateSessionApi,
  listDepartmentSessionsApi,
  transitionSessionApi,
  updateSessionApi,
} from '../services/dashboardApi'

const tabItems = ['All', 'Draft', 'Live', 'Completed']

function randomSparkline(seed = 4, len = 10) {
  const points = []
  let v = seed * 7 + 12
  for (let i = 0; i < len; i++) {
    v = (v * 9301 + 49297) % 233280
    points.push(10 + Math.round((v / 233280) * 90))
  }
  return points
}

function DashboardPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [shareSession, setShareSession] = useState(null)
  const [sessionAlert, setSessionAlert] = useState(null)
  const [deleteConfirmSession, setDeleteConfirmSession] = useState(null)
  const [dashboardError, setDashboardError] = useState('')
  const [liveSessionMetrics, setLiveSessionMetrics] = useState({})

  const { departmentId, departments } = useShell()
  const canSelectDepartmentOnCreate = ['super_admin', 'client_admin', 'dept_admin'].includes(
    user?.role,
  )
  const debouncedSearch = useDebouncedValue(search, 250).trim().toLowerCase()

  const sessionsQuery = useQuery({
    queryKey: ['dashboard-sessions', departmentId],
    queryFn: () => listDepartmentSessionsApi(accessToken, departmentId),
    enabled: Boolean(accessToken && departmentId),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createSessionApi(accessToken, payload.deptId, payload.input),
    onSuccess: (_session, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] })
      setDashboardError('')
      setCreateOpen(false)
      setSessionAlert({
        variant: 'success',
        title: 'Session created',
        message: `"${variables.input.title}" was created successfully.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error, variables) => {
      const title = variables?.input?.title
      setSessionAlert({
        variant: 'error',
        title: 'Could not create session',
        message: title
          ? `Failed to create "${title}". ${error.message || 'Please try again.'}`
          : error.message || 'Unable to create session. Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: ({ sessionId }) => archiveSessionApi(accessToken, sessionId),
    onSuccess: (_session, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] })
      setDashboardError('')
      setDeleteConfirmSession(null)
      setSessionAlert({
        variant: 'success',
        title: 'Session deleted',
        message: variables?.title
          ? `"${variables.title}" was removed successfully.`
          : 'The session was removed successfully.',
        confirmLabel: 'OK',
      })
    },
    onError: (error, variables) => {
      setSessionAlert({
        variant: 'error',
        title: 'Could not delete session',
        message: variables?.title
          ? `Failed to delete "${variables.title}". ${error.message || 'Please try again.'}`
          : error.message || 'Unable to delete session. Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const transitionMutation = useMutation({
    mutationFn: ({ sessionId, action }) => transitionSessionApi(accessToken, sessionId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] })
      setDashboardError('')
    },
    onError: (error) => {
      setDashboardError(error.message || 'Unable to update session status')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ sessionId, input }) => updateSessionApi(accessToken, sessionId, input),
    onSuccess: (_session, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] })
      setDashboardError('')
      setEditSession(null)
      setSessionAlert({
        variant: 'success',
        title: 'Session updated',
        message: `"${variables.input.title}" was saved successfully.`,
        confirmLabel: 'OK',
      })
    },
    onError: (error, variables) => {
      const title = variables?.input?.title
      setSessionAlert({
        variant: 'error',
        title: 'Could not update session',
        message: title
          ? `Failed to save "${title}". ${error.message || 'Please try again.'}`
          : error.message || 'Unable to update session. Please try again.',
        confirmLabel: 'Close',
      })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: ({ session }) =>
      duplicateSessionApi(accessToken, session.id, {
        host_id: user?.user_id,
        title: `${session.title} (Copy)`,
      }),
    onSuccess: (createdSession) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] })
      setDashboardError('')
      navigate(`/builder?session=${encodeURIComponent(createdSession?.session_id)}`)
    },
    onError: (error) => {
      setDashboardError(error.message || 'Unable to duplicate session')
    },
  })

  useEffect(() => {
    const liveSessions = (sessionsQuery.data || []).filter((session) => session.status === 'live' && session.session_code)
    if (!liveSessions.length || !accessToken) return

    const clients = liveSessions.map((session) => {
      const client = createRealtimeClient('', {
        session: session.session_code,
        token: accessToken,
        role: 'host',
      })

      const unsubResponse = client.on(RealtimeEvent.RESPONSE_RECEIVED, (payload) => {
        setLiveSessionMetrics((prev) => {
          const existing = prev[session.session_id] || {}
          return {
            ...prev,
            [session.session_id]: {
              ...existing,
              // Fallback approximation until session_progress arrives.
              participants_count: Math.max(
                Number(existing.participants_count || 0),
                Number(payload?.results?.total_responses || 0),
              ),
            },
          }
        })
      })

      const unsubProgress = client.on('session_progress', (payload) => {
        setLiveSessionMetrics((prev) => ({
          ...prev,
          [session.session_id]: {
            participants_count: payload.participants_count ?? prev[session.session_id]?.participants_count ?? 0,
            completed_participants: payload.completed_participants ?? prev[session.session_id]?.completed_participants ?? 0,
            completion_progress: payload.completion_progress ?? prev[session.session_id]?.completion_progress ?? 0,
          },
        }))
      })

      const unsubSession = client.on('session_updated', (payload) => {
        if (payload?.status) {
          queryClient.setQueryData(['live-session', String(session.session_id)], (old) =>
            old ? { ...old, status: payload.status } : old,
          )
        }
        queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] })
      })

      client.connect()
      return {
        client,
        cleanup: () => {
          unsubResponse()
          unsubProgress()
          unsubSession()
          client.disconnect()
        },
      }
    })

    return () => {
      clients.forEach(({ cleanup }) => cleanup())
    }
  }, [sessionsQuery.data, accessToken])

  const sessions = useMemo(() => {
    const statusLabel = {
      draft: 'Draft',
      live: 'Live',
      paused: 'Live',
      completed: 'Completed',
    }

    const departmentsById = new Map(departments.map((d) => [String(d.dept_id), d.name]))

    return (sessionsQuery.data || [])
      .filter((session) => session.status !== 'archived')
      .map((session) => ({
      ...session,
      id: session.session_id,
      date: (session.created_at || '').slice(0, 10),
      status: statusLabel[session.status] || 'Draft',
      participants: liveSessionMetrics[session.session_id]?.participants_count ?? session.participants_count ?? 0,
      progress:
        session.status === 'completed'
          ? 100
          : liveSessionMetrics[session.session_id]?.completion_progress ?? session.completion_progress ?? 0,
      tags: ['Quiz'],
      department: departmentsById.get(String(session.dept_id)) || `Department ${session.dept_id}`,
    }))
  }, [sessionsQuery.data, departments, liveSessionMetrics])

  const filtered = useMemo(() => {
    return sessions
      .filter((s) => (tab === 'All' ? true : s.status === tab))
      .filter((s) => (debouncedSearch ? s.title.toLowerCase().includes(debouncedSearch) : true))
      .filter((s) => {
        if (!fromDate && !toDate) return true
        const d = new Date(s.date).getTime()
        const from = fromDate ? new Date(fromDate).getTime() : -Infinity
        const to = toDate ? new Date(toDate).getTime() : Infinity
        return d >= from && d <= to
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [sessions, tab, debouncedSearch, fromDate, toDate])

  const stats = useMemo(() => {
    const month = new Date().getMonth()
    const year = new Date().getFullYear()
    const sessionsThisMonth = sessions.filter((s) => {
      const d = new Date(s.date)
      return d.getMonth() === month && d.getFullYear() === year
    })

    const totalParticipants = sessions.reduce((sum, s) => sum + (s.participants ?? 0), 0)
    const activeSessions = sessions.filter((s) => s.status === 'Live').length
    const responseRate = sessions.length ? Math.round(70 + (activeSessions * 5) % 25) : 0

    return {
      totalSessions: sessionsThisMonth.length,
      totalParticipants,
      avgResponseRate: `${responseRate}%`,
      activeSessions,
    }
  }, [sessions])

  const handleAction = (action, session) => {
    if (action === 'delete') {
      if (session.status === 'Live') return
      setDeleteConfirmSession(session)
      return
    }
    if (action === 'duplicate') {
      duplicateMutation.mutate({ session })
      return
    }
    if (action === 'edit-session') {
      const raw = (sessionsQuery.data || []).find(
        (s) => String(s.session_id) === String(session.id),
      )
      setEditSession(raw || session)
      setDashboardError('')
      return
    }
    if (action === 'builder') {
      navigate(`/builder?session=${encodeURIComponent(session.id)}`)
      return
    }
    if (action === 'analytics') {
      navigate(`/analytics?session=${encodeURIComponent(session.id)}`)
      return
    }
    if (action === 'launch') {
      if (session.status === 'Completed') return
      const goLive = () => navigate(`/live?session=${encodeURIComponent(session.id)}`)
      if (session.status === 'Draft') {
        transitionMutation.mutate(
          { sessionId: session.id, action: 'start' },
          {
            onSuccess: (updated) => {
              if (updated) {
                queryClient.setQueryData(['live-session', String(session.id)], (old) =>
                  old ? { ...old, ...updated, status: updated.status } : updated,
                )
              }
              goLive()
            },
            onError: () => goLive(),
          },
        )
        return
      }
      goLive()
      return
    }
    if (action === 'share') {
      setShareSession(session)
      return
    }
    alert(`${action.toUpperCase()}: ${session.title}`)
  }

  const handleCreate = (values) => {
    if (!values.title) return

    createMutation.mutate({
      deptId: values.departmentId || departmentId || user?.dept_id,
      input: {
        host_id: user?.user_id,
        title: values.title,
        description: values.description || null,
        is_anonymous_default: values.joinRequirement === 'anonymous',
        show_results_to_participants: true,
        leaderboard_enabled: values.overallLeaderboard,
        participant_navigation_enabled: values.enableNavigation,
        join_type: values.joinRequirement || 'name',
      },
    })
  }

  const editSessionInitial = useMemo(() => {
    if (!editSession) return null
    const joinType = editSession.join_type || 'name'
    return {
      title: editSession.title ?? '',
      description: editSession.description ?? '',
      departmentId: String(editSession.dept_id ?? ''),
      joinRequirement: joinType,
      enableNavigation: editSession.participant_navigation_enabled !== false,
      overallLeaderboard: editSession.leaderboard_enabled !== false,
    }
  }, [editSession])

  const editSessionLiveSettingsOnly = useMemo(() => {
    if (!editSession) return false
    const status = editSession.status
    return status !== 'draft'
  }, [editSession])

  const editDepartmentLabel = useMemo(() => {
    if (!editSession) return ''
    return (
      departments.find((d) => String(d.dept_id) === String(editSession.dept_id))?.name ||
      editSession.department ||
      `Department ${editSession.dept_id}`
    )
  }, [editSession, departments])

  const createDepartmentLabel = useMemo(() => {
    const activeDepartmentId = String(departmentId || user?.dept_id || '')
    if (!activeDepartmentId) return '—'
    return (
      departments.find((d) => String(d.dept_id) === activeDepartmentId)?.name ||
      `Department ${activeDepartmentId}`
    )
  }, [departmentId, departments, user?.dept_id])

  const handleUpdate = (values) => {
    if (!editSession || !values.title) return

    const sessionId = editSession.session_id ?? editSession.id
    const payload = {
      title: values.title,
      leaderboard_enabled: values.overallLeaderboard,
    }

    if (!editSessionLiveSettingsOnly) {
      Object.assign(payload, {
        description: values.description || null,
        show_results_to_participants: true,
        participant_navigation_enabled: values.enableNavigation,
        join_type: values.joinRequirement || 'name',
      })
    }

    updateMutation.mutate({ sessionId, input: payload })
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Admin Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">Sessions overview</h2>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-navy-700 to-navy-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
        >
          <Plus className="size-4" />
          New Session
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total sessions (this month)"
          value={String(stats.totalSessions)}
          trendLabel="Up 12% vs last month"
          sparkline={randomSparkline(2)}
          accent="navy"
        />
        <StatCard
          label="Total participants"
          value={stats.totalParticipants.toLocaleString()}
          trendLabel="Last 7 days: +348"
          sparkline={randomSparkline(3)}
          accent="blue"
        />
        <StatCard
          label="Avg response rate"
          value={stats.avgResponseRate}
          trendLabel="Stable • variance 2.1%"
          sparkline={randomSparkline(5)}
          accent="indigo"
        />
        <StatCard
          label="Active sessions right now"
          value={String(stats.activeSessions)}
          trendLabel="Real-time live count"
          sparkline={randomSparkline(7)}
          accent="cyan"
          pulse={stats.activeSessions > 0}
        />
      </div>

      {dashboardError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {dashboardError}
        </div>
      ) : null}

      <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-4 shadow-sm shadow-blue-900/5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs items={tabItems} active={tab} onChange={setTab} />

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sessions..."
                className="h-10 w-64 rounded-xl border border-blue-200/70 bg-white/90 pl-9 pr-3 text-sm text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 rounded-xl border border-blue-200/70 bg-white/90 px-3 text-sm text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              aria-label="From date"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 rounded-xl border border-blue-200/70 bg-white/90 px-3 text-sm text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              aria-label="To date"
            />         
          </div>
        </div>
      </div>

      {sessionsQuery.isLoading ? (
        <div className="rounded-2xl border border-blue-200/70 bg-white/70 p-8 text-center text-slate-600">
          Loading sessions...
        </div>
      ) : null}

      {sessionsQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {sessionsQuery.error.message || 'Failed to load sessions'}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((session) => (
          <SessionCard key={session.id} session={session} onAction={handleAction} />
        ))}
        {!filtered.length && (
          <div className="rounded-2xl border border-dashed border-blue-300 bg-white/70 p-10 text-center text-slate-600 shadow-sm lg:col-span-2">
            No sessions found for these filters.
          </div>
        )}
      </div>

      <SessionFormModal
        open={createOpen}
        modalTitle="New Session"
        mode="create"
        departments={departments}
        allowDepartmentSelection={canSelectDepartmentOnCreate}
        defaultDepartmentId={departmentId}
        departmentLabel={createDepartmentLabel}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />

      {editSession ? (
        <SessionFormModal
          key={`edit-${editSession.session_id ?? editSession.id}`}
          open
          modalTitle="Edit Session"
          mode="edit"
          departments={departments}
          defaultDepartmentId={departmentId}
          initialValues={editSessionInitial ?? {}}
          liveSettingsOnly={editSessionLiveSettingsOnly}
          departmentLabel={editDepartmentLabel}
          onClose={() => setEditSession(null)}
          onSubmit={handleUpdate}
          isSubmitting={updateMutation.isPending}
        />
      ) : null}

      <Modal open={Boolean(shareSession)} title="Share Session" onClose={() => setShareSession(null)}>
        {shareSession && (
          <ShareSessionPanel
            session={shareSession}
            accessToken={accessToken}
            sessionDbId={shareSession.id}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleteConfirmSession)}
        title="Delete session?"
        onClose={() => {
          if (!archiveMutation.isPending) setDeleteConfirmSession(null)
        }}
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-navy-900">
            {deleteConfirmSession?.title || 'this session'}
          </span>
          ? This cannot be undone.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={archiveMutation.isPending}
            onClick={() => setDeleteConfirmSession(null)}
            className="h-11 rounded-2xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={archiveMutation.isPending}
            onClick={() => {
              if (!deleteConfirmSession) return
              archiveMutation.mutate({
                sessionId: deleteConfirmSession.id,
                title: deleteConfirmSession.title,
              })
            }}
            className="h-11 rounded-2xl border border-red-200 bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {archiveMutation.isPending ? 'Deleting…' : 'Delete session'}
          </button>
        </div>
      </Modal>

      <HostAlertModal
        open={Boolean(sessionAlert)}
        variant={sessionAlert?.variant ?? 'success'}
        title={sessionAlert?.title ?? ''}
        message={sessionAlert?.message ?? ''}
        confirmLabel={sessionAlert?.confirmLabel ?? 'OK'}
        onClose={() => setSessionAlert(null)}
      />
    </section>
  )
}

export default DashboardPage

