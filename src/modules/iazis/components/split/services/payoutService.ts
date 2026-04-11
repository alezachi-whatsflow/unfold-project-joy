// ─────────────────────────────────────────────────────────────
// Pzaafi — Payout Service (Module D)
// Schedules and executes payouts (withdrawals) via connector
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client'
import { writeLedgerEntry } from '../../ledger/services/ledgerService'
import { getConnector } from '../../../connectors/registry'
import type { ConnectorId, Money } from '../../../types'
import type { AsaasConnector } from '../../../connectors/asaas'

// ── Types ────────────────────────────────────────────────────

export interface Payout {
  id: string
  org_id: string
  connector_id: string
  amount_cents: Money
  schedule: 'immediate' | 'daily' | 'weekly' | 'monthly'
  status: 'scheduled' | 'processing' | 'completed' | 'failed'
  description: string | null
  external_id: string | null
  error: string | null
  scheduled_for: string
  executed_at: string | null
  created_at: string
}

export interface SchedulePayoutParams {
  org_id: string
  connector_id: ConnectorId
  wallet_id: string
  amount_cents: Money
  schedule: 'immediate' | 'daily' | 'weekly' | 'monthly'
  description?: string
  scheduled_for?: string
  bank_account: {
    bank: string
    accountName: string
    agency: string
    account: string
    accountDigit: string
    cpfCnpj: string
  }
}

export interface PayoutResult {
  payout_id: string
  status: 'scheduled' | 'processing' | 'completed' | 'failed'
  external_id?: string
  error?: string
}

// ── Schedule a payout ───────────────────────────────────────

export async function schedulePayout(params: SchedulePayoutParams): Promise<PayoutResult> {
  const scheduledFor = params.scheduled_for ?? new Date().toISOString()

  const { data, error } = await supabase
    .from('pzaafi_payouts')
    .insert({
      org_id: params.org_id,
      connector_id: params.connector_id,
      amount_cents: params.amount_cents,
      schedule: params.schedule,
      status: params.schedule === 'immediate' ? 'processing' : 'scheduled',
      description: params.description ?? null,
      scheduled_for: scheduledFor,
    })
    .select('id')
    .single()

  if (error) throw new Error(`[PayoutService] Schedule failed: ${error.message}`)

  const payoutId = data.id as string

  // If immediate, execute right away
  if (params.schedule === 'immediate') {
    return executePayout({
      payout_id: payoutId,
      org_id: params.org_id,
      connector_id: params.connector_id,
      wallet_id: params.wallet_id,
      amount_cents: params.amount_cents,
      bank_account: params.bank_account,
    })
  }

  return { payout_id: payoutId, status: 'scheduled' }
}

// ── Execute a payout ────────────────────────────────────────

export async function executePayout(params: {
  payout_id: string
  org_id: string
  connector_id: ConnectorId
  wallet_id: string
  amount_cents: Money
  bank_account: SchedulePayoutParams['bank_account']
}): Promise<PayoutResult> {
  try {
    // 1. Call connector to execute transfer
    const connector = getConnector(params.connector_id) as AsaasConnector
    if (!connector.executePayout) {
      throw new Error(`Connector ${params.connector_id} does not support payouts`)
    }

    const result = await connector.executePayout(params.amount_cents, params.bank_account)

    // 2. Write ledger entry (debit from available)
    await writeLedgerEntry({
      org_id: params.org_id,
      wallet_id: params.wallet_id,
      event_type: 'withdrawal',
      amount_cents: -params.amount_cents,
      balance_type: 'available',
      description: `Payout executed: -${params.amount_cents} cents (${result.id})`,
    })

    // 3. Update payout record
    await supabase
      .from('pzaafi_payouts')
      .update({
        status: 'completed',
        external_id: result.id,
        executed_at: new Date().toISOString(),
      })
      .eq('id', params.payout_id)

    return {
      payout_id: params.payout_id,
      status: 'completed',
      external_id: result.id,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown payout error'

    // Update payout as failed
    await supabase
      .from('pzaafi_payouts')
      .update({
        status: 'failed',
        error: errorMsg,
      })
      .eq('id', params.payout_id)

    return {
      payout_id: params.payout_id,
      status: 'failed',
      error: errorMsg,
    }
  }
}
