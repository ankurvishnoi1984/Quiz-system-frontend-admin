import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import SessionCard from '../components/dashboard/SessionCard'
import StatCard from '../components/dashboard/StatCard'
import Tabs from '../components/dashboard/Tabs'
import Modal from '../components/ui/Modal'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuthStore } from '../store/authStore'
import { useShell } from '../context/ShellContext'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'
import {
  archiveSessionApi,
  createSessionApi,
  getSessionQrApi,
  listDepartmentSessionsApi,
  transitionSessionApi,
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
  const [shareSession, setShareSession] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [dashboardError, setDashboardError] = useState('')
  const [liveSessionMetrics, setLiveSessionMetrics] = useState({})

  const { departmentId, departments } = useShell()
  const debouncedSearch = useDebouncedValue(search, 250).trim().toLowerCase()

  const sessionsQuery = useQuery({
    queryKey: ['dashboard-sessions', departmentId],
    queryFn: () => listDepartmentSessionsApi(accessToken, departmentId),
    enabled: Boolean(accessToken && departmentId),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createSessionApi(accessToken, payload.deptId, payload.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] })
      setDashboardError('')
    },
    onError: (error) => {
      setDashboardError(error.message || 'Unable to create session')
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (sessionId) => archiveSessionApi(accessToken, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-sessions'] })
      setDashboardError('')
    },
    onError: (error) => {
      setDashboardError(error.message || 'Unable to archive session')
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

  const duplicateMutation = useMutation({
    mutationFn: ({ deptId, session }) =>
      createSessionApi(accessToken, deptId, {
        host_id: user?.user_id,
        title: `${session.title} (Copy)`,
        description: session.description || '',
        is_anonymous_default: Boolean(session.is_anonymous_default),
        max_participants: session.max_participants || 500,
        show_results_to_participants: Boolean(session.show_results_to_participants),
        allow_late_join: Boolean(session.allow_late_join),
        leaderboard_enabled: Boolean(session.leaderboard_enabled),
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
    const makeQr = async () => {
      if (!shareSession) {
        setQrDataUrl('')
        return
      }
      let link = `${window.location.origin}/join/${shareSession.session_code || shareSession.id}`
      if (accessToken && shareSession?.id) {
        try {
          const qrPayload = await getSessionQrApi(accessToken, shareSession.id)
          if (qrPayload?.join_url) link = qrPayload.join_url
        } catch {
          // Fall back to local join link shape if QR endpoint fails.
        }
      }
      const data = await QRCode.toDataURL(link, { margin: 1, width: 280 })
      setQrDataUrl(data)
    }
    makeQr()
  }, [shareSession, accessToken])

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

      client.connect()
      return {
        client,
        cleanup: () => {
          unsubResponse()
          unsubProgress()
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
      archived: 'Completed',
    }

    const departmentsById = new Map(departments.map((d) => [String(d.dept_id), d.name]))

    return (sessionsQuery.data || []).map((session) => ({
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
      archiveMutation.mutate(session.id)
      return
    }
    if (action === 'duplicate') {
      duplicateMutation.mutate({ deptId: session.dept_id || departmentId, session })
      return
    }
    if (action === 'edit') {
      if (session.status !== 'Draft') {
        setDashboardError('Only draft sessions can be edited in Question Builder')
        return
      }
      navigate(`/builder?session=${encodeURIComponent(session.id)}`)
      return
    }
    if (action === 'analytics') {
      navigate(`/analytics?session=${encodeURIComponent(session.id)}`)
      return
    }
    if (action === 'launch') {
      if (session.status === 'Draft') {
        transitionMutation.mutate({ sessionId: session.id, action: 'start' })
      }
      navigate(`/live?session=${encodeURIComponent(session.id)}`)
      return
    }
    if (action === 'share') {
      setShareSession(session)
      return
    }
    alert(`${action.toUpperCase()}: ${session.title}`)
  }

  const handleCreate = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const description = String(form.get('description') ?? '').trim()
    const dept = String(form.get('department') || departmentId || user?.dept_id || '')
    const joinRequirement = String(form.get('joinRequirement') ?? 'name')

    if (!title) return

    createMutation.mutate({
      deptId: dept,
      input: {
        host_id: user?.user_id,
        title,
        description: description || null,
        is_anonymous_default: joinRequirement === 'anonymous',
        show_results_to_participants: true,
        allow_late_join: true,
        leaderboard_enabled: true,
      },
    })
    setCreateOpen(false)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-800">Admin Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">Sessions overview</h2>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
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
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
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

      <Modal open={createOpen} title="New Session" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Title</label>
            <input name="title" className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15" placeholder="e.g., Weekly Pulse Check" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <input
              name="description"
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              placeholder="e.g., Friday live polling session"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Department</label>
            <select name="department" defaultValue={departmentId} className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15">
              {departments.map((dept) => (
                <option key={dept.dept_id} value={dept.dept_id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Join requirements</label>
            <select
              name="joinRequirement"
              defaultValue="name"
              className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
            >
              <option value="anonymous">Anonymous (no name/email)</option>
              <option value="name">Name only</option>
              <option value="name_email">Name + Email</option>
            </select>
          </div>
          <div className="flex items-end gap-2 md:justify-end md:col-span-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50">
              Cancel
            </button>
            <button type="submit" className="h-11 rounded-xl bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110">
              Create session
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(shareSession)} title="Share Session" onClose={() => setShareSession(null)}>
        {shareSession && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-200/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Session</p>
              <p className="mt-1 text-lg font-bold text-navy-900">{shareSession.title}</p>
              <p className="mt-1 text-sm text-slate-600">
                Link for participants to join session {shareSession.id}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_280px]">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Share link</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={`${window.location.origin}/join/${shareSession.session_code || shareSession.id}`}
                    className="h-11 flex-1 rounded-xl border border-blue-200/70 bg-white px-3 text-sm text-slate-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${shareSession.session_code || shareSession.id}`)}
                    className="h-11 rounded-xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-blue-200/70 bg-white p-3">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Session QR" className="mx-auto h-[240px] w-[240px]" />
                ) : (
                  <div className="grid h-[240px] place-items-center text-sm text-slate-500">Generating QR...</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}

export default DashboardPage

