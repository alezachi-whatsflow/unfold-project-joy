// ─────────────────────────────────────────────────────────────
// Pzaafi — usePzaafiWallet Hook (Module C)
// Wallet summary + realtime subscription
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { getWalletSummary, type WalletSummary } from '../services/walletService'

interface UsePzaafiWalletOptions {
  org_id: string | undefined
  enabled?: boolean
}

interface UsePzaafiWalletReturn {
  wallets: WalletSummary[]
  isLoading: boolean
  error: Error | null
  /** Aggregated totals across all wallets */
  totals: {
    available: number
    pending: number
    blocked: number
    disputed: number
    net: number
  }
  refresh: () => void
}

export function usePzaafiWallet(options: UsePzaafiWalletOptions): UsePzaafiWalletReturn {
  const { org_id, enabled = true } = options
  const queryClient = useQueryClient()
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const queryKey = ['pzaafi-wallet', org_id]

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!org_id) return []
      return getWalletSummary(org_id)
    },
    enabled: enabled && !!org_id,
  })

  const wallets = data ?? []

  // Aggregated totals
  const totals = wallets.reduce(
    (acc, w) => ({
      available: acc.available + w.total_available,
      pending: acc.pending + w.total_pending,
      blocked: acc.blocked + w.total_blocked,
      disputed: acc.disputed + w.total_disputed,
      net: acc.net + w.net_balance,
    }),
    { available: 0, pending: 0, blocked: 0, disputed: 0, net: 0 },
  )

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey })
  }

  // Realtime subscription on pzaafi_wallet_accounts
  useEffect(() => {
    if (!org_id || !enabled) return

    const channel = supabase
      .channel(`pzaafi-wallet-${org_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pzaafi_wallet_accounts',
          filter: `org_id=eq.${org_id}`,
        },
        () => {
          // Refetch on any wallet change
          queryClient.invalidateQueries({ queryKey })
        },
      )
      .subscribe()

    realtimeChannelRef.current = channel

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
        realtimeChannelRef.current = null
      }
    }
  }, [org_id, enabled, queryClient, queryKey])

  return {
    wallets,
    isLoading,
    error: error as Error | null,
    totals,
    refresh,
  }
}
