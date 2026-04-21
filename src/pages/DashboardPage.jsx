import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import SessionCard from '../components/dashboard/SessionCard'
import StatCard from '../components/dashboard/StatCard'
import Tabs from '../components/dashboard/Tabs'
import Modal from '../components/ui/Modal'
import { useShell } from '../context/ShellContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

const tabItems = ['All', 'Draft', 'Live', 'Completed']

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
  },
]

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
  const { department: globalDepartment, departments } = useShell()
  const [sessions, setSessions] = useState(initialSessions)
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [department, setDepartment] = useState(globalDepartment)
  const [createOpen, setCreateOpen] = useState(false)

  const debouncedSearch = useDebouncedValue(search, 250).trim().toLowerCase()

  useEffect(() => {
    setDepartment(globalDepartment)
  }, [globalDepartment])

  const filtered = useMemo(() => {
    return sessions
      .filter((s) => (tab === 'All' ? true : s.status === tab))
      .filter((s) => (department ? s.department === department : true))
      .filter((s) => (debouncedSearch ? s.title.toLowerCase().includes(debouncedSearch) : true))
      .filter((s) => {
        if (!fromDate && !toDate) return true
        const d = new Date(s.date).getTime()
        const from = fromDate ? new Date(fromDate).getTime() : -Infinity
        const to = toDate ? new Date(toDate).getTime() : Infinity
        return d >= from && d <= to
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [sessions, tab, department, debouncedSearch, fromDate, toDate])

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
      setSessions((prev) => prev.filter((s) => s.id !== session.id))
      return
    }
    if (action === 'duplicate') {
      setSessions((prev) => [
        {
          ...session,
          id: `S-${Math.floor(1000 + Math.random() * 9000)}`,
          title: `${session.title} (Copy)`,
          status: 'Draft',
          participants: 0,
          progress: 0,
          date: new Date().toISOString().slice(0, 10),
        },
        ...prev,
      ])
      return
    }
    alert(`${action.toUpperCase()}: ${session.title}`)
  }

  const handleCreate = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const type = String(form.get('type') ?? 'Quiz')
    const dept = String(form.get('department') ?? globalDepartment)
    const date = String(form.get('date') ?? new Date().toISOString().slice(0, 10))

    if (!title) return

    setSessions((prev) => [
      {
        id: `S-${Math.floor(1000 + Math.random() * 9000)}`,
        title,
        date,
        status: 'Draft',
        participants: 0,
        progress: 0,
        tags: [type],
        department: dept,
      },
      ...prev,
    ])
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
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-10 rounded-xl border border-blue-200/70 bg-white/90 px-3 text-sm font-medium text-slate-700 shadow-sm shadow-blue-900/5 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              aria-label="Department filter"
            >
              {departments.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
            <label className="text-sm font-semibold text-slate-700">Type</label>
            <select name="type" className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15">
              <option>Quiz</option>
              <option>Poll</option>
              <option>Survey</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Department</label>
            <select name="department" defaultValue={globalDepartment} className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15">
              {departments.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Created date</label>
            <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 h-11 w-full rounded-xl border border-blue-200/70 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15" />
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
    </section>
  )
}

export default DashboardPage

