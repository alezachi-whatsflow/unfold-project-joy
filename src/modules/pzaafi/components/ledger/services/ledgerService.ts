// ─────────────────────────────────────────────────────────────
// Pzaafi — Ledger Service (Module C)
// Writes immutable double-entry ledger entries via Supabase RPC
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client'
import type { LedgerEventType, Money } from '../../../types'

// ── Types ────────────────────────────────────────────────────

export interface WriteLedgerEntryParams {
  org_id: string
  wallet_id: string
  event_type: LedgerEventType
  amount_cents: Money
  balance_type: 'available' | 'blocked' | 'pending' | 'anticipated' | 'disputed' | 'refunded'
  description: string
  metadata?: Record<string, unknown>
  payment_id?: string
  order_id?: string
  settlement_id?: string
  refund_id?: string
  chargeback_id?: string
}

// ── Write a single ledger entry via RPC ─────────────────────

export async function writeLedgerEntry(params: WriteLedgerEntryParams): Promise<string> {
  const { data, error } = await supabase.rpc('pzaafi_ledger_entry', {
    p_org_id: params.org_id,
    p_wallet_id: params.wallet_id,
    p_event_type: params.event_type,
    p_amount_cents: params.amount_cents,
    p_balance_type: params.balance_type,
    p_description: params.description,
    p_metadata: params.metadata ?? {},
    p_payment_id: params.payment_id ?? null,
    p_order_id: params.order_id ?? null,
    p_settlement_id: params.settlement_id ?? null,
    p_refund_id: params.refund_id ?? null,
    p_chargeback_id: params.chargeback_id ?? null,
  })

  if (error) throw new Error(`[LedgerService] writeLedgerEntry failed: ${error.message}`)
  return data as string
}

// ── Event Handlers ──────────────────────────────────────────

/**
 * Called when a payment is confirmed/received.
 * Credits the org wallet pending balance.
 */
export async function onPaymentConfirmed(params: {
  org_id: string
  wallet_id: string
  payment_id: string
  order_id: string
  amount_cents: Money
  fee_cents: Money
}): Promise<string[]> {
  const entryIds: string[] = []

  // 1. Credit net amount to pending
  const netCents = params.amount_cents - params.fee_cents
  const creditId = await writeLedgerEntry({
    org_id: params.org_id,
    wallet_id: params.wallet_id,
    event_type: 'charge_received',
    amount_cents: netCents,
    balance_type: 'pending',
    description: `Payment confirmed: +${netCents} cents (net of ${params.fee_cents} fee)`,
    payment_id: params.payment_id,
    order_id: params.order_id,
  })
  entryIds.push(creditId)

  // 2. Record fee as separate entry
  if (params.fee_cents > 0) {
    const feeId = await writeLedgerEntry({
      org_id: params.org_id,
      wallet_id: params.wallet_id,
      event_type: 'fee',
      amount_cents: -params.fee_cents,
      balance_type: 'available',
      description: `Processing fee: -${params.fee_cents} cents`,
      payment_id: params.payment_id,
      order_id: params.order_id,
    })
    entryIds.push(feeId)
  }

  return entryIds
}

/**
 * Called when a settlement is executed (funds move from pending to available).
 */
export async function onSettlementExecuted(params: {
  org_id: string
  wallet_id: string
  settlement_id: string
  amount_cents: Money
}): Promise<string[]> {
  const entryIds: string[] = []

  // 1. Debit from pending
  const debitId = await writeLedgerEntry({
    org_id: params.org_id,
    wallet_id: params.wallet_id,
    event_type: 'adjustment',
    amount_cents: -params.amount_cents,
    balance_type: 'pending',
    description: `Settlement executed: -${params.amount_cents} cents from pending`,
    settlement_id: params.settlement_id,
  })
  entryIds.push(debitId)

  // 2. Credit to available
  const creditId = await writeLedgerEntry({
    org_id: params.org_id,
    wallet_id: params.wallet_id,
    event_type: 'adjustment',
    amount_cents: params.amount_cents,
    balance_type: 'available',
    description: `Settlement executed: +${params.amount_cents} cents to available`,
    settlement_id: params.settlement_id,
  })
  entryIds.push(creditId)

  return entryIds
}

/**
 * Called when a refund is created.
 * Debits from available balance.
 */
export async function onRefundCreated(params: {
  org_id: string
  wallet_id: string
  refund_id: string
  payment_id: string
  amount_cents: Money
}): Promise<string> {
  return writeLedgerEntry({
    org_id: params.org_id,
    wallet_id: params.wallet_id,
    event_type: 'refund',
    amount_cents: -params.amount_cents,
    balance_type: 'available',
    description: `Refund: -${params.amount_cents} cents`,
    refund_id: params.refund_id,
    payment_id: params.payment_id,
  })
}

/**
 * Called when a chargeback is opened.
 * Moves funds from available to disputed.
 */
export async function onChargebackOpened(params: {
  org_id: string
  wallet_id: string
  chargeback_id: string
  payment_id: string
  amount_cents: Money
}): Promise<string[]> {
  const entryIds: string[] = []

  // 1. Debit from available
  const debitId = await writeLedgerEntry({
    org_id: params.org_id,
    wallet_id: params.wallet_id,
    event_type: 'adjustment',
    amount_cents: -params.amount_cents,
    balance_type: 'available',
    description: `Chargeback opened: -${params.amount_cents} cents from available`,
    chargeback_id: params.chargeback_id,
    payment_id: params.payment_id,
  })
  entryIds.push(debitId)

  // 2. Credit to disputed
  const creditId = await writeLedgerEntry({
    org_id: params.org_id,
    wallet_id: params.wallet_id,
    event_type: 'adjustment',
    amount_cents: params.amount_cents,
    balance_type: 'disputed',
    description: `Chargeback opened: +${params.amount_cents} cents to disputed`,
    chargeback_id: params.chargeback_id,
    payment_id: params.payment_id,
  })
  entryIds.push(creditId)

  return entryIds
}
