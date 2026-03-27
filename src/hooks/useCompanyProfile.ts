import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyProfile {
  id: string;
  tenant_id: string;
  company_name: string | null;
  segment: string | null;
  sub_segment: string | null;
  main_product: string | null;
  value_proposition: string | null;
  avg_ticket_min: number | null;
  avg_ticket_max: number | null;
  currency: string;
  avg_sales_cycle_days: number | null;
  billing_type: string | null;
  ideal_client_size: string | null;
  decision_maker: string | null;
  client_pain: string | null;
  best_clients_desc: string | null;
  disqualifiers: any[];
  wizard_completed: boolean;
  wizard_step: number;
  cnpj: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  employee_count: string | null;
}

export function useCompanyProfile(tenantId?: string) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company_profile', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_profile')
        .select('*')
        .eq('tenant_id', tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as CompanyProfile | null;
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['company_profile'] });
  }, [queryClient]);

  const upsertProfile = useCallback(async (data: Partial<CompanyProfile>) => {
    const payload = { tenant_id: tenantId!, ...data, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from('company_profile')
      .upsert(payload as any, { onConflict: 'tenant_id' });
    if (error) {
      // Fallback: if extra columns don't exist yet, retry with core fields only
      const coreFields = ['tenant_id', 'company_name', 'segment', 'sub_segment', 'main_product',
        'value_proposition', 'avg_ticket_min', 'avg_ticket_max', 'currency', 'avg_sales_cycle_days',
        'billing_type', 'ideal_client_size', 'decision_maker', 'client_pain', 'best_clients_desc',
        'disqualifiers', 'wizard_completed', 'wizard_step', 'updated_at'];
      const fallback: Record<string, any> = {};
      for (const k of coreFields) {
        if (k in payload) fallback[k] = (payload as any)[k];
      }
      const { error: fallbackError } = await supabase
        .from('company_profile')
        .upsert(fallback as any, { onConflict: 'tenant_id' });
      if (fallbackError) throw fallbackError;
    }
    invalidate();
  }, [tenantId, invalidate]);

  return { profile, isLoading, upsertProfile, invalidate };
}
