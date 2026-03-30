import { supabase } from '@/integrations/supabase/client';

export interface KYCRecord {
  id: string;
  org_id: string;
  provider: string;
  document_type: string;
  document_number: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  external_id: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InitiateKYCInput {
  orgId: string;
  documentType: string;
  documentNumber: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Initiate KYC verification for an organization.
 * If a provider is configured and available, calls external API.
 * Falls back to manual review (status = 'pending').
 */
export async function initiateKYC(input: InitiateKYCInput): Promise<KYCRecord> {
  const provider = input.provider ?? 'manual';
  let status: string = 'pending';
  let externalId: string | null = null;

  // Attempt external KYC provider call if not manual
  if (provider !== 'manual') {
    try {
      const result = await callExternalKYCProvider(provider, input);
      status = 'under_review';
      externalId = result.externalId;
    } catch {
      // Fall back to manual review if external provider fails
      console.warn(`[KYC] External provider "${provider}" failed, falling back to manual`);
    }
  }

  const { data, error } = await supabase
    .from('pzaafi_kyc_records')
    .insert({
      org_id: input.orgId,
      provider,
      document_type: input.documentType,
      document_number: input.documentNumber,
      status,
      external_id: externalId,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create KYC record: ${error.message}`);
  return data as KYCRecord;
}

/**
 * Stub for calling external KYC providers.
 * In production, this would integrate with providers like Serpro, BigData, etc.
 */
async function callExternalKYCProvider(
  _provider: string,
  _input: InitiateKYCInput
): Promise<{ externalId: string }> {
  // TODO: Implement actual provider integrations
  throw new Error('No external KYC provider configured');
}
