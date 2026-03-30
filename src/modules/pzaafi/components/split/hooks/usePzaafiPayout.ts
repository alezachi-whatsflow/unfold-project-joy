// ─────────────────────────────────────────────────────────────
// Pzaafi — usePzaafiPayout Hook (Module D)
// Placeholder hook for payout management
// ─────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Payout } from '../services/payoutService'

interface UsePzaafiPayoutOptions {
  org_id: string | undefined
  enabled?: boolean
}

export function usePzaafiPayout(options: UsePzaafiPayoutOptions) {
  const { org_id, enabled = true } = options

  const {
    data: payouts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['pzaafi-payouts', org_id],
    queryFn: async () => {
      if (!org_id) return []
      const { data, error } = await supabase
        .from('pzaafi_payouts')
        .select('*')
        .eq('org_id', org_id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(`Payouts query failed: ${error.message}`)
      return (data ?? []) as Payout[]
    },
    enabled: enabled && !!org_id,
  })

  return {
    payouts,
    isLoading,
    error: error as Error | null,
  }
}
