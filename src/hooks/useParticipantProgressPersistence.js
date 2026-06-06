import { useEffect, useRef } from 'react'
import { saveParticipantSessionStateApi } from '../services/participantApi'
import { useParticipantStore } from '../store/participantStore'
import {
  hasParticipantProgressChanged,
  pickParticipantProgressState,
} from '../utils/participantSessionState'

const SYNC_DEBOUNCE_MS = 800

export function useParticipantProgressPersistence({ enabled, participantToken }) {
  const lastSyncedRef = useRef(null)
  const syncTimeoutRef = useRef(null)
  const syncInFlightRef = useRef(false)

  useEffect(() => {
    if (!enabled || !participantToken) return undefined

    lastSyncedRef.current = pickParticipantProgressState(useParticipantStore.getState())

    const scheduleSync = (progress) => {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = setTimeout(async () => {
        if (syncInFlightRef.current) return
        if (
          lastSyncedRef.current &&
          !hasParticipantProgressChanged(progress, lastSyncedRef.current)
        ) {
          return
        }

        syncInFlightRef.current = true
        try {
          await saveParticipantSessionStateApi(participantToken, progress)
          lastSyncedRef.current = progress
        } catch (err) {
          console.error('Failed to persist participant session state:', err)
        } finally {
          syncInFlightRef.current = false
        }
      }, SYNC_DEBOUNCE_MS)
    }

    const unsubscribe = useParticipantStore.subscribe((state) => {
      const current = pickParticipantProgressState(state)
      if (lastSyncedRef.current && !hasParticipantProgressChanged(current, lastSyncedRef.current)) {
        return
      }
      scheduleSync(current)
    })

    return () => {
      unsubscribe()
      clearTimeout(syncTimeoutRef.current)
    }
  }, [enabled, participantToken])
}
