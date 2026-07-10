import { Activity, Cpu, MemoryStick, Radio, RefreshCw, Server, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import StatCard from '../components/dashboard/StatCard'
import { WebSocketMonitorCharts } from '../components/monitor/WebSocketMonitorCharts'
import { WebSocketSessionsTable } from '../components/monitor/WebSocketSessionsTable'
import { useAuthStore } from '../store/authStore'
import { getWebSocketMonitorApi } from '../services/monitorApi'
import { formatLastUpdated, formatUptime } from '../utils/websocketMonitor'

const POLL_INTERVAL_MS = 5000

function WebSocketMonitorPage() {
  const accessToken = useAuthStore((state) => state.accessToken)

  const monitorQuery = useQuery({
    queryKey: ['websocket-monitor'],
    queryFn: () => getWebSocketMonitorApi(accessToken),
    enabled: Boolean(accessToken),
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 2000,
  })

  const monitor = monitorQuery.data
  const isLoading = monitorQuery.isLoading && !monitor
  const isLive = !monitorQuery.isError

  const handleManualRefresh = () => {
    monitorQuery.refetch()
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">
            System monitoring
          </p>
          <h2 className="mt-1 text-2xl font-bold text-navy-900">WebSocket connections</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Real-time view of open sockets on this API server. Super admin only — data reflects the
            current Node process (single-server deployment).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live refresh toggle — kept for future use
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
              autoRefresh
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-blue-200/70 bg-white text-slate-700 hover:bg-blue-50'
            }`}
          >
            {autoRefresh ? <Pause className="size-4" /> : <Play className="size-4" />}
            {autoRefresh ? 'Live refresh on' : 'Live refresh off'}
          </button>
          */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={monitorQuery.isFetching}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-blue-200/70 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${monitorQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh now
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200/70 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
        <span className="inline-flex items-center gap-2 font-medium text-navy-900">
          <Radio className={`size-4 ${isLive ? 'text-emerald-600' : 'text-slate-400'}`} />
          {isLive ? 'Polling every 5 seconds' : 'Unable to poll — check connection'}
        </span>
        <span className="hidden text-slate-300 sm:inline">|</span>
        <span>Last updated: {formatLastUpdated(monitor?.timestamp)}</span>
        {monitorQuery.isError ? (
          <span className="font-medium text-red-600">
            {monitorQuery.error?.message || 'Failed to load monitor data'}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open connections"
          value={monitor?.total_connections ?? '—'}
          trendLabel="Active WebSocket sockets"
          sparkline={monitor?.history?.map((row) => row.total_connections) ?? []}
          accent="navy"
          pulse={isLive && (monitor?.total_connections ?? 0) > 0}
        />
        <StatCard
          label="Active sessions"
          value={monitor?.unique_sessions ?? '—'}
          trendLabel="Sessions with ≥1 socket"
          sparkline={monitor?.history?.map((row) => row.unique_sessions) ?? []}
          accent="blue"
        />
        <StatCard
          label="Connection buckets"
          value={monitor?.active_buckets ?? '—'}
          trendLabel="session:role groups"
          sparkline={monitor?.history?.map((row) => row.active_buckets) ?? []}
          accent="cyan"
        />
        <StatCard
          label="Process uptime"
          value={monitor?.server ? formatUptime(monitor.server.process_uptime_seconds) : '—'}
          trendLabel={
            monitor?.server
              ? `Heap ${monitor.server.memory_heap_used_mb} MB · RSS ${monitor.server.memory_rss_mb} MB`
              : 'Node process'
          }
          sparkline={[]}
          accent="indigo"
        />
      </div>

      <WebSocketMonitorCharts monitor={monitor} isLoading={isLoading} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-4 shadow-sm xl:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <Server className="size-4 text-navy-700" />
            <h3 className="text-sm font-bold text-navy-900">Server snapshot</h3>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-slate-600">
                <Activity className="size-3.5" />
                Uptime
              </dt>
              <dd className="font-semibold text-navy-900">
                {monitor?.server ? formatUptime(monitor.server.process_uptime_seconds) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-slate-600">
                <MemoryStick className="size-3.5" />
                Heap used
              </dt>
              <dd className="font-semibold tabular-nums text-navy-900">
                {monitor?.server ? `${monitor.server.memory_heap_used_mb} MB` : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-slate-600">
                <Cpu className="size-3.5" />
                RSS memory
              </dt>
              <dd className="font-semibold tabular-nums text-navy-900">
                {monitor?.server ? `${monitor.server.memory_rss_mb} MB` : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="inline-flex items-center gap-2 text-slate-600">
                <Users className="size-3.5" />
                History points
              </dt>
              <dd className="font-semibold tabular-nums text-navy-900">
                {monitor?.history?.length ?? 0}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            History is stored in memory on the API server and resets when the process restarts.
          </p>
        </div>

        <div className="xl:col-span-2">
          <WebSocketSessionsTable sessions={monitor?.sessions} isLoading={isLoading} />
        </div>
      </div>
    </section>
  )
}

export default WebSocketMonitorPage
