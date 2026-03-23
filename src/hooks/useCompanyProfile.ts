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
    const { error } = await supabase
      .from('company_profile')
      .upsert({
        tenant_id: tenantId!,
        ...data,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'tenant_id' });
    if (error) throw error;
    invalidate();
  }, [invalidate]);

  return { profile, isLoading, upsertProfile, invalidate };
}
