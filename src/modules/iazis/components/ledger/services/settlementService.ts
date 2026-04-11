// ─────────────────────────────────────────────────────────────
// Pzaafi — Settlement Service (Module C)
// Combines local DB settlements with connector API data
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client'
import { getConnector } from '../../../connectors/registry'
import type { ConnectorId, SettlementScheduleItem, Money } from '../../../types'

// ── Types ────────────────────────────────────────────────────

export interface Settlement {
  id: string
  org_id: string
  payment_id: string | null
  connector_id: string
  amount_cents: Money
  fee_cents: Money
  net_cents: Money
  currency: string
  status: 'scheduled' | 'processing' | 'settled' | 'failed'
  scheduled_for: string
  settled_at: string | null
  external_ref: string | null
  created_at: string
}

export interface SettlementSchedule {
  /** Settlements from local database */
  local: Settlement[]
  /** Settlements from connector API (if available) */
  remote: SettlementScheduleItem[]
}

// ── Get settlement schedule (merged view) ───────────────────

export async function getSettlementSchedule(params: {
  org_id: string
  connector_id: ConnectorId
  start_date: string
  end_date: string
}): Promise<SettlementSchedule> {
  // 1. Fetch from local DB
  const { data: localData, error } = await supabase
    .from('pzaafi_settlements')
    .select('*')
    .eq('org_id', params.org_id)
    .eq('connector_id', params.connector_id)
    .gte('scheduled_for', params.start_date)
    .lte('scheduled_for', params.end_date)
    .order('scheduled_for', { ascending: true })

  if (error) throw new Error(`[SettlementService] DB query failed: ${error.message}`)

  // 2. Try to fetch from connector API (may not be supported)
  let remote: SettlementScheduleItem[] = []
  try {
    const connector = getConnector(params.connector_id)
    if (connector.getSettlementSchedule) {
      remote = await connector.getSettlementSchedule(params.start_date, params.end_date)
    }
  } catch (err) {
    console.warn('[SettlementService] Remote schedule fetch failed:', err)
  }

  return {
    local: (localData ?? []) as Settlement[],
    remote,
  }
}
