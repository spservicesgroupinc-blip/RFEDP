import { useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type RealtimePresenceState = {
  userId: string
  role: 'admin' | 'crew'
  onlineAt: string
}

export function useRealtime(
  companyId: string | undefined,
  userId: string | undefined,
  role: 'admin' | 'crew' | undefined,
  onPresenceChange?: (state: Record<string, RealtimePresenceState[]>) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!supabase || !companyId || !userId || !role) return

    const channel = supabase.channel(`company:${companyId}`, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<RealtimePresenceState>()
        onPresenceChange?.(state)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            role,
            onlineAt: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [companyId, userId, role])

  return channelRef
}
