import { supabase } from '@/integrations/supabase/client';

export interface Subaccount {
  id: string;
  tenant_id: string;
  parent_org_id: string | null;
  tier: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  kyc_status: string;
  created_at: string;
}

export interface CreateSubaccountInput {
  parentOrgId: string;
  tenantId: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
}

/**
 * Create a new subaccount (child org) under a whitelabel parent.
 * Created with tier = 'cliente' and active = false until KYC is approved.
 */
export async function createSubaccount(input: CreateSubaccountInput): Promise<Subaccount> {
  const { data, error } = await supabase
    .from('pzaafi_organizations')
    .insert({
      tenant_id: input.tenantId,
      parent_org_id: input.parentOrgId,
      tier: 'cliente',
      name: input.name,
      document: input.document ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      active: false,
      kyc_status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create subaccount: ${error.message}`);
  return data as Subaccount;
}

/**
 * List all subaccounts belonging to a parent organization.
 */
export async function listSubaccounts(parentOrgId: string): Promise<Subaccount[]> {
  const { data, error } = await supabase
    .from('pzaafi_organizations')
    .select('*')
    .eq('parent_org_id', parentOrgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list subaccounts: ${error.message}`);
  return (data ?? []) as Subaccount[];
}

/**
 * Activate a subaccount. Requires KYC to be approved.
 */
export async function activateSubaccount(orgId: string): Promise<Subaccount> {
  // 1. Check KYC status
  const { data: org, error: fetchErr } = await supabase
    .from('pzaafi_organizations')
    .select('id, kyc_status, active')
    .eq('id', orgId)
    .single();

  if (fetchErr || !org) throw new Error('Subaccount not found');
  if (org.kyc_status !== 'approved') {
    throw new Error(`Cannot activate: KYC status is "${org.kyc_status}", must be "approved"`);
  }
  if (org.active) {
    throw new Error('Subaccount is already active');
  }

  // 2. Activate
  const { data, error } = await supabase
    .from('pzaafi_organizations')
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq('id', orgId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to activate subaccount: ${error.message}`);
  return data as Subaccount;
}
