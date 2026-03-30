// ─────────────────────────────────────────────────────────────
// Pzaafi — Wallet Service (Module C)
// Manages wallet accounts and balance summaries
// ─────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client'
import type { Money } from '../../../types'

// ── Types ────────────────────────────────────────────────────

export interface WalletAccount {
  id: string
  org_id: string
  connector_id: string
  currency: string
  balance_available: Money
  balance_blocked: Money
  balance_pending: Money
  balance_anticipated: Money
  balance_disputed: Money
  balance_refunded: Money
  last_sync_at: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface WalletSummary {
  wallet_id: string
  org_id: string
  connector_id: string
  total_available: Money
  total_pending: Money
  total_blocked: Money
  total_disputed: Money
  total_refunded: Money
  total_anticipated: Money
  net_balance: Money
}

// ── Get wallet by org + connector ───────────────────────────

export async function getWallet(
  orgId: string,
  connectorId: string,
): Promise<WalletAccount | null> {
  const { data, error } = await supabase
    .from('pzaafi_wallet_accounts')
    .select('*')
    .eq('org_id', orgId)
    .eq('connector_id', connectorId)
    .eq('active', true)
    .maybeSingle()

  if (error) throw new Error(`[WalletService] getWallet failed: ${error.message}`)
  return data as WalletAccount | null
}

// ── Get wallet summary (aggregated balances) ────────────────

export async function getWalletSummary(orgId: string): Promise<WalletSummary[]> {
  const { data, error } = await supabase
    .from('pzaafi_wallet_accounts')
    .select('*')
    .eq('org_id', orgId)
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`[WalletService] getWalletSummary failed: ${error.message}`)

  return (data ?? []).map((w) => ({
    wallet_id: w.id,
    org_id: w.org_id,
    connector_id: w.connector_id,
    total_available: w.balance_available ?? 0,
    total_pending: w.balance_pending ?? 0,
    total_blocked: w.balance_blocked ?? 0,
    total_disputed: w.balance_disputed ?? 0,
    total_refunded: w.balance_refunded ?? 0,
    total_anticipated: w.balance_anticipated ?? 0,
    net_balance: (w.balance_available ?? 0) + (w.balance_pending ?? 0),
  }))
}

// ── Ensure wallet exists (create if not) ────────────────────

export async function ensureWallet(
  orgId: string,
  connectorId: string,
): Promise<WalletAccount> {
  // Try to find existing
  const existing = await getWallet(orgId, connectorId)
  if (existing) return existing

  // Create new wallet
  const { data, error } = await supabase
    .from('pzaafi_wallet_accounts')
    .insert({
      org_id: orgId,
      connector_id: connectorId,
      currency: 'BRL',
      balance_available: 0,
      balance_blocked: 0,
      balance_pending: 0,
      balance_anticipated: 0,
      balance_disputed: 0,
      balance_refunded: 0,
      active: true,
    })
    .select()
    .single()

  if (error) throw new Error(`[WalletService] ensureWallet failed: ${error.message}`)
  return data as WalletAccount
}
