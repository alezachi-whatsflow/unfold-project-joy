// ─────────────────────────────────────────────────────────────
// Pzaafi — usePzaafiSplit Hook (Module D)
// CRUD for split rules
// ─────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { SplitReceiver } from '../../../types'

// ── Types ────────────────────────────────────────────────────

export interface SplitRule {
  id: string
  org_id: string
  product_id: string | null
  name: string
  receivers: SplitReceiver[]
  active: boolean
  created_at: string
  updated_at: string
}

interface UsePzaafiSplitOptions {
  org_id: string | undefined
  enabled?: boolean
}

interface CreateSplitRuleParams {
  org_id: string
  name: string
  product_id?: string
  receivers: SplitReceiver[]
}

// ── Hook ─────────────────────────────────────────────────────

export function usePzaafiSplit(options: UsePzaafiSplitOptions) {
  const { org_id, enabled = true } = options
  const queryClient = useQueryClient()
  const queryKey = ['pzaafi-split-rules', org_id]

  // Fetch rules
  const {
    data: rules = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!org_id) return []
      const { data, error } = await supabase
        .from('pzaafi_split_rules')
        .select('*')
        .eq('org_id', org_id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(`Split rules query failed: ${error.message}`)
      return (data ?? []) as SplitRule[]
    },
    enabled: enabled && !!org_id,
  })

  // Create rule
  const createRule = useMutation({
    mutationFn: async (params: CreateSplitRuleParams) => {
      const { data, error } = await supabase
        .from('pzaafi_split_rules')
        .insert({
          org_id: params.org_id,
          name: params.name,
          product_id: params.product_id ?? null,
          receivers: params.receivers,
          active: true,
        })
        .select()
        .single()

      if (error) throw new Error(`Create split rule failed: ${error.message}`)
      return data as SplitRule
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Delete rule (soft delete: set active = false)
  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('pzaafi_split_rules')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', ruleId)

      if (error) throw new Error(`Delete split rule failed: ${error.message}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    rules,
    isLoading,
    error: error as Error | null,
    createRule,
    deleteRule,
  }
}
