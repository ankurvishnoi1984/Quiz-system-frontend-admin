const STATUS_LABELS = {
  draft: 'Draft',
  live: 'Live',
  paused: 'Live',
  completed: 'Completed',
}

const STATUS_CHART_COLORS = {
  Draft: '#94A3B8',
  Live: '#10B981',
  Completed: '#1B4B6B',
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getSessionDate(session) {
  const raw = session.created_at || session.date
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function buildWeeklyBuckets(sessions, weekCount = 8) {
  const now = startOfWeek(new Date())
  const buckets = Array.from({ length: weekCount }, (_, index) => {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - (weekCount - 1 - index) * 7)
    return {
      weekStart,
      label: formatWeekLabel(weekStart),
      sessions: 0,
      participants: 0,
    }
  })

  sessions.forEach((session) => {
    const createdAt = getSessionDate(session)
    if (!createdAt) return
    const sessionWeek = startOfWeek(createdAt).getTime()
    const bucket = buckets.find((row) => row.weekStart.getTime() === sessionWeek)
    if (!bucket) return
    bucket.sessions += 1
    bucket.participants += Number(session.participants ?? session.participants_count ?? 0)
  })

  return buckets.map(({ label, sessions: sessionCount, participants }) => ({
    label,
    sessions: sessionCount,
    participants,
  }))
}

export function buildStatusChartData(sessions) {
  const counts = { Draft: 0, Live: 0, Completed: 0 }
  sessions.forEach((session) => {
    const label = STATUS_LABELS[session.status] || session.status
    if (label in counts) counts[label] += 1
  })

  return Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: STATUS_CHART_COLORS[name] || '#64748B',
    }))
}

export function buildRecentSessionEngagement(sessions, limit = 6) {
  return [...sessions]
    .sort((a, b) => {
      const aTime = getSessionDate(a)?.getTime() ?? 0
      const bTime = getSessionDate(b)?.getTime() ?? 0
      return bTime - aTime
    })
    .slice(0, limit)
    .map((session) => {
      const participants = Number(session.participants ?? session.participants_count ?? 0)
      const completed = Number(session.completed_participants ?? 0)
      const completion = Number(session.progress ?? session.completion_progress ?? 0)
      const status = STATUS_LABELS[session.status] || session.status || 'Draft'
      const createdAt = getSessionDate(session)

      return {
        id: session.id || session.session_id,
        title: session.title || 'Untitled',
        status,
        participants,
        completed,
        completion,
        dateLabel: createdAt
          ? createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : '—',
      }
    })
}

function sessionsInMonth(sessions, month, year) {
  return sessions.filter((session) => {
    const createdAt = getSessionDate(session)
    if (!createdAt) return false
    return createdAt.getMonth() === month && createdAt.getFullYear() === year
  })
}

function participantsInRange(sessions, startMs, endMs) {
  return sessions.reduce((sum, session) => {
    const createdAt = getSessionDate(session)
    if (!createdAt) return sum
    const time = createdAt.getTime()
    if (time < startMs || time >= endMs) return sum
    return sum + Number(session.participants ?? session.participants_count ?? 0)
  }, 0)
}

function percentChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export function buildDashboardStats(sessions) {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  const thisMonthSessions = sessionsInMonth(sessions, month, year)
  const lastMonthDate = new Date(year, month - 1, 1)
  const lastMonthSessions = sessionsInMonth(
    sessions,
    lastMonthDate.getMonth(),
    lastMonthDate.getFullYear(),
  )

  const weekMs = 7 * 24 * 60 * 60 * 1000
  const end = now.getTime()
  const startRecent = end - weekMs
  const startPrevious = end - weekMs * 2

  const participantsRecent = participantsInRange(sessions, startRecent, end)
  const participantsPrevious = participantsInRange(sessions, startPrevious, startRecent)

  const totalParticipants = sessions.reduce(
    (sum, session) => sum + Number(session.participants ?? session.participants_count ?? 0),
    0,
  )

  const activeSessions = sessions.filter((session) => session.status === 'Live').length

  const engagementSessions = sessions.filter(
    (session) =>
      (session.status === 'Live' || session.status === 'Completed') &&
      Number(session.participants ?? session.participants_count ?? 0) > 0,
  )
  const avgCompletionRate = engagementSessions.length
    ? Math.round(
        engagementSessions.reduce(
          (sum, session) => sum + Number(session.progress ?? session.completion_progress ?? 0),
          0,
        ) / engagementSessions.length,
      )
    : 0

  const weeklyBuckets = buildWeeklyBuckets(sessions, 10)

  return {
    totalSessions: thisMonthSessions.length,
    sessionsTrendPercent: percentChange(thisMonthSessions.length, lastMonthSessions.length),
    totalParticipants,
    participantsTrendPercent: percentChange(participantsRecent, participantsPrevious),
    avgCompletionRate,
    activeSessions,
    sessionSparkline: weeklyBuckets.map((row) => row.sessions),
    participantSparkline: weeklyBuckets.map((row) => row.participants),
    completionSparkline: weeklyBuckets.map((row) =>
      row.sessions > 0 ? Math.round(row.participants / Math.max(row.sessions, 1)) : 0,
    ),
    liveSparkline: weeklyBuckets.map((row) => row.sessions),
  }
}

export function formatTrendLabel(percent, unit = '%') {
  if (percent === 0) return `No change vs prior period`
  const direction = percent > 0 ? 'Up' : 'Down'
  return `${direction} ${Math.abs(percent)}${unit} vs prior period`
}
