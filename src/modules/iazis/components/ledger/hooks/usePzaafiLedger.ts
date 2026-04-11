// ─────────────────────────────────────────────────────────────
// Pzaafi — usePzaafiLedger Hook (Module C)
// Cursor-based pagination + realtime subscription
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// ── Types ────────────────────────────────────────────────────

export interface LedgerEntry {
  id: string
  org_id: string
  wallet_id: string
  event_type: string
  amount_cents: number
  balance_type: string
  payment_id: string | null
  order_id: string | null
  settlement_id: string | null
  refund_id: string | null
  chargeback_id: string | null
  description: string
  metadata: Record<string, unknown>
  balance_after: number
  created_at: string
}

interface UsePzaafiLedgerOptions {
  org_id: string | undefined
  wallet_id?: string
  page_size?: number
  enabled?: boolean
}

interface UsePzaafiLedgerReturn {
  entries: LedgerEntry[]
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
}

const DEFAULT_PAGE_SIZE = 50

// ── Hook ─────────────────────────────────────────────────────

export function usePzaafiLedger(options: UsePzaafiLedgerOptions): UsePzaafiLedgerReturn {
  const { org_id, wallet_id, page_size = DEFAULT_PAGE_SIZE, enabled = true } = options
  const queryClient = useQueryClient()
  const [cursor, setCursor] = useState<string | null>(null)
  const [allEntries, setAllEntries] = useState<LedgerEntry[]>([])
  const [hasMore, setHasMore] = useState(true)
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const queryKey = ['pzaafi-ledger', org_id, wallet_id, cursor]

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!org_id) return []

      let query = supabase
        .from('pzaafi_ledger_entries')
        .select('*')
        .eq('org_id', org_id)
        .order('created_at', { ascending: false })
        .limit(page_size + 1) // fetch one extra to determine hasMore

      if (wallet_id) {
        query = query.eq('wallet_id', wallet_id)
      }

      if (cursor) {
        query = query.lt('created_at', cursor)
      }

      const { data: rows, error: queryError } = await query

      if (queryError) throw new Error(`Ledger query failed: ${queryError.message}`)
      return (rows ?? []) as LedgerEntry[]
    },
    enabled: enabled && !!org_id,
  })

  // Merge pages
  useEffect(() => {
    if (!data) return
    const pageData = data.slice(0, page_size)
    setHasMore(data.length > page_size)

    if (cursor) {
      setAllEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        const newEntries = pageData.filter((e) => !existingIds.has(e.id))
        return [...prev, ...newEntries]
      })
    } else {
      setAllEntries(pageData)
    }
  }, [data, cursor, page_size])

  // Load more (cursor-based pagination)
  const loadMore = useCallback(() => {
    if (!hasMore || allEntries.length === 0) return
    const lastEntry = allEntries[allEntries.length - 1]
    setCursor(lastEntry.created_at)
  }, [hasMore, allEntries])

  // Refresh (reset pagination)
  const refresh = useCallback(() => {
    setCursor(null)
    setAllEntries([])
    setHasMore(true)
    queryClient.invalidateQueries({ queryKey: ['pzaafi-ledger', org_id] })
  }, [org_id, queryClient])

  // Realtime subscription on pzaafi_ledger_entries
  useEffect(() => {
    if (!org_id || !enabled) return

    const channel = supabase
      .channel(`pzaafi-ledger-${org_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pzaafi_ledger_entries',
          filter: `org_id=eq.${org_id}`,
        },
        (payload) => {
          const newEntry = payload.new as LedgerEntry
          setAllEntries((prev) => {
            if (prev.some((e) => e.id === newEntry.id)) return prev
            return [newEntry, ...prev]
          })
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
  }, [org_id, enabled])

  return {
    entries: allEntries,
    isLoading,
    error: error as Error | null,
    hasMore,
    loadMore,
    refresh,
  }
}
