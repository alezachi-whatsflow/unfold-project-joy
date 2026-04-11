import { supabase } from '@/integrations/supabase/client';

export interface CommissionRule {
  id: string;
  parent_org_id: string;
  child_org_id: string | null;
  type: 'percent' | 'fixed_cents';
  value: number;
  applies_to: string;
  active: boolean;
}

export interface CommissionResult {
  amountCents: number;
  ruleId: string;
  type: 'percent' | 'fixed_cents';
  value: number;
}

/**
 * Calculate the commission for a given payment method and amount.
 * Finds the most specific active rule (child-specific first, then global).
 */
export async function calculateCommission(
  parentOrgId: string,
  childOrgId: string,
  paymentMethod: string,
  amountCents: number
): Promise<CommissionResult | null> {
  // Fetch matching rules: prefer child-specific, then general (null child)
  const { data: rules, error } = await supabase
    .from('pzaafi_commission_rules')
    .select('*')
    .eq('parent_org_id', parentOrgId)
    .eq('active', true)
    .or(`applies_to.eq.all,applies_to.eq.${paymentMethod}`)
    .order('child_org_id', { ascending: false, nullsFirst: false });

  if (error || !rules?.length) return null;

  // Pick the most specific rule
  const rule = rules.find((r: any) => r.child_org_id === childOrgId)
    ?? rules.find((r: any) => r.child_org_id === null)
    ?? null;

  if (!rule) return null;

  const commissionCents = rule.type === 'percent'
    ? Math.round((amountCents * rule.value) / 10000) // value is basis points (e.g. 500 = 5%)
    : rule.value;

  return {
    amountCents: commissionCents,
    ruleId: rule.id,
    type: rule.type as 'percent' | 'fixed_cents',
    value: rule.value,
  };
}

/**
 * Charge commission using double-entry ledger:
 * - Debit (negative) from child wallet
 * - Credit (positive) to parent wallet
 * Uses the pzaafi_ledger_entry RPC for atomicity.
 */
export async function chargeCommission(
  parentOrgId: string,
  parentWalletId: string,
  childOrgId: string,
  childWalletId: string,
  commissionCents: number,
  paymentId: string,
  ruleId: string
): Promise<{ debitEntryId: string; creditEntryId: string }> {
  if (commissionCents <= 0) {
    throw new Error('Commission amount must be positive');
  }

  const metadata = { commission_rule_id: ruleId, payment_id: paymentId };

  // 1. Debit child (negative amount)
  const { data: debitId, error: debitErr } = await supabase.rpc('pzaafi_ledger_entry', {
    p_org_id: childOrgId,
    p_wallet_id: childWalletId,
    p_event_type: 'commission_debit',
    p_amount_cents: -commissionCents,
    p_balance_type: 'available',
    p_description: `Commission charged to parent org ${parentOrgId}`,
    p_metadata: metadata,
    p_payment_id: paymentId,
  });

  if (debitErr) throw new Error(`Commission debit failed: ${debitErr.message}`);

  // 2. Credit parent (positive amount)
  const { data: creditId, error: creditErr } = await supabase.rpc('pzaafi_ledger_entry', {
    p_org_id: parentOrgId,
    p_wallet_id: parentWalletId,
    p_event_type: 'commission_credit',
    p_amount_cents: commissionCents,
    p_balance_type: 'available',
    p_description: `Commission received from child org ${childOrgId}`,
    p_metadata: metadata,
    p_payment_id: paymentId,
  });

  if (creditErr) throw new Error(`Commission credit failed: ${creditErr.message}`);

  return {
    debitEntryId: debitId as string,
    creditEntryId: creditId as string,
  };
}
