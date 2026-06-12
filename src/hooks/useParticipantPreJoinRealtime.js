import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createRealtimeClient, RealtimeEvent } from '../services/realtimeClient'

/**
 * Listen for session status while on the join screen (before a participant token exists).
 * HTTP polling can be stale behind production CDNs; WebSocket is the reliable path.
 */
export function useParticipantPreJoinRealtime({ sessionCode, enabled }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !sessionCode) return undefined

    const client = createRealtimeClient(
      '',
      { session: sessionCode, role: 'participant' },
      'participant-waiting',
    )

    const offSession = client.on(RealtimeEvent.SESSION_UPDATED, (data) => {
      if (!data?.status) return

      queryClient.setQueryData(['participant-session', sessionCode], (old) =>
        old
          ? {
              ...old,
              status: data.status,
              join_blocked: data.join_blocked ?? old.join_blocked,
              join_blocked_message:
                data.join_blocked_message ?? old.join_blocked_message,
            }
          : old,
      )
      queryClient.invalidateQueries({ queryKey: ['participant-session', sessionCode] })
    })

    client.connect()

    return () => {
      offSession()
      client.disconnect()
    }
  }, [enabled, sessionCode, queryClient])
}
