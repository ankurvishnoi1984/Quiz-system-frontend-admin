import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Maximize2, Minimize2 } from 'lucide-react'
import { getPresentViewSessionApi } from '../../services/presentViewApi'
import { formatScheduledSessionForDisplay } from '../../utils/sessionSchedule'
import PresentModePage from './PresentModePage'
import { PresentShell, PresentSlideHeader } from './PresentShell'

function PresentViewShell({ children, footer }) {
  return (
    <PresentShell footer={footer}>
      {children}
    </PresentShell>
  )
}

function PresentViewWaitingScreen({ session }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const sessionTitle = session?.title || 'Live session'
  const scheduledLabel = formatScheduledSessionForDisplay(
    session?.scheduled_date,
    session?.scheduled_time,
  )

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <PresentViewShell
      footer={
        <footer className="relative z-20 flex shrink-0 justify-center border-t border-blue-200/50 bg-white/60 px-[clamp(1rem,3vw,3rem)] py-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-navy-800 shadow-sm transition hover:bg-white"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="size-4" />
                Exit fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="size-4" />
                Fullscreen
              </>
            )}
          </button>
        </footer>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <PresentSlideHeader
          sessionTitle={sessionTitle}
          participantCount={0}
          qaCount={0}
          isSessionLive={false}
          readOnly
        />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-[clamp(1rem,4vw,3rem)] text-center">
          <div className="max-w-2xl rounded-3xl border border-blue-200/70 bg-white/95 px-[clamp(1.5rem,4vw,3rem)] py-[clamp(2rem,6vh,3.5rem)] shadow-xl shadow-navy-900/10">
            <p className="text-[clamp(0.75rem,1.4vw,0.9rem)] font-semibold uppercase tracking-[0.25em] text-slate-500">
              Waiting for host
            </p>
            <h2 className="mt-4 text-[clamp(1.75rem,5vw,3rem)] font-bold leading-tight text-navy-900">
              Session not started yet
            </h2>
            <p className="mt-4 text-[clamp(1rem,2.2vw,1.25rem)] leading-relaxed text-slate-600">
              The host has not launched this session. This screen will update automatically when
              the session goes live.
            </p>
            {scheduledLabel ? (
              <p className="mt-6 text-[clamp(0.95rem,1.8vw,1.1rem)] font-semibold text-navy-700">
                Scheduled for {scheduledLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </PresentViewShell>
  )
}

function PresentViewStatusScreen({ message, tone = 'muted' }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100/70 p-8">
      <p
        className={`max-w-lg text-center text-lg ${
          tone === 'error' ? 'text-red-700' : 'text-slate-600'
        }`}
      >
        {message}
      </p>
    </div>
  )
}

export default function PresentViewPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || ''
  const viewerToken = searchParams.get('token') || ''

  const sessionQuery = useQuery({
    queryKey: ['present-view-session', sessionId, viewerToken],
    queryFn: () => getPresentViewSessionApi(viewerToken, sessionId),
    enabled: Boolean(viewerToken && sessionId),
    retry: 1,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return !status || status === 'draft' ? 2000 : false
    },
  })

  if (!sessionId) {
    return (
      <PresentViewStatusScreen message="Invalid display link. Ask the host for a new view-only link." />
    )
  }

  if (!viewerToken) {
    return (
      <PresentViewStatusScreen message="This display link is missing its access token. Ask the host to share a new link." />
    )
  }

  if (sessionQuery.isLoading) {
    return <PresentViewStatusScreen message="Loading display…" />
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <PresentViewStatusScreen
        tone="error"
        message="This display link is invalid or has expired. Ask the host for a new link."
      />
    )
  }

  if (sessionQuery.data.status === 'draft') {
    return <PresentViewWaitingScreen session={sessionQuery.data} />
  }

  return (
    <PresentModePage readOnly viewerToken={viewerToken} sessionIdOverride={sessionId} />
  )
}
