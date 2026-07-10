import { getChartColor } from './chartColors'

const ROLE_LABELS = {
  participant: 'Participant',
  host: 'Host',
  viewer: 'Present viewer',
  unknown: 'Unknown',
}

const AUTH_STATUS_LABELS = {
  participant_ok: 'Participant (auth)',
  staff_ok: 'Staff (auth)',
  presenter_viewer_ok: 'Presenter viewer (auth)',
  anonymous: 'No token',
  token_expired: 'Token expired',
  token_invalid: 'Token invalid',
  token_error: 'Token error',
  token_unknown_role: 'Unknown role',
  unknown: 'Unknown',
}

export function formatMonitorRole(role) {
  return ROLE_LABELS[role] || role
}

export function formatAuthStatus(status) {
  return AUTH_STATUS_LABELS[status] || status
}

export function buildRoleChartData(byRole = {}) {
  return Object.entries(byRole)
    .map(([role, value], index) => ({
      name: formatMonitorRole(role),
      role,
      value: Number(value) || 0,
      fill: getChartColor(index),
    }))
    .sort((a, b) => b.value - a.value)
}

export function buildAuthChartData(byAuthStatus = {}) {
  return Object.entries(byAuthStatus)
    .map(([status, value], index) => ({
      name: formatAuthStatus(status),
      status,
      value: Number(value) || 0,
      fill: getChartColor(index + 2),
    }))
    .sort((a, b) => b.value - a.value)
}

export function buildSessionChartData(sessions = [], limit = 8) {
  return sessions
    .slice(0, limit)
    .map((row) => ({
      name: row.title || row.session_code,
      session_code: row.session_code,
      connections: row.total_connections,
    }))
}

export function buildHistoryChartData(history = []) {
  return (history || []).map((point) => {
    const date = new Date(point.timestamp)
    return {
      timestamp: point.timestamp,
      label: Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
      total: Number(point.total_connections) || 0,
      sessions: Number(point.unique_sessions) || 0,
    }
  })
}

export function formatUptime(seconds) {
  const total = Number(seconds) || 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

export function formatLastUpdated(timestamp) {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}
