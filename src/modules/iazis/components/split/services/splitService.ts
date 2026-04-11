// ─────────────────────────────────────────────────────────────
// Pzaafi — Split Service (Module D)
// Executes splits and writes double-entry ledger per receiver
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client'
import { writeLedgerEntry } from '../../ledger/services/ledgerService'
import { validateSplitReceivers, calculateSplitAmounts } from './splitValidator'
import type { Money, SplitReceiver } from '../../../types'

// ── Types ────────────────────────────────────────────────────

export interface SplitExecution {
  id: string
  payment_id: string
  org_id: string
  split_rule_id: string
  total_cents: Money
  fee_cents: Money
  net_cents: Money
  receivers_json: Record<string, unknown>[]
  executed_at: string
}

export interface ExecuteSplitParams {
  payment_id: string
  org_id: string
  /** Source wallet that the payment landed in */
  source_wallet_id: string
  split_rule_id: string
  total_cents: Money
  fee_cents: Money
}

export interface ExecuteSplitResult {
  execution_id: string
  distributions: Array<{
    wallet_id: string
    amount_cents: Money
    ledger_entry_id: string
  }>
}

// ── Execute a split ─────────────────────────────────────────

export async function executeSplit(params: ExecuteSplitParams): Promise<ExecuteSplitResult> {
  const netCents = params.total_cents - params.fee_cents

  // 1. Fetch the split rule
  const { data: rule, error: ruleError } = await supabase
    .from('pzaafi_split_rules')
    .select('*')
    .eq('id', params.split_rule_id)
    .eq('org_id', params.org_id)
    .eq('active', true)
    .single()

  if (ruleError || !rule) {
    throw new Error(`[SplitService] Split rule not found: ${params.split_rule_id}`)
  }

  const receivers = rule.receivers as SplitReceiver[]

  // 2. Validate receivers
  const validation = validateSplitReceivers(receivers)
  if (!validation.valid) {
    throw new Error(`[SplitService] Invalid split rule: ${validation.errors.join('; ')}`)
  }

  // 3. Calculate amounts
  const amounts = calculateSplitAmounts(receivers, netCents)

  // 4. Write double-entry ledger for each receiver
  const distributions: ExecuteSplitResult['distributions'] = []

  for (const split of amounts) {
    // Debit from source wallet
    await writeLedgerEntry({
      org_id: params.org_id,
      wallet_id: params.source_wallet_id,
      event_type: 'split_out',
      amount_cents: -split.amount_cents,
      balance_type: 'pending',
      description: `Split out to ${split.wallet_id}: -${split.amount_cents} cents`,
      payment_id: params.payment_id,
    })

    // Credit to receiver wallet
    const creditId = await writeLedgerEntry({
      org_id: params.org_id,
      wallet_id: split.wallet_id,
      event_type: 'split_in',
      amount_cents: split.amount_cents,
      balance_type: 'pending',
      description: `Split in from payment ${params.payment_id}: +${split.amount_cents} cents`,
      payment_id: params.payment_id,
    })

    distributions.push({
      wallet_id: split.wallet_id,
      amount_cents: split.amount_cents,
      ledger_entry_id: creditId,
    })
  }

  // 5. Record the split execution
  const { data: execution, error: execError } = await supabase
    .from('pzaafi_split_executions')
    .insert({
      payment_id: params.payment_id,
      org_id: params.org_id,
      split_rule_id: params.split_rule_id,
      total_cents: params.total_cents,
      fee_cents: params.fee_cents,
      receivers_json: amounts.map((a) => ({
        wallet_id: a.wallet_id,
        amount_cents: a.amount_cents,
      })),
      executed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (execError) {
    throw new Error(`[SplitService] Failed to record execution: ${execError.message}`)
  }

  return {
    execution_id: execution.id,
    distributions,
  }
}

// ── Get splits by payment ───────────────────────────────────

export async function getSplitsByPayment(paymentId: string): Promise<SplitExecution[]> {
  const { data, error } = await supabase
    .from('pzaafi_split_executions')
    .select('*')
    .eq('payment_id', paymentId)
    .order('executed_at', { ascending: false })

  if (error) throw new Error(`[SplitService] Query failed: ${error.message}`)
  return (data ?? []) as SplitExecution[]
}
